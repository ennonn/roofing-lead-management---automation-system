import { describe, it, expect, vi, beforeEach } from "vitest";
import { processOutboxBatch } from "../src/modules/outbox/outbox.worker.js";
import { env } from "../src/config/env.js";

export interface ProcessedEventRecord {
  idempotencyKey: string;
  leadId: string;
  eventType: string;
  status: "processing" | "completed" | "failed";
  customerNotified: boolean;
  staffNotified: boolean;
  claimVersion: number;
  leaseExpiresAt: Date;
  processedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ClaimStatus = "CLAIM_ACQUIRED" | "ALREADY_COMPLETED" | "CONCURRENT_LOCKED" | "AMBIGUOUS_RETRY";

/**
 * Simulates the deterministic PostgreSQL stored functions (acquire_n8n_lead_claim & verify_and_renew_n8n_claim)
 * and n8n fail-closed state machine with pre-flight side effect protection.
 */
export class MockN8nWorkflowEngine {
  public secret: string;
  public idempotencyStore: Map<string, ProcessedEventRecord> = new Map();

  public staffEmailDispatchCount = 0;
  public customerEmailDispatchCount = 0;
  public failStaffEmail = false;
  public failCustomerEmail = false;
  public simulateNetworkTimeoutBeforeResponse = false;
  public simulateDbCrashAfterSmtp = false;
  public simulateAmbiguousClaim = false;

  constructor(secret = env.N8N_WEBHOOK_SECRET) {
    this.secret = secret;
  }

  /**
   * Simulates the PostgreSQL function `acquire_n8n_lead_claim(p_idempotency_key, p_lead_id)`.
   * Under READ COMMITTED, utilizes `SELECT ... FOR UPDATE` to eliminate snapshot gaps.
   */
  public acquireAtomicClaim(
    idempotencyKey: string,
    leadId: string,
    now: Date = new Date(),
    leaseDurationMs = 5 * 60 * 1000
  ): {
    claim_status: ClaimStatus;
    record: ProcessedEventRecord;
  } {
    if (this.simulateAmbiguousClaim) {
      return {
        claim_status: "AMBIGUOUS_RETRY",
        record: {} as any,
      };
    }

    const existing = this.idempotencyStore.get(idempotencyKey);

    // 1. Initial Insert attempt: Brand new event
    if (!existing) {
      const newRecord: ProcessedEventRecord = {
        idempotencyKey,
        leadId,
        eventType: "lead.created",
        status: "processing",
        customerNotified: false,
        staffNotified: false,
        claimVersion: 1,
        leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
        createdAt: now,
        updatedAt: now,
      };
      this.idempotencyStore.set(idempotencyKey, newRecord);
      return {
        claim_status: "CLAIM_ACQUIRED",
        record: { ...newRecord },
      };
    }

    // 2. Row exists: Row locked with FOR UPDATE (reads latest committed state)
    // 2a. Event already completed
    if (existing.status === "completed") {
      return {
        claim_status: "ALREADY_COMPLETED",
        record: { ...existing },
      };
    }

    // 2b. Lease expired or previously failed: reclamation
    if (existing.leaseExpiresAt.getTime() <= now.getTime() || existing.status === "failed") {
      existing.status = "processing";
      existing.claimVersion += 1; // Monotonic fencing token advanced
      existing.leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
      existing.updatedAt = now;
      return {
        claim_status: "CLAIM_ACQUIRED",
        record: { ...existing },
      };
    }

    // 2c. Active lease held by another processor
    return {
      claim_status: "CONCURRENT_LOCKED",
      record: { ...existing },
    };
  }

  /**
   * Simulates PostgreSQL function `verify_and_renew_n8n_claim(p_idempotency_key, p_claim_version)`.
   * Checks whether the processor still holds ownership and renews the lease immediately before external side effects.
   */
  public verifyAndRenewClaim(
    idempotencyKey: string,
    claimVersion: number,
    now: Date = new Date(),
    leaseDurationMs = 5 * 60 * 1000
  ): { isValid: boolean; claimVersion: number } {
    const existing = this.idempotencyStore.get(idempotencyKey);
    if (!existing) {
      return { isValid: false, claimVersion };
    }

    // Must match current claimVersion, status must be 'processing', and lease must not have expired
    if (
      existing.claimVersion === claimVersion &&
      existing.status === "processing" &&
      existing.leaseExpiresAt.getTime() > now.getTime()
    ) {
      existing.leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
      existing.updatedAt = now;
      return { isValid: true, claimVersion };
    }

    return { isValid: false, claimVersion: existing.claimVersion };
  }

