import { describe, it, expect, vi } from "vitest";
import { processOutboxBatch } from "../src/modules/outbox/outbox.worker.js";

describe("Transactional Outbox Worker Logic", () => {
  it("delivers pending event and marks status as delivered upon confirmed 200 OK", async () => {
    const mockEvent = {
      id: "outbox-1",
      aggregateType: "lead",
      aggregateId: "lead-1",
      eventType: "lead.created",
      payload: { customerName: "Jane Doe", service: "Roof Replacement" },
      status: "pending",
      idempotencyKey: "idem-key-12345",
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000), // Ready now
      deliveredAt: null,
      lastError: null,
      createdAt: new Date(),
    };

    const updatedOutbox: any[] = [];
    const updatedLeads: any[] = [];

    // Mock Drizzle DB query interface supporting atomic transactional claiming
    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                for: async () => [mockEvent],
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

    // Mock fetch confirming delivery
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "received", confirmed: true }),
    });

    const summary = await processOutboxBatch(10, mockDb, mockFetch as any);

    expect(summary.processed).toBe(1);
    expect(summary.delivered).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.retried).toBe(0);

    // Verify fetch was called with X-Idempotency-Key
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, fetchOptions] = mockFetch.mock.calls[0];
    expect(fetchOptions.headers["X-Idempotency-Key"]).toBe("idem-key-12345");

    // Verify outbox event updated to 'delivered'
    const finalOutboxUpdate = updatedOutbox.find((u) => u.status === "delivered");
    expect(finalOutboxUpdate).toBeDefined();
    expect(finalOutboxUpdate.deliveredAt).toBeInstanceOf(Date);

    // Verify lead status updated to 'delivered'
    const finalLeadUpdate = updatedLeads.find((u) => u.automationStatus === "delivered");
    expect(finalLeadUpdate).toBeDefined();
  });

  it("applies exponential backoff and keeps status pending when n8n returns 500 error", async () => {
    const mockEvent = {
      id: "outbox-2",
      aggregateType: "lead",
      aggregateId: "lead-2",
      eventType: "lead.created",
      payload: { customerName: "John Smith" },
      status: "pending",
      idempotencyKey: "idem-key-retry",
      retryCount: 1, // Second attempt
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000),
      deliveredAt: null,
      lastError: null,
      createdAt: new Date(),
    };

    const outboxUpdates: any[] = [];

    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                for: async () => [mockEvent],
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            outboxUpdates.push(values);
          },
        }),
      }),
    };

    const mockDb: any = {
      transaction: async (cb: any) => await cb(mockTx),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            outboxUpdates.push(values);
          },
        }),
      }),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "Bad Gateway",
    });

    const summary = await processOutboxBatch(10, mockDb, mockFetch as any);

    expect(summary.processed).toBe(1);
    expect(summary.delivered).toBe(0);
    expect(summary.retried).toBe(1);

    // Verify retry state: status stays 'pending', retryCount increments, nextRetryAt set in future
    const retryUpdate = outboxUpdates.find((u) => u.status === "pending" && u.retryCount === 2);
    expect(retryUpdate).toBeDefined();
    expect(retryUpdate.nextRetryAt.getTime()).toBeGreaterThan(Date.now());
    expect(retryUpdate.lastError).toContain("502");
  });

  it("marks event permanently failed when retry count exceeds maxRetries", async () => {
    const mockEvent = {
      id: "outbox-3",
      aggregateType: "lead",
      aggregateId: "lead-3",
      eventType: "lead.created",
      payload: { customerName: "Bob" },
      status: "pending",
      idempotencyKey: "idem-key-failed",
      retryCount: 4, // 5th attempt will reach maxRetries (5)
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000),
      deliveredAt: null,
      lastError: null,
      createdAt: new Date(),
    };

    const outboxUpdates: any[] = [];
    const leadUpdates: any[] = [];

    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                for: async () => [mockEvent],
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            if (values.status === "failed") outboxUpdates.push(values);
            if (values.automationStatus === "failed") leadUpdates.push(values);
          },
        }),
      }),
    };

    const mockDb: any = {
      transaction: async (cb: any) => await cb(mockTx),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            outboxUpdates.push(values);
          },
        }),
      }),
    };

    const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout connecting to n8n"));

    const summary = await processOutboxBatch(10, mockDb, mockFetch as any);

    expect(summary.processed).toBe(1);
    expect(summary.failed).toBe(1);

    const failedOutboxUpdate = outboxUpdates.find((u) => u.status === "failed");
    expect(failedOutboxUpdate).toBeDefined();
    expect(failedOutboxUpdate.retryCount).toBe(5);

    const failedLeadUpdate = leadUpdates.find((u) => u.automationStatus === "failed");
    expect(failedLeadUpdate).toBeDefined();
  });

  it("atomically claims events using row locking with lease expiration", async () => {
    const mockEvent = {
      id: "outbox-claim-test",
      aggregateType: "lead",
      aggregateId: "lead-claim-1",
      eventType: "lead.created",
      payload: { customerName: "Alice" },
      status: "pending",
      idempotencyKey: "idem-claim-1",
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 2000),
      deliveredAt: null,
      lastError: null,
      createdAt: new Date(),
    };

    const claimUpdates: any[] = [];
    const forUpdateSpy = vi.fn().mockResolvedValue([mockEvent]);

    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                for: forUpdateSpy,
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            claimUpdates.push(values);
          },
        }),
      }),
    };

    const mockDb: any = {
      transaction: async (cb: any) => await cb(mockTx),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const summary = await processOutboxBatch(10, mockDb, mockFetch as any, 300000);

    expect(summary.processed).toBe(1);
    expect(summary.delivered).toBe(1);

    // Verify row locking option was applied: FOR UPDATE SKIP LOCKED
    expect(forUpdateSpy).toHaveBeenCalledWith("update", { skipLocked: true });

    // Verify atomic claim set status to 'processing' with future lease timestamp
    const claimUpdate = claimUpdates.find((u) => u.status === "processing");
    expect(claimUpdate).toBeDefined();
    expect(claimUpdate.nextRetryAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("recovers and delivers stale processing events left behind by crashed workers", async () => {
    // Event was previously marked 'processing' by a crashed worker, but lease has expired
    const staleEvent = {
      id: "outbox-stale-1",
      aggregateType: "lead",
      aggregateId: "lead-stale-1",
      eventType: "lead.created",
      payload: { customerName: "Crashed Worker Lead" },
      status: "processing", // Stale state
      idempotencyKey: "idem-stale-recovered",
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 10000), // Lease expired 10s ago
      deliveredAt: null,
      lastError: null,
      createdAt: new Date(Date.now() - 600000),
    };

    const deliveredUpdates: any[] = [];

    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                for: async () => [staleEvent], // Reclaimed!
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        set: (values: any) => ({
          where: async () => {
            if (values.status === "delivered") {
              deliveredUpdates.push(values);
            }
          },
        }),
      }),
    };

    const mockDb: any = {
      transaction: async (cb: any) => await cb(mockTx),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const summary = await processOutboxBatch(10, mockDb, mockFetch as any);

    expect(summary.processed).toBe(1);
    expect(summary.delivered).toBe(1);
    expect(deliveredUpdates.length).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Idempotency-Key": "idem-stale-recovered",
        }),
      })
    );
  });
});
