import { randomUUID } from "node:crypto";
import { eq, and, or, ilike, asc, desc, sql } from "drizzle-orm";
import { getDb, AppDatabase } from "../../db/index.js";
import { leads, leadNotes, users, outboxEvents, businessSettings } from "../../db/schema.js";
import { env } from "../../config/env.js";
import { QuoteIntakePausedError } from "../../middleware/error.middleware.js";
import { checkQuoteIntakeAllowed } from "../business/business.service.js";
import type {
  Lead,
  LeadListItem,
  LeadWithNotes,
  LeadNote,
  LeadStatus,
  LeadListResponse,
} from "@roofing/shared-types";
import type {
  CreateLeadInput,
  ListLeadsQueryInput,
} from "./leads.schema.js";

export interface CreateLeadResult {
  leadId: string;
  status: string;
  submissionDate: Date;
  isSpamSuppressed?: boolean;
}

export class LeadsService {
  constructor(private getDatabase: () => AppDatabase = getDb) {}

  private get db(): AppDatabase {
    return this.getDatabase();
  }

  /**
   * Creates a new public lead inquiry with transactional outbox event.
   */
  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    // 1. Honeypot check: automated bot protection
    if (input._hp && input._hp.trim().length > 0) {
      console.warn("[Spam Protection] Honeypot field filled. Suppressing submission silently.");
      return {
        leadId: randomUUID(),
        status: "new",
        submissionDate: new Date(),
        isSpamSuppressed: true,
      };
    }

    // 2. Availability check: verify whether quote intake is currently permitted
    const intakeCheck = await checkQuoteIntakeAllowed(this.db);
    if (!intakeCheck.allowed) {
      throw new QuoteIntakePausedError(intakeCheck.reason);
    }

