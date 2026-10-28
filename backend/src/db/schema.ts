import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  json,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("staff"), // 'owner' | 'admin' | 'staff'
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    roleIdx: index("idx_users_role").on(table.role),
  })
);

// 2. Sessions (connect-pg-simple)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { withTimezone: true }).notNull(),
  },
  (table) => ({
    expireIdx: index("idx_sessions_expire").on(table.expire),
  })
);

// 3. Business Settings
export const businessSettings = pgTable("business_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 200 }).notNull().default("Roofing Company"),
  phone: varchar("phone", { length: 50 }).notNull().default(""),
  emergencyPhone: varchar("emergency_phone", { length: 50 }),
  dispatchEmail: varchar("dispatch_email", { length: 255 }).notNull().default(""),
  address: text("address"),
  serviceAreas: jsonb("service_areas").notNull().default([]),
  businessHours: jsonb("business_hours").notNull().default({}),
  licenseNumber: varchar("license_number", { length: 100 }),
  availabilityStatus: varchar("availability_status", { length: 30 }).notNull().default("available"),
  noticeHeadline: varchar("notice_headline", { length: 150 }),
  noticeBody: text("notice_body"),
  reopenAt: timestamp("reopen_at", { withTimezone: true }),
  autoResume: boolean("auto_resume").notNull().default(false),
  acceptQuotesWhenUnavailable: boolean("accept_quotes_when_unavailable").notNull().default(false),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. Leads
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: varchar("customer_name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }),
    serviceType: varchar("service_type", { length: 100 }).notNull(),
    propertyLocation: varchar("property_location", { length: 255 }).notNull(),
    projectDescription: text("project_description"),
    preferredContactMethod: varchar("preferred_contact_method", { length: 20 })
      .notNull()
      .default("phone"),
    leadSource: varchar("lead_source", { length: 50 }).notNull().default("website_form"),
    status: varchar("status", { length: 30 }).notNull().default("new"), // 'new' | 'contacted' | 'estimate_scheduled' | 'won' | 'lost'
    automationStatus: varchar("automation_status", { length: 20 })
      .notNull()
      .default("pending"), // 'pending' | 'delivered' | 'failed'
    submissionDate: timestamp("submission_date", { withTimezone: true }).notNull().defaultNow(),
    lastStatusUpdate: timestamp("last_status_update", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_leads_status").on(table.status),
    submissionDateIdx: index("idx_leads_submission_date").on(table.submissionDate),
    automationStatusIdx: index("idx_leads_automation_status").on(table.automationStatus),
  })
);

// 5. Lead Notes
export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    noteText: text("note_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("idx_lead_notes_lead_id").on(table.leadId, table.createdAt),
  })
);

// 6. Outbox Events (Transactional Outbox)
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateType: varchar("aggregate_type", { length: 50 }).notNull().default("lead"),
    aggregateId: uuid("aggregate_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 50 }).notNull().default("lead.created"),
    payload: jsonb("payload").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'processing' | 'delivered' | 'failed'
    idempotencyKey: uuid("idempotency_key").notNull().defaultRandom().unique(),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(5),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dispatchIdx: index("idx_outbox_events_dispatch").on(table.status, table.nextRetryAt),
  })
);

// 7. n8n Processed Events (Workflow Idempotency, Concurrency Locking & Partial-Failure Tracking)
export const n8nProcessedEvents = pgTable(
  "n8n_processed_events",
  {
    idempotencyKey: uuid("idempotency_key").primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 50 }).notNull().default("lead.created"),
    status: varchar("status", { length: 20 }).notNull().default("processing"), // 'processing' | 'completed' | 'failed'
    customerNotified: boolean("customer_notified").notNull().default(false),
    staffNotified: boolean("staff_notified").notNull().default(false),
    claimVersion: integer("claim_version").notNull().default(1),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdx: index("idx_n8n_processed_events_lead").on(table.leadId),
    statusIdx: index("idx_n8n_processed_events_status").on(table.status),
    leaseIdx: index("idx_n8n_processed_events_lease").on(table.status, table.leaseExpiresAt),
  })
);

// Relations
export const leadsRelations = relations(leads, ({ many }) => ({
  notes: many(leadNotes),
  outboxEvents: many(outboxEvents),
  n8nEvents: many(n8nProcessedEvents),
}));

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, { fields: [leadNotes.leadId], references: [leads.id] }),
  author: one(users, { fields: [leadNotes.authorId], references: [users.id] }),
}));

export const outboxEventsRelations = relations(outboxEvents, ({ one }) => ({
  lead: one(leads, { fields: [outboxEvents.aggregateId], references: [leads.id] }),
}));

export const n8nProcessedEventsRelations = relations(n8nProcessedEvents, ({ one }) => ({
  lead: one(leads, { fields: [n8nProcessedEvents.leadId], references: [leads.id] }),
}));