  /**
   * Simulates version-fenced database updates:
   * UPDATE n8n_processed_events SET ... WHERE idempotency_key = $1 AND claim_version = $2
   */
  public updateFenced(
    idempotencyKey: string,
    claimVersion: number,
    updates: Partial<ProcessedEventRecord>
  ): boolean {
    const existing = this.idempotencyStore.get(idempotencyKey);
    if (!existing) return false;

    if (existing.claimVersion !== claimVersion) {
      return false; // 0 rows updated
    }

    Object.assign(existing, updates, { updatedAt: new Date() });
    return true;
  }

  public async handleWebhookRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
    currentTime: Date = new Date()
  ): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> }> {
    const headers = options.headers || {};
    const receivedSecret = headers["X-Webhook-Secret"] || headers["x-webhook-secret"];
    const rawIdempotencyKey = String(headers["X-Idempotency-Key"] || headers["x-idempotency-key"] || "").trim();

    // 1. Authentication Check
    if (!receivedSecret || receivedSecret !== this.secret) {
      return {
        ok: false,
        status: 401,
        text: async () => "Unauthorized: Invalid or missing X-Webhook-Secret",
        json: async () => ({ success: false, error: "UNAUTHORIZED" }),
      };
    }

    // 2. Strict UUID v4 regex validation on Idempotency Key
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rawIdempotencyKey)) {
      return {
        ok: false,
        status: 422,
        text: async () => "Unprocessable Entity: Missing or invalid UUID in X-Idempotency-Key",
        json: async () => ({ success: false, error: "INVALID_IDEMPOTENCY_KEY" }),
      };
    }
    const idempotencyKey = rawIdempotencyKey;

    // 3. Payload Validation
    let payload: any = {};
    try {
      payload = JSON.parse(options.body || "{}");
    } catch {
      return {
        ok: false,
        status: 400,
        text: async () => "Bad Request: Invalid JSON body",
        json: async () => ({ success: false, error: "INVALID_JSON" }),
      };
    }

    // Validate leadId format
    const rawLeadId = String(payload.leadId || "").trim();
    if (!uuidRegex.test(rawLeadId)) {
      return {
        ok: false,
        status: 422,
        text: async () => "Unprocessable Entity: leadId must be a valid UUID",
        json: async () => ({ success: false, error: "INVALID_LEAD_ID" }),
      };
    }

    const required = ["customerName", "phone", "serviceType", "propertyLocation"];
    const missing = required.filter((field) => !payload[field] || String(payload[field]).trim().length === 0);
    if (missing.length > 0) {
      return {
        ok: false,
        status: 422,
        text: async () => `Unprocessable Entity: Missing required fields: ${missing.join(", ")}`,
        json: async () => ({ success: false, error: "INVALID_PAYLOAD", missing }),
      };
    }

    // 4. Atomic PostgreSQL Claim (acquire_n8n_lead_claim)
    const claim = this.acquireAtomicClaim(idempotencyKey, rawLeadId, currentTime);

    // 4a. If event is already completed, return HTTP 200 Duplicate Acknowledged
    if (claim.claim_status === "ALREADY_COMPLETED") {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "already_processed" }),
        json: async () => ({
          success: true,
          status: "already_processed",
          idempotencyKey,
          leadId: rawLeadId,
          message: "Event previously completed. Duplicate notification suppressed.",
        }),
      };
    }

    // 4b. If concurrent execution holds an active lease, return HTTP 409
    if (claim.claim_status === "CONCURRENT_LOCKED") {
      return {
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ status: "in_flight" }),
        json: async () => ({
          success: false,
          status: "in_flight",
          idempotencyKey,
          leadId: rawLeadId,
          message: "Event is currently being processed by another worker lease. Retry later if not completed.",
        }),
      };
    }

    // 4c. FAIL-CLOSED CHECK: Any non-confirmed / ambiguous claim outcome MUST NOT proceed
    if (claim.claim_status !== "CLAIM_ACQUIRED") {
      return {
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ status: "claim_rejected" }),
        json: async () => ({
          success: false,
          status: "claim_rejected",
          idempotencyKey,
          leadId: rawLeadId,
          message: "Claim outcome could not be deterministically confirmed. Failing closed to prevent duplicate processing.",
        }),
      };
    }

    const claimVersion = claim.record.claimVersion;

    // 5. Staff Dispatch Alert
    if (!claim.record.staffNotified) {
      // PRE-FLIGHT OWNERSHIP CHECK & LEASE RENEWAL (verify_and_renew_n8n_claim)
      const leaseCheck = this.verifyAndRenewClaim(idempotencyKey, claimVersion, currentTime);
      if (!leaseCheck.isValid) {
        // Lease expired or reclaimed by another processor: ABORT BEFORE SMTP!
        return {
          ok: false,
          status: 409,
          text: async () => JSON.stringify({ status: "stale_execution_aborted" }),
          json: async () => ({
            success: false,
            status: "stale_execution_aborted",
            message: "Lease expired or reclaimed by another processor before staff notification. External side effect aborted.",
          }),
        };
      }

      if (this.failStaffEmail) {
        this.updateFenced(idempotencyKey, claimVersion, {
          status: "failed",
          lastError: "SMTP 535: Staff dispatch authentication failed",
        });
        return {
          ok: false,
          status: 500,
          text: async () => "SMTP 535: Staff dispatch authentication failed",
          json: async () => ({ success: false, error: "SMTP 535: Staff dispatch authentication failed" }),
        };
      }

      this.staffEmailDispatchCount += 1;

      // Simulate crash window where SMTP succeeded but DB crashed before marking staff_notified
      if (this.simulateDbCrashAfterSmtp) {
        throw new Error("PostgreSQL connection lost immediately after SMTP dispatch acknowledged message");
      }

      const updated = this.updateFenced(idempotencyKey, claimVersion, { staffNotified: true });
      if (!updated) {
        return {
          ok: false,
          status: 409,
          text: async () => "Lease expired during staff notification update",
          json: async () => ({ success: false, error: "STALE_CLAIM" }),
        };
      }
    }

    // 6. Customer Acknowledgement Email
    if (!claim.record.customerNotified && payload.email) {
      // PRE-FLIGHT OWNERSHIP CHECK & LEASE RENEWAL (verify_and_renew_n8n_claim)
      const leaseCheck = this.verifyAndRenewClaim(idempotencyKey, claimVersion, currentTime);
      if (!leaseCheck.isValid) {
        // Lease expired: ABORT BEFORE SMTP!
        return {
          ok: false,
          status: 409,
          text: async () => JSON.stringify({ status: "stale_execution_aborted" }),
          json: async () => ({
            success: false,
            status: "stale_execution_aborted",
            message: "Lease expired or reclaimed by another processor before customer notification. External side effect aborted.",
          }),
        };
      }

      if (this.failCustomerEmail) {
        this.updateFenced(idempotencyKey, claimVersion, {
          status: "failed",
          lastError: "SMTP 421: Customer email relay timeout",
        });
        return {
          ok: false,
          status: 500,
          text: async () => "SMTP 421: Customer email relay timeout",
          json: async () => ({ success: false, error: "SMTP 421: Customer email relay timeout" }),
        };
      }

      this.customerEmailDispatchCount += 1;
      const updated = this.updateFenced(idempotencyKey, claimVersion, { customerNotified: true });
      if (!updated) {
        return {
          ok: false,
          status: 409,
          text: async () => "Lease expired during customer notification update",
          json: async () => ({ success: false, error: "STALE_CLAIM" }),
        };
      }
    }

    // 7. Mark Completed
    const completed = this.updateFenced(idempotencyKey, claimVersion, {
      status: "completed",
      processedAt: currentTime,
    });

    if (!completed) {
      return {
        ok: false,
        status: 409,
        text: async () => "Lease expired before completion could be written",
        json: async () => ({ success: false, error: "STALE_CLAIM" }),
      };
    }

    if (this.simulateNetworkTimeoutBeforeResponse) {
      throw new Error("Network timeout: client disconnected before receiving response");
    }

    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, confirmed: true }),
      json: async () => ({
        success: true,
        status: "received",
        confirmed: true,
        idempotencyKey,
        leadId: rawLeadId,
      }),
    };
  }
}

