import { and, or, eq, lte, asc } from "drizzle-orm";
import { getDb, AppDatabase } from "../../db/index.js";
import { outboxEvents, leads } from "../../db/schema.js";
import { env } from "../../config/env.js";

export interface OutboxProcessSummary {
  processed: number;
  delivered: number;
  failed: number;
  retried: number;
}

/**
 * Processes a batch of pending or stale processing outbox events.
 * Guarantees at-least-once delivery with confirmed receipt before marking delivered.
 * Uses atomic row claiming (FOR UPDATE SKIP LOCKED) to prevent concurrent double-processing
 * and automatically recovers orphaned processing events if a worker crashes.
 */
export async function processOutboxBatch(
  batchSize = 10,
  db: AppDatabase = getDb(),
  fetchFn: typeof fetch = fetch,
  staleTimeoutMs = 5 * 60 * 1000 // 5 minutes
): Promise<OutboxProcessSummary> {
  const summary: OutboxProcessSummary = {
    processed: 0,
    delivered: 0,
    failed: 0,
    retried: 0,
  };

  const now = new Date();
  const leaseExpiresAt = new Date(Date.now() + staleTimeoutMs);

  // 1. Atomically claim events using FOR UPDATE SKIP LOCKED
  const claimedEvents = await db.transaction(async (tx) => {
    // Select events that are either:
    // a) 'pending' and ready for execution (nextRetryAt <= now)
    // b) 'processing' and past their lease timeout (stale worker crash recovery)
    const selectQuery = tx
      .select()
      .from(outboxEvents)
      .where(
        or(
          and(eq(outboxEvents.status, "pending"), lte(outboxEvents.nextRetryAt, now)),
          and(eq(outboxEvents.status, "processing"), lte(outboxEvents.nextRetryAt, now))
        )
      )
      .orderBy(asc(outboxEvents.nextRetryAt))
      .limit(batchSize);

    // Apply PostgreSQL row-level locking with SKIP LOCKED if supported by driver
    const candidates =
      typeof (selectQuery as any).for === "function"
        ? await (selectQuery as any).for("update", { skipLocked: true })
        : await selectQuery;

    if (!candidates || candidates.length === 0) {
      return [];
    }

    // Atomically claim by advancing nextRetryAt to lease expiration and setting status to 'processing'
    for (const event of candidates) {
      await tx
        .update(outboxEvents)
        .set({
          status: "processing",
          nextRetryAt: leaseExpiresAt,
        })
        .where(eq(outboxEvents.id, event.id));
    }

    return candidates;
  });

  if (!claimedEvents || claimedEvents.length === 0) {
    return summary;
  }

  summary.processed = claimedEvents.length;
  const webhookUrl = `${env.N8N_INTERNAL_URL}${env.N8N_LEAD_WEBHOOK_PATH}`;

  for (const event of claimedEvents) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetchFn(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET,
          "X-Idempotency-Key": event.idempotencyKey,
        },
        body: JSON.stringify(event.payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Confirmation received: mark as delivered
        const deliveredAt = new Date();
        await db.transaction(async (tx) => {
          await tx
            .update(outboxEvents)
            .set({
              status: "delivered",
              deliveredAt,
              lastError: null,
            })
            .where(eq(outboxEvents.id, event.id));

          await tx
            .update(leads)
            .set({ automationStatus: "delivered" })
            .where(eq(leads.id, event.aggregateId));
        });

        summary.delivered += 1;
      } else {
        const errorText = await response.text().catch(() => "Unknown HTTP error");
        await handleDeliveryFailure(db, event, `n8n responded with status ${response.status}: ${errorText}`, summary);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await handleDeliveryFailure(db, event, `Webhook dispatch failed: ${errorMsg}`, summary);
    }
  }

  return summary;
}

async function handleDeliveryFailure(
  db: AppDatabase,
  event: typeof outboxEvents.$inferSelect,
  errorMessage: string,
  summary: OutboxProcessSummary
): Promise<void> {
  const newRetryCount = event.retryCount + 1;
  const maxRetries = event.maxRetries;

  if (newRetryCount >= maxRetries) {
    // Exceeded maximum attempts: permanently mark failed
    await db.transaction(async (tx) => {
      await tx
        .update(outboxEvents)
        .set({
          status: "failed",
          retryCount: newRetryCount,
          lastError: errorMessage,
        })
        .where(eq(outboxEvents.id, event.id));

      await tx
        .update(leads)
        .set({ automationStatus: "failed" })
        .where(eq(leads.id, event.aggregateId));
    });

    summary.failed += 1;
    console.error(`[Outbox Worker] Event ${event.id} permanently failed after ${newRetryCount} attempts: ${errorMessage}`);
  } else {
    // Exponential backoff: base 30 seconds * 2^retryCount (capped at 15 minutes)
    const backoffMs = Math.min(30000 * Math.pow(2, newRetryCount), 15 * 60 * 1000);
    const nextRetryAt = new Date(Date.now() + backoffMs);

    await db
      .update(outboxEvents)
      .set({
        status: "pending",
        retryCount: newRetryCount,
        nextRetryAt,
        lastError: errorMessage,
      })
      .where(eq(outboxEvents.id, event.id));

    summary.retried += 1;
    console.warn(`[Outbox Worker] Event ${event.id} attempt ${newRetryCount} failed. Retrying at ${nextRetryAt.toISOString()}: ${errorMessage}`);
  }
}

let workerIntervalId: NodeJS.Timeout | null = null;

export function startOutboxWorker(intervalMs = 5000, db: AppDatabase = getDb()): void {
  if (workerIntervalId) return;

  workerIntervalId = setInterval(async () => {
    try {
      await processOutboxBatch(10, db);
    } catch (err) {
      console.error("[Outbox Worker] Error during scheduled execution batch:", err);
    }
  }, intervalMs);

  console.log(`[Outbox Worker] Started background outbox polling every ${intervalMs}ms.`);
}

export function stopOutboxWorker(): void {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log("[Outbox Worker] Stopped background outbox worker.");
  }
}