    // 3. Transactional Outbox Pattern: Atomic commit of lead and outbox event
    return await this.db.transaction(async (tx) => {
      // Retrieve dynamic company branding / dispatch email from business settings if present
      const [settings] = await tx.select().from(businessSettings).limit(1);
      const companyName = settings?.companyName || env.COMPANY_NAME;
      const dispatchEmail = settings?.dispatchEmail || env.COMPANY_DISPATCH_EMAIL || env.INITIAL_OWNER_EMAIL;

      const [savedLead] = await tx
        .insert(leads)
        .values({
          customerName: input.customerName,
          phone: input.phone,
          email: input.email,
          serviceType: input.serviceType,
          propertyLocation: input.propertyLocation,
          projectDescription: input.projectDescription || null,
          preferredContactMethod: input.preferredContactMethod,
          leadSource: input.leadSource,
          status: "new",
          automationStatus: "pending",
        })
        .returning();

      const idempotencyKey = randomUUID();
      const eventPayload = {
        leadId: savedLead.id,
        customerName: savedLead.customerName,
        phone: savedLead.phone,
        email: savedLead.email,
        serviceType: savedLead.serviceType,
        propertyLocation: savedLead.propertyLocation,
        projectDescription: savedLead.projectDescription,
        preferredContactMethod: savedLead.preferredContactMethod,
        leadSource: savedLead.leadSource,
        submissionDate: savedLead.submissionDate.toISOString(),
        companyName,
        dispatchEmail,
        staffNotificationEmail: process.env.STAFF_NOTIFICATION_EMAIL || env.INITIAL_OWNER_EMAIL,
      };

      await tx.insert(outboxEvents).values({
        aggregateType: "lead",
        aggregateId: savedLead.id,
        eventType: "lead.created",
        payload: eventPayload,
        idempotencyKey,
        status: "pending",
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: new Date(),
      });

      return {
        leadId: savedLead.id,
        status: savedLead.status,
        submissionDate: savedLead.submissionDate,
      };
    });
  }

  /**
   * Retrieves a paginated, filterable, searchable list of leads.
   * Utilizes safe SQL parameterization, server-side pagination, and deterministic tie-breaking.
   */
  async listLeads(query: ListLeadsQueryInput): Promise<LeadListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereConditions = [];

    // Filter by lead status
    if (query.status) {
      whereConditions.push(eq(leads.status, query.status));
    }

    // Case-insensitive parameterized search across customer contact fields
    if (query.search && query.search.trim().length > 0) {
      const sanitized = query.search.trim().replace(/[%_\\]/g, "\\$&");
      const pattern = `%${sanitized}%`;
      const searchCondition = or(
        ilike(leads.customerName, pattern),
        ilike(leads.phone, pattern),
        ilike(leads.email, pattern),
        ilike(leads.propertyLocation, pattern)
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // 1. Efficient total count query
    const [countResult] = await this.db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(leads)
      .where(whereClause);

    const total = countResult?.total ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    // 2. Safe sort column mapping allowlist
    const sortColumnMap = {
      submissionDate: leads.submissionDate,
      createdAt: leads.createdAt,
      customerName: leads.customerName,
      status: leads.status,
      lastStatusUpdate: leads.lastStatusUpdate,
    } as const;

    const sortColumn = sortColumnMap[query.sortBy] ?? leads.submissionDate;
    const primaryOrder = query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
    // Deterministic tie-breaker for stable pagination ordering
    const secondaryOrder = asc(leads.id);

    // 3. Correlated scalar subquery for notesCount without row multiplication
    const notesCountSubquery = sql<number>`(
      SELECT cast(count(*) as integer)
      FROM ${leadNotes}
      WHERE ${leadNotes.leadId} = ${leads.id}
    )`;

    const rows = await this.db
      .select({
        id: leads.id,
        customerName: leads.customerName,
        phone: leads.phone,
        email: leads.email,
        serviceType: leads.serviceType,
        propertyLocation: leads.propertyLocation,
        status: leads.status,
        submissionDate: leads.submissionDate,
        lastStatusUpdate: leads.lastStatusUpdate,
        createdAt: leads.createdAt,
        notesCount: notesCountSubquery,
      })
      .from(leads)
      .where(whereClause)
      .orderBy(primaryOrder, secondaryOrder)
      .limit(limit)
      .offset(offset);

    const formattedLeads: LeadListItem[] = rows.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      phone: r.phone,
      email: r.email,
      serviceType: r.serviceType,
      propertyLocation: r.propertyLocation,
      status: r.status as LeadStatus,
      submissionDate: r.submissionDate.toISOString(),
      lastStatusUpdate: r.lastStatusUpdate.toISOString(),
      notesCount: Number(r.notesCount) || 0,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      leads: formattedLeads,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single lead by its UUID, including chronological follow-up notes.
   */
  async getLeadById(id: string): Promise<LeadWithNotes | null> {
    const [leadRow] = await this.db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!leadRow) {
      return null;
    }

    const noteRows = await this.db
      .select({
        id: leadNotes.id,
        leadId: leadNotes.leadId,
        authorId: leadNotes.authorId,
        authorName: users.fullName,
        noteText: leadNotes.noteText,
        createdAt: leadNotes.createdAt,
      })
      .from(leadNotes)
      .leftJoin(users, eq(leadNotes.authorId, users.id))
      .where(eq(leadNotes.leadId, id))
      .orderBy(asc(leadNotes.createdAt));

    const notes: LeadNote[] = noteRows.map((n) => ({
      id: n.id,
      leadId: n.leadId,
      authorId: n.authorId,
      authorName: n.authorName ?? undefined,
      noteText: n.noteText,
      createdAt: n.createdAt.toISOString(),
    }));

    return {
      id: leadRow.id,
      customerName: leadRow.customerName,
      phone: leadRow.phone,
      email: leadRow.email,
      serviceType: leadRow.serviceType,
      propertyLocation: leadRow.propertyLocation,
      projectDescription: leadRow.projectDescription,
      preferredContactMethod: leadRow.preferredContactMethod as any,
      leadSource: leadRow.leadSource,
      status: leadRow.status as LeadStatus,
      automationStatus: leadRow.automationStatus as any,
      submissionDate: leadRow.submissionDate.toISOString(),
      lastStatusUpdate: leadRow.lastStatusUpdate.toISOString(),
      createdAt: leadRow.createdAt.toISOString(),
      updatedAt: leadRow.updatedAt.toISOString(),
      notes,
    };
  }

  /**
   * Updates a lead's status, ensuring lastStatusUpdate and updatedAt are updated.
   */
  async updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    const [existing] = await this.db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!existing) {
      return null;
    }

    const now = new Date();
    const [updatedRow] = await this.db
      .update(leads)
      .set({
        status,
        lastStatusUpdate: now,
        updatedAt: now,
      })
      .where(eq(leads.id, id))
      .returning();

    return {
      id: updatedRow.id,
      customerName: updatedRow.customerName,
      phone: updatedRow.phone,
      email: updatedRow.email,
      serviceType: updatedRow.serviceType,
      propertyLocation: updatedRow.propertyLocation,
      projectDescription: updatedRow.projectDescription,
      preferredContactMethod: updatedRow.preferredContactMethod as any,
      leadSource: updatedRow.leadSource,
      status: updatedRow.status as LeadStatus,
      automationStatus: updatedRow.automationStatus as any,
      submissionDate: updatedRow.submissionDate.toISOString(),
      lastStatusUpdate: updatedRow.lastStatusUpdate.toISOString(),
      createdAt: updatedRow.createdAt.toISOString(),
      updatedAt: updatedRow.updatedAt.toISOString(),
    };
  }

  /**
   * Adds a timestamped follow-up note associated with a lead and the authenticated author.
   */
  async addLeadNote(
    id: string,
    authorId: string | null,
    noteText: string
  ): Promise<LeadNote | null> {
    const [lead] = await this.db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!lead) {
      return null;
    }

    const [noteRow] = await this.db
      .insert(leadNotes)
      .values({
        leadId: id,
        authorId,
        noteText: noteText.trim(),
      })
      .returning();

    let authorName: string | undefined;
    if (authorId) {
      const [author] = await this.db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, authorId))
        .limit(1);
      authorName = author?.fullName;
    }

    return {
      id: noteRow.id,
      leadId: noteRow.leadId,
      authorId: noteRow.authorId,
      authorName,
      noteText: noteRow.noteText,
      createdAt: noteRow.createdAt.toISOString(),
    };
  }
}

// Global default service instance
export const leadsService = new LeadsService();

// Standalone function exports for backward compatibility
export async function createLead(
  input: CreateLeadInput,
  db?: AppDatabase
): Promise<CreateLeadResult> {
  const service = db ? new LeadsService(() => db) : leadsService;
  return service.createLead(input);
}

export async function listLeads(
  query: ListLeadsQueryInput,
  db?: AppDatabase
): Promise<LeadListResponse> {
  const service = db ? new LeadsService(() => db) : leadsService;
  return service.listLeads(query);
}

export async function getLeadById(
  id: string,
  db?: AppDatabase
): Promise<LeadWithNotes | null> {
  const service = db ? new LeadsService(() => db) : leadsService;
  return service.getLeadById(id);
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  db?: AppDatabase
): Promise<Lead | null> {
  const service = db ? new LeadsService(() => db) : leadsService;
  return service.updateLeadStatus(id, status);
}

export async function addLeadNote(
  id: string,
  authorId: string | null,
  noteText: string,
  db?: AppDatabase
): Promise<LeadNote | null> {
  const service = db ? new LeadsService(() => db) : leadsService;
  return service.addLeadNote(id, authorId, noteText);
}