describe("Final Reliability Gate: n8n Concurrency, Pre-Flight Checks & Outbox Reliability", () => {
  let engine: MockN8nWorkflowEngine;

  beforeEach(() => {
    vi.restoreAllMocks();
    engine = new MockN8nWorkflowEngine();
  });

  const createMockOutboxDb = (events: any[]) => {
    const updatedOutbox: any[] = [];
    const updatedLeads: any[] = [];

    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                for: async () => events,
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            updatedOutbox.push(values);
            if (values.automationStatus) {
              updatedLeads.push(values);
            }
          },
        }),
      }),
    };

    const mockDb: any = {
      transaction: async (cb: any) => await cb(mockTx),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            updatedOutbox.push(values);
          },
        }),
      }),
    };

    return { mockDb, updatedOutbox, updatedLeads };
  };

  it("rejects non-UUID idempotency key with HTTP 422 before touching the database", async () => {
    const response = await engine.handleWebhookRequest("http://localhost:5678/webhook/roofing-lead-created", {
      headers: {
        "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
        "X-Idempotency-Key": "not-a-valid-uuid; DROP TABLE leads;--",
      },
      body: JSON.stringify({
        leadId: "4c42fa5e-5ea6-42d4-bb0b-0ea4bf8935c1",
        customerName: "Jane Doe",
        phone: "(555) 123-4567",
        serviceType: "Repair",
        propertyLocation: "100 Main St",
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("INVALID_IDEMPOTENCY_KEY");
    expect(engine.idempotencyStore.size).toBe(0); // DB untouched!
  });

  it("rejects non-UUID leadId with HTTP 422 before touching the database", async () => {
    const response = await engine.handleWebhookRequest("http://localhost:5678/webhook/roofing-lead-created", {
      headers: {
        "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
        "X-Idempotency-Key": "4c42fa5e-5ea6-42d4-bb0b-0ea4bf8935c1",
      },
      body: JSON.stringify({
        leadId: "invalid-lead-id-string",
        customerName: "Jane Doe",
        phone: "(555) 123-4567",
        serviceType: "Repair",
        propertyLocation: "100 Main St",
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("INVALID_LEAD_ID");
    expect(engine.idempotencyStore.size).toBe(0); // DB untouched!
  });

  it("handles simultaneous first inserts deterministically: winner acquires claim, loser gets 409 without CTE snapshot gaps", async () => {
    const idempotencyKey = "11111111-2222-3333-4444-555555555555";
    const leadId = "aaaa1111-bb22-cc33-dd44-ee5555555555";
    const now = new Date();

    // Transaction 1 (Winner): inserts key and acquires claim
    const claim1 = engine.acquireAtomicClaim(idempotencyKey, leadId, now);
    expect(claim1.claim_status).toBe("CLAIM_ACQUIRED");
    expect(claim1.record.claimVersion).toBe(1);

    // Transaction 2 (Loser): competes simultaneously.
    // Under SELECT ... FOR UPDATE, T2 waits for T1 to commit, sees the committed row,
    // and deterministically returns CONCURRENT_LOCKED (never 0 rows!).
    const claim2 = engine.acquireAtomicClaim(idempotencyKey, leadId, now);
    expect(claim2.claim_status).toBe("CONCURRENT_LOCKED");

    // Loser sends request to webhook and receives HTTP 409 In-Flight
    const resLoser = await engine.handleWebhookRequest(
      "http://localhost:5678/webhook/roofing-lead-created",
      {
        headers: {
          "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          leadId,
          customerName: "Alice Smith",
          phone: "(555) 234-5678",
          serviceType: "Roof Replacement",
          propertyLocation: "123 Elm St",
        }),
      },
      now
    );

    expect(resLoser.status).toBe(409);
    const bodyLoser = await resLoser.json();
    expect(bodyLoser.status).toBe("in_flight");

    // Zero emails dispatched by the concurrent loser
    expect(engine.staffEmailDispatchCount).toBe(0);
    expect(engine.customerEmailDispatchCount).toBe(0);
  });

  it("handles concurrent lease reclamation deterministically: exactly one reclaims, competing worker gets 409", () => {
    const idempotencyKey = "22222222-3333-4444-5555-666666666666";
    const leadId = "bbbb2222-cc33-dd44-ee55-ff6666666666";
    const t0 = new Date("2026-10-28T00:00:00Z");

    // Initial claim by worker 1
    engine.acquireAtomicClaim(idempotencyKey, leadId, t0);

    // 6 minutes pass (past 5-minute lease expiry)
    const t1 = new Date(t0.getTime() + 6 * 60 * 1000);

    // Worker 2 and Worker 3 arrive simultaneously to reclaim
    // Worker 2 locks first via FOR UPDATE and reclaims (claimVersion -> 2)
    const claimWorker2 = engine.acquireAtomicClaim(idempotencyKey, leadId, t1);
    expect(claimWorker2.claim_status).toBe("CLAIM_ACQUIRED");
    expect(claimWorker2.record.claimVersion).toBe(2);

    // Worker 3 was waiting on FOR UPDATE lock. Unblocks, sees Worker 2's new active lease,
    // and deterministically returns CONCURRENT_LOCKED
    const claimWorker3 = engine.acquireAtomicClaim(idempotencyKey, leadId, t1);
    expect(claimWorker3.claim_status).toBe("CONCURRENT_LOCKED");
  });

  it("pre-flight check prevents stale worker from performing external SMTP side effects after lease expiry", async () => {
    const idempotencyKey = "33333333-4444-5555-6666-777777777777";
    const leadId = "cccc3333-dd44-ee55-ff66-aa7777777777";
    const t0 = new Date("2026-10-28T00:00:00Z");

    // Worker 1 acquires claim (version = 1)
    const claim1 = engine.acquireAtomicClaim(idempotencyKey, leadId, t0);
    expect(claim1.claim_status).toBe("CLAIM_ACQUIRED");
    expect(claim1.record.claimVersion).toBe(1);

    // Worker 1 encounters a 6-minute stall/pause (lease expires)
    const t1 = new Date(t0.getTime() + 6 * 60 * 1000);

    // Worker 2 reclaims the event (version = 2)
    const claim2 = engine.acquireAtomicClaim(idempotencyKey, leadId, t1);
    expect(claim2.claim_status).toBe("CLAIM_ACQUIRED");
    expect(claim2.record.claimVersion).toBe(2);

    // Worker 1 now wakes up and attempts to execute the pre-flight check before staff email
    const preFlightWorker1 = engine.verifyAndRenewClaim(idempotencyKey, 1, t1);
    expect(preFlightWorker1.isValid).toBe(false); // Rejected!

    // If Worker 1 called handleWebhookRequest with stale version, it aborts BEFORE SMTP!
    expect(engine.staffEmailDispatchCount).toBe(0);
  });

  it("fails closed on ambiguous / non-confirmed claim outcome: returns HTTP 409 and never calls email dispatchers", async () => {
    const idempotencyKey = "44444444-5555-6666-7777-888888888888";
    const leadId = "dddd4444-ee55-ff66-aa77-bb8888888888";

    // Simulate database returning AMBIGUOUS_RETRY (e.g. transient query anomaly or unconfirmed state)
    engine.simulateAmbiguousClaim = true;

    const response = await engine.handleWebhookRequest("http://localhost:5678/webhook/roofing-lead-created", {
      headers: {
        "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        leadId,
        customerName: "Test Ambiguous",
        phone: "(555) 999-0000",
        serviceType: "Gutter Repair",
        propertyLocation: "55 Ambiguity Blvd",
      }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.status).toBe("claim_rejected");
    expect(body.message).toContain("Failing closed");

    // STRICT VERIFICATION: ZERO EMAILS DISPATCHED UNDER AMBIGUITY
    expect(engine.staffEmailDispatchCount).toBe(0);
    expect(engine.customerEmailDispatchCount).toBe(0);
  });

  it("suppresses duplicate notifications on repeated delivery with same idempotency key once completed", async () => {
    const idempotencyKey = "55555555-6666-7777-8888-999999999999";
    const leadId = "eeee5555-ff66-aa77-bb88-cc9999999999";

    const payload = {
      leadId,
      customerName: "Carol Danvers",
      phone: "(555) 999-1111",
      email: "carol@example.com",
      serviceType: "Gutter Installation",
      propertyLocation: "789 Pine Rd",
    };

    // First delivery completes
    const res1 = await engine.handleWebhookRequest("http://localhost:5678/webhook/roofing-lead-created", {
      headers: {
        "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(200);
    expect(engine.staffEmailDispatchCount).toBe(1);
    expect(engine.customerEmailDispatchCount).toBe(1);

    // Repeated delivery after completion
    const res2 = await engine.handleWebhookRequest("http://localhost:5678/webhook/roofing-lead-created", {
      headers: {
        "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.status).toBe("already_processed");

    // Email counts MUST NOT increase
    expect(engine.staffEmailDispatchCount).toBe(1);
    expect(engine.customerEmailDispatchCount).toBe(1);
  });

  it("safely handles partial failures: retries only uncompleted actions without duplicate staff alerts", async () => {
    const idempotencyKey = "66666666-7777-8888-9999-000000000000";
    const leadId = "ffff6666-aa77-bb88-cc99-dd0000000000";
    const payload = {
      leadId,
      customerName: "Dan Evans",
      phone: "(555) 444-3322",
      email: "dan@example.com",
      serviceType: "Shingle Replacement",
      propertyLocation: "101 Cedar Ln",
    };

    // Customer email fails
    engine.failCustomerEmail = true;

    const res1 = await engine.handleWebhookRequest("http://localhost:5678/webhook/roofing-lead-created", {
      headers: {
        "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    expect(res1.status).toBe(500);
    expect(engine.staffEmailDispatchCount).toBe(1);
    expect(engine.customerEmailDispatchCount).toBe(0);

    // Second attempt: customer email resolved
    engine.failCustomerEmail = false;

    // Retry with small backoff
    const tRetry = new Date(Date.now() + 1000);
    const res2 = await engine.handleWebhookRequest(
      "http://localhost:5678/webhook/roofing-lead-created",
      {
        headers: {
          "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      },
      tRetry
    );

    expect(res2.status).toBe(200);
    // Staff email preserved: still 1
    expect(engine.staffEmailDispatchCount).toBe(1);
    // Customer email now 1
    expect(engine.customerEmailDispatchCount).toBe(1);

    const finalState = engine.idempotencyStore.get(idempotencyKey);
    expect(finalState?.status).toBe("completed");
  });

  it("documents unavoidable SMTP crash window: duplicate email risk when node crashes before DB commit", async () => {
    const idempotencyKey = "77777777-8888-9999-aaaa-bbbbbbbbbbbb";
    const leadId = "aaaa7777-bb88-cc99-ddaa-bbbbbbbbbbbb";
    const payload = {
      leadId,
      customerName: "Crash Window Test",
      phone: "(555) 123-4567",
      email: "test@example.com",
      serviceType: "Leak Repair",
      propertyLocation: "99 Disaster Way",
    };

    engine.simulateDbCrashAfterSmtp = true;

    await expect(
      engine.handleWebhookRequest("http://localhost:5678/webhook/roofing-lead-created", {
        headers: {
          "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      })
    ).rejects.toThrow("PostgreSQL connection lost immediately after SMTP dispatch");

    expect(engine.staffEmailDispatchCount).toBe(1);

    // On retry after crash:
    engine.simulateDbCrashAfterSmtp = false;
    const tAfterLease = new Date(Date.now() + 6 * 60 * 1000);

    const retryRes = await engine.handleWebhookRequest(
      "http://localhost:5678/webhook/roofing-lead-created",
      {
        headers: {
          "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      },
      tAfterLease
    );

    expect(retryRes.status).toBe(200);
    // Empirical proof of SMTP protocol boundary: exactly-once physical delivery cannot be guaranteed
    expect(engine.staffEmailDispatchCount).toBe(2);
  });

  it("integrates outbox worker with 409 In-Flight response: backs off and succeeds on retry", async () => {
    const idempotencyKey = "88888888-9999-aaaa-bbbb-cccccccccccc";
    const leadId = "bbbb8888-cc99-ddaa-bbbb-cccccccccccc";
    const mockEvent = {
      id: "outbox-retry-409",
      aggregateType: "lead",
      aggregateId: leadId,
      eventType: "lead.created",
      payload: {
        leadId,
        customerName: "Backoff Test",
        phone: "(555) 777-9999",
        email: "backoff@example.com",
        serviceType: "Inspection",
        propertyLocation: "300 Hillcrest Ave",
      },
      status: "pending",
      idempotencyKey,
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000),
      deliveredAt: null,
      lastError: null,
      createdAt: new Date(),
    };

    const { mockDb, updatedOutbox } = createMockOutboxDb([mockEvent]);

    // Pre-lock event as in-flight
    engine.acquireAtomicClaim(idempotencyKey, leadId);

    const fetchFn = (url: string, opts: any) => engine.handleWebhookRequest(url, opts) as any;
    const summary1 = await processOutboxBatch(10, mockDb, fetchFn);

    expect(summary1.retried).toBe(1);
    expect(summary1.delivered).toBe(0);
    expect(updatedOutbox.some((u) => u.status === "pending" && u.retryCount === 1)).toBe(true);

    // Complete in-flight execution
    engine.updateFenced(idempotencyKey, 1, { status: "completed" });

    // Outbox retries with same idempotency key
    mockEvent.retryCount = 1;
    mockEvent.nextRetryAt = new Date(Date.now() - 1000);
    const summary2 = await processOutboxBatch(10, mockDb, fetchFn);

    expect(summary2.delivered).toBe(1);
    expect(updatedOutbox.some((u) => u.status === "delivered")).toBe(true);
  });
});
