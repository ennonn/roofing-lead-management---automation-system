import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import pg from "pg";
import request from "supertest";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { setDb } from "../src/db/index.js";
import * as schema from "../src/db/schema.js";
import { processOutboxBatch } from "../src/modules/outbox/outbox.worker.js";

const { Pool } = pg;
const PgSession = connectPgSimple(session);

const LIVE_DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://roofing_user:test_db_password_123@localhost:54329/roofing_leads";

let isLiveDbAvailable = false;
try {
  const probeClient = new pg.Client({
    connectionString: LIVE_DB_URL,
    connectionTimeoutMillis: 1500,
  });
  await probeClient.connect();
  await probeClient.query("SELECT 1;");
  await probeClient.end();
  isLiveDbAvailable = true;
} catch {
  isLiveDbAvailable = false;
}

describe.skipIf(!isLiveDbAvailable)("Live PostgreSQL Integration & Staging Verification", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let pgStore: session.Store;
  let app: any;

  beforeAll(async () => {
    pool = new Pool({ connectionString: LIVE_DB_URL });
    db = drizzle(pool, { schema });
    setDb(db as any);

    pgStore = new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: false,
    });

    app = createApp({
      sessionStore: pgStore,
      authRouterOptions: {
        rateLimiter: (_req, _res, next) => next(),
      },
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  // ============================================================================
  // 1. Live PostgreSQL Health, Relations & Migrations Check
  // ============================================================================
  describe("1. Live PostgreSQL Health & Schema Integrity", () => {
    it("connects to live PostgreSQL and verifies active relations", async () => {
      const res = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
      );
      const tableNames = res.rows.map((r) => r.table_name);

      expect(tableNames).toContain("business_settings");
      expect(tableNames).toContain("lead_notes");
      expect(tableNames).toContain("leads");
      expect(tableNames).toContain("n8n_processed_events");
      expect(tableNames).toContain("outbox_events");
      expect(tableNames).toContain("sessions");
      expect(tableNames).toContain("users");
    });

    it("verifies n8n atomic stored functions exist in PostgreSQL", async () => {
      const res = await pool.query(
        `SELECT proname FROM pg_proc WHERE proname IN ('acquire_n8n_lead_claim', 'verify_and_renew_n8n_claim');`
      );
      const funcNames = res.rows.map((r) => r.proname);

      expect(funcNames).toContain("acquire_n8n_lead_claim");
      expect(funcNames).toContain("verify_and_renew_n8n_claim");
    });
  });

  // ============================================================================
  // 2. PostgreSQL ILIKE Search Escaping for %, _, and \
  // ============================================================================
  describe("2. PostgreSQL ILIKE Wildcard Escaping Verification", () => {
    const testIds: string[] = [];

    beforeAll(async () => {
      // Insert test rows with literal wildcards
      const rows = await db
        .insert(schema.leads)
        .values([
          {
            customerName: "100% Guaranteed Roofing",
            phone: "(555) 001-1001",
            email: "guaranteed100@example.com",
            serviceType: "Roof Replacement",
            propertyLocation: "100 Percent Way, Dallas, TX",
          },
          {
            customerName: "1000 Guaranteed Roofing",
            phone: "(555) 001-1002",
            email: "guaranteed1000@example.com",
            serviceType: "Roof Replacement",
            propertyLocation: "1000 Percent Way, Dallas, TX",
          },
          {
            customerName: "Special_Roof_Contractor",
            phone: "(555) 001-1003",
            email: "special_roof@example.com",
            serviceType: "Commercial Roofing",
            propertyLocation: "Underscore Blvd, Dallas, TX",
          },
          {
            customerName: "SpecialARoofBContractor",
            phone: "(555) 001-1004",
            email: "special_a_roof@example.com",
            serviceType: "Commercial Roofing",
            propertyLocation: "NoUnderscore Blvd, Dallas, TX",
          },
          {
            customerName: "Backslash\\Shingles",
            phone: "(555) 001-1005",
            email: "backslash@example.com",
            serviceType: "Roof Repair",
            propertyLocation: "Backslash Dr, Dallas, TX",
          },
        ])
        .returning({ id: schema.leads.id });

      testIds.push(...rows.map((r) => r.id));
    });

    afterAll(async () => {
      if (testIds.length > 0) {
        await pool.query(
          `DELETE FROM leads WHERE id = ANY($1::uuid[])`,
          [testIds]
        );
      }
    });

    it("verifies literal % is escaped and does not act as wildcard", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@apexroofing.com",
          password: "ValidStrongPassword123!",
        });

      const res = await agent.get("/api/v1/leads?search=100%");
      expect(res.status).toBe(200);
      const names = res.body.data.leads.map((l: any) => l.customerName);

      expect(names).toContain("100% Guaranteed Roofing");
      expect(names).not.toContain("1000 Guaranteed Roofing");
    });

    it("verifies literal _ is escaped and does not match arbitrary characters", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@apexroofing.com",
          password: "ValidStrongPassword123!",
        });

      const res = await agent.get("/api/v1/leads?search=Special_Roof");
      expect(res.status).toBe(200);
      const names = res.body.data.leads.map((l: any) => l.customerName);

      expect(names).toContain("Special_Roof_Contractor");
      expect(names).not.toContain("SpecialARoofBContractor");
    });

    it("verifies literal backslash \\ search against PostgreSQL", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@apexroofing.com",
          password: "ValidStrongPassword123!",
        });

      const res = await agent.get("/api/v1/leads?search=Backslash\\");
      expect(res.status).toBe(200);
      const names = res.body.data.leads.map((l: any) => l.customerName);

      expect(names).toContain("Backslash\\Shingles");
    });
  });

  // ============================================================================
  // 3. Live PostgreSQL Session Storage & Lifecycle (connect-pg-simple)
  // ============================================================================
  describe("3. Live PostgreSQL Session Storage & Lifecycle", () => {
    beforeEach(async () => {
      await pool.query("DELETE FROM sessions;");
    });

    it("persists session in PostgreSQL sessions table upon login and removes on logout", async () => {
      const agent = request.agent(app);

      // 1. Initial login
      const loginRes = await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@apexroofing.com",
          password: "ValidStrongPassword123!",
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.email).toBe("owner@apexroofing.com");

      // Verify session exists in PostgreSQL
      const sessionQuery = await pool.query(`SELECT sid, sess, expire FROM sessions;`);
      expect(sessionQuery.rows.length).toBeGreaterThanOrEqual(1);

      const activeSession = sessionQuery.rows.find((r) =>
        r.sess?.user?.email === "owner@apexroofing.com"
      );
      expect(activeSession).toBeDefined();
      expect(activeSession.expire).toBeInstanceOf(Date);

      // Verify authenticated session endpoint
      const meRes = await agent.get("/api/v1/auth/session");
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe("owner@apexroofing.com");

      // Logout and verify removal from PostgreSQL
      const logoutRes = await agent
        .post("/api/v1/auth/logout")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest");

      expect(logoutRes.status).toBe(200);

      // Give connect-pg-simple a tick to delete session
      await new Promise((r) => setTimeout(r, 100));

      const afterLogoutQuery = await pool.query(
        `SELECT sid FROM sessions WHERE sid = $1;`,
        [activeSession.sid]
      );
      expect(afterLogoutQuery.rows).toHaveLength(0);
    });
  });

  // ============================================================================
  // 4. End-to-End Lead Lifecycle & Outbox Transaction
  // ============================================================================
  describe("4. End-to-End Lead Lifecycle with Live Database", () => {
    let createdLeadId: string;
    const uniqueSuffix = Date.now().toString().slice(-6);
    const testCustomerName = `Marcus Fenix ${uniqueSuffix}`;

    it("creates lead and outbox event in single ACID transaction", async () => {
      const quotePayload = {
        customerName: testCustomerName,
        phone: "(555) 300-4000",
        email: `marcus.${uniqueSuffix}@example.com`,
        serviceType: "Roof Replacement",
        propertyLocation: "77 Jacinto Plateau, Dallas, TX 75201",
        projectDescription: "Tile roof damaged by severe hail storm.",
        preferredContactMethod: "phone",
      };

      const res = await request(app)
        .post("/api/v1/leads")
        .send(quotePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadId).toBeDefined();
      createdLeadId = res.body.data.leadId;

      // Verify lead in PostgreSQL
      const [leadRow] = await db
        .select()
        .from(schema.leads)
        .where(eq(schema.leads.id, createdLeadId));

      expect(leadRow).toBeDefined();
      expect(leadRow.customerName).toBe(testCustomerName);
      expect(leadRow.status).toBe("new");
      expect(leadRow.automationStatus).toBe("pending");

      // Verify outbox_events in PostgreSQL
      const [outboxRow] = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.aggregateId, createdLeadId));

      expect(outboxRow).toBeDefined();
      expect(outboxRow.eventType).toBe("lead.created");
      expect(outboxRow.status).toBe("pending");
      expect(outboxRow.payload).toHaveProperty("leadId", createdLeadId);
    });

    it("allows authenticated owner to list, view, update status, and add notes to lead", async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@apexroofing.com",
          password: "ValidStrongPassword123!",
        });

      // 1. List leads
      const listRes = await agent.get(`/api/v1/leads?search=${encodeURIComponent(testCustomerName)}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.leads).toHaveLength(1);
      expect(listRes.body.data.leads[0].id).toBe(createdLeadId);

      // 2. Get lead details with notes
      const detailRes = await agent.get(`/api/v1/leads/${createdLeadId}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.customerName).toBe(testCustomerName);
      expect(detailRes.body.data.notes).toHaveLength(0);

      // 3. Update status to 'contacted'
      const statusRes = await agent
        .patch(`/api/v1/leads/${createdLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "contacted" });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe("contacted");

      // Verify in PostgreSQL
      const [updatedLead] = await db
        .select()
        .from(schema.leads)
        .where(eq(schema.leads.id, createdLeadId));
      expect(updatedLead.status).toBe("contacted");

      // 4. Add follow-up note
      const noteRes = await agent
        .post(`/api/v1/leads/${createdLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ noteText: "Called homeowner. Inspection booked for Friday morning." });

      expect(noteRes.status).toBe(201);
      expect(noteRes.body.data.authorName).toBe("Apex Business Owner");

      // 5. Reload lead detail and verify note persistence
      const detailWithNotesRes = await agent.get(`/api/v1/leads/${createdLeadId}`);
      expect(detailWithNotesRes.status).toBe(200);
      expect(detailWithNotesRes.body.data.notes).toHaveLength(1);
      expect(detailWithNotesRes.body.data.notes[0].noteText).toBe(
        "Called homeowner. Inspection booked for Friday morning."
      );
      expect(detailWithNotesRes.body.data.notes[0].authorName).toBe("Apex Business Owner");
    });
  });

  // ============================================================================
  // 5. n8n Stored Functions & Concurrency Claims against PostgreSQL
  // ============================================================================
  describe("5. n8n Atomic Claim Functions in PostgreSQL", () => {
    const testIdempotencyKey = "99999999-9999-9999-9999-999999999999";
    const testLeadId = "88888888-8888-8888-8888-888888888888";

    beforeAll(async () => {
      // Create referenced lead row for foreign key
      await db.insert(schema.leads).values({
        id: testLeadId,
        customerName: "n8n Concurrency Test Lead",
        phone: "(555) 999-0000",
        serviceType: "Roof Inspection",
        propertyLocation: "Test Location",
      });
    });

    afterAll(async () => {
      await pool.query(`DELETE FROM n8n_processed_events WHERE idempotency_key = $1`, [
        testIdempotencyKey,
      ]);
      await pool.query(`DELETE FROM leads WHERE id = $1`, [testLeadId]);
    });

    it("acquires initial claim and prevents concurrent double-processing", async () => {
      // 1. Initial claim acquisition
      const firstRes = await pool.query(
        `SELECT * FROM acquire_n8n_lead_claim($1::uuid, $2::uuid, interval '5 minutes');`,
        [testIdempotencyKey, testLeadId]
      );

      expect(firstRes.rows[0].claim_status).toBe("CLAIM_ACQUIRED");
      expect(firstRes.rows[0].claim_version).toBe(1);

      // 2. Concurrent second claim during active lease
      const secondRes = await pool.query(
        `SELECT * FROM acquire_n8n_lead_claim($1::uuid, $2::uuid, interval '5 minutes');`,
        [testIdempotencyKey, testLeadId]
      );

      // Active lease returns processing status (leading to HTTP 409 in workflow)
      expect(secondRes.rows[0].status).toBe("processing");
      expect(secondRes.rows[0].claim_version).toBe(1);

      // 3. Lease renewal via verify_and_renew_n8n_claim
      const renewRes = await pool.query(
        `SELECT * FROM verify_and_renew_n8n_claim($1::uuid, 1, interval '5 minutes');`,
        [testIdempotencyKey]
      );
      expect(renewRes.rows[0].is_valid).toBe(true);

      // 4. Crash recovery: lease expires
      await pool.query(
        `UPDATE n8n_processed_events SET lease_expires_at = now() - interval '1 second' WHERE idempotency_key = $1;`,
        [testIdempotencyKey]
      );

      // Next delivery reclaims with incremented version
      const reclaimRes = await pool.query(
        `SELECT * FROM acquire_n8n_lead_claim($1::uuid, $2::uuid, interval '5 minutes');`,
        [testIdempotencyKey, testLeadId]
      );
      expect(reclaimRes.rows[0].claim_status).toBe("CLAIM_ACQUIRED");
      expect(reclaimRes.rows[0].claim_version).toBe(2);

      // 5. Mark as completed
      await pool.query(
        `UPDATE n8n_processed_events SET status = 'completed', customer_notified = true, staff_notified = true WHERE idempotency_key = $1;`,
        [testIdempotencyKey]
      );

      const completedRes = await pool.query(
        `SELECT * FROM acquire_n8n_lead_claim($1::uuid, $2::uuid, interval '5 minutes');`,
        [testIdempotencyKey, testLeadId]
      );
      expect(completedRes.rows[0].claim_status).toBe("ALREADY_COMPLETED");
    });
  });

  // ============================================================================
  // 6. Outbox Worker Failure & Retry with Live PostgreSQL
  // ============================================================================
  describe("6. Outbox Worker Live Failure Resilience", () => {
    it("handles unavailable n8n endpoint gracefully without dropping lead data", async () => {
      // 1. Submit a lead with an outbox event
      const res = await request(app)
        .post("/api/v1/leads")
        .send({
          customerName: "Outbox Retry Homeowner",
          phone: "(555) 444-5555",
          email: "retry.test@example.com",
          serviceType: "Roof Repair",
          propertyLocation: "123 Retry Way, Dallas, TX",
        });

      const leadId = res.body.data.leadId;

      // 2. Mock failing fetch (simulating n8n service offline / connection refused)
      const failingFetch = vi
        .fn()
        .mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:59999"));

      // 3. Process events using processOutboxBatch against live PostgreSQL
      const summary = await processOutboxBatch(10, db as any, failingFetch as any);
      expect(summary.processed).toBeGreaterThanOrEqual(1);
      expect(summary.retried).toBeGreaterThanOrEqual(1);

      // 4. Verify in PostgreSQL: event remains pending, retry count incremented
      const [outboxRow] = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.aggregateId, leadId));

      expect(outboxRow.status).toBe("pending");
      expect(outboxRow.retryCount).toBe(1);
      expect(outboxRow.lastError).toBeDefined();
      expect(new Date(outboxRow.nextRetryAt).getTime()).toBeGreaterThan(Date.now());

      // Lead in leads table is untouched and preserved
      const [leadRow] = await db
        .select()
        .from(schema.leads)
        .where(eq(schema.leads.id, leadId));
      expect(leadRow.customerName).toBe("Outbox Retry Homeowner");
      expect(leadRow.status).toBe("new");
      expect(leadRow.automationStatus).toBe("pending");
    });
  });
});
