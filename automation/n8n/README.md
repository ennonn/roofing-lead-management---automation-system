# n8n Lead Notification Workflow & Idempotency Engine

This directory contains the production-grade, version-controlled n8n automation workflow for the Roofing Lead Management System: [`roofing-lead-notification-workflow.json`](./roofing-lead-notification-workflow.json).

---

## 1. Overview & Architecture

When a prospective customer submits a quote request on the public website, the backend commits the lead and an outbox event atomically to PostgreSQL within a single database transaction. The asynchronous outbox delivery worker dispatches an authenticated HTTP POST request to this n8n workflow.

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Backend Outbox Worker
    participant Webhook as n8n Webhook Endpoint
    participant DB as PostgreSQL (acquire_n8n_lead_claim)
    participant SMTP as SMTP Provider

    Worker->>Webhook: POST /webhook/roofing-lead-created<br/>Header: X-Webhook-Secret<br/>Header: X-Idempotency-Key<br/>Body: { leadId, customerName, phone, ... }

    alt Authentication or Payload Invalid (Regex Check)
        Webhook-->>Worker: HTTP 401 Unauthorized / 422 Unprocessable Entity
        Note over Worker: Worker logs failure; does not retry invalid format or secrets
    else Valid & Authenticated
        Webhook->>DB: CALL acquire_n8n_lead_claim(idempotency_key, lead_id)
        alt Claim Status: ALREADY_COMPLETED
            DB-->>Webhook: claim_status = 'ALREADY_COMPLETED'
            Webhook-->>Worker: HTTP 200 OK (already_processed)
            Note over Webhook,SMTP: NO emails sent. Duplicate safely suppressed.
        else Claim Status: CONCURRENT_LOCKED
            DB-->>Webhook: claim_status = 'CONCURRENT_LOCKED'
            Webhook-->>Worker: HTTP 409 Conflict (in_flight)
            Note over Worker: Outbox worker applies exponential backoff and retries later.
        else Claim Status: AMBIGUOUS_RETRY / DB Error
            DB-->>Webhook: Non-confirmed or empty row
            Webhook-->>Worker: HTTP 409 Conflict (claim_rejected)
            Note over Webhook: Fails closed. Never enters notification nodes.
        else Claim Status: CLAIM_ACQUIRED
            DB-->>Webhook: claim_status = 'CLAIM_ACQUIRED', claim_version = N
            opt staff_notified is false
                Webhook->>DB: Pre-Flight Check: verify_and_renew_n8n_claim(key, N)
                alt Lease Expired or Reclaimed
                    DB-->>Webhook: is_valid = false
                    Webhook-->>Worker: HTTP 409 Stale Lease Aborted
                    Note over Webhook: Side effect aborted before SMTP call.
                else Lease Active & Renewed
                    Webhook->>SMTP: Send Staff Dispatch Alert Email
                    Webhook->>DB: UPDATE staff_notified = true WHERE claim_version = N
                end
            end
            opt customer_notified is false (and customer email provided)
                Webhook->>DB: Pre-Flight Check: verify_and_renew_n8n_claim(key, N)
                alt Lease Expired or Reclaimed
                    DB-->>Webhook: is_valid = false
                    Webhook-->>Worker: HTTP 409 Stale Lease Aborted
                else Lease Active & Renewed
                    Webhook->>SMTP: Send Customer Acknowledgement Email
                    Webhook->>DB: UPDATE customer_notified = true WHERE claim_version = N
                end
            end
            Webhook->>DB: UPDATE status = 'completed', processed_at = now() WHERE claim_version = N
            Webhook-->>Worker: HTTP 200 OK { success: true, status: 'received', confirmed: true }
            Note over Worker: Outbox worker marks event 'delivered' in PostgreSQL
        end
    end
```

---

## 2. PostgreSQL Concurrency Analysis & Fail-Closed Architecture

### 2.1. The PostgreSQL CTE Snapshot Race Under `READ COMMITTED`
In standard PostgreSQL `READ COMMITTED` isolation, every statement in a single query operates against the **same snapshot** established when the query began.

Consider a multi-clause CTE:
```sql
WITH try_insert AS (INSERT ... ON CONFLICT DO NOTHING RETURNING ...),
fallback_read AS (SELECT ... FROM n8n_processed_events WHERE NOT EXISTS (try_insert))
```
When two transactions $T_1$ and $T_2$ start simultaneously on an empty table:
1. $T_1$ and $T_2$ start at snapshot $S$.
2. $T_1$ inserts row $K$.
3. $T_2$'s `try_insert` waits for $T_1$ to commit.
4. $T_1$ commits. $T_2$'s `ON CONFLICT DO NOTHING` triggers, producing **0 rows**.
5. $T_2$'s `fallback_read` evaluates `SELECT ... FROM n8n_processed_events`. **Because $T_2$'s snapshot $S$ was taken before $T_1$ committed, a plain `SELECT` cannot see the row committed by $T_1$!**
6. Consequently, the CTE returns **0 rows**.
7. If workflow nodes use fall-through logic (e.g. `status != 'completed'` testing `undefined != 'completed'`), a concurrent loser could proceed to send duplicate emails!

### 2.2. Deterministic Claim Acquisition via Stored Function (`acquire_n8n_lead_claim`)
To eliminate the snapshot gap, PostgreSQL provides `SELECT ... FOR UPDATE`. Under `READ COMMITTED`, `FOR UPDATE` re-evaluates the query lock against the **latest committed version** of the row, guaranteeing that a competing transaction sees the committed data.

The function [`acquire_n8n_lead_claim`](../backend/drizzle/0003_n8n_claim_functions.sql) encapsulates this logic:
1. **Initial Insert**: Tries `INSERT ... ON CONFLICT DO NOTHING`. If inserted, returns `CLAIM_ACQUIRED`.
2. **Explicit Row Lock**: If the row exists, executes `SELECT ... FOR UPDATE`. This blocks until any competing transaction commits and immediately loads the newest committed row.
3. **Completed Check**: If `status == 'completed'`, returns `ALREADY_COMPLETED`.
4. **Crash Recovery Check**: If `lease_expires_at <= now()`, atomically increments `claim_version`, extends the lease by 5 minutes, and returns `CLAIM_ACQUIRED`.
5. **In-Flight Lock**: If the lease is active (`lease_expires_at > now()`), returns `CONCURRENT_LOCKED`.
6. **Guaranteed Return**: The function **always returns exactly 1 row** with an explicit `claim_status`.

### 2.3. Fail-Closed Routing in n8n
The workflow routes strictly on `claim_status`:
- `CLAIM_ACQUIRED` is the **only condition** that enters the notification pipeline.
- `ALREADY_COMPLETED` routes to HTTP 200 `already_processed`.
- `CONCURRENT_LOCKED` routes to HTTP 409 `in_flight`.
- Any missing, null, empty, or unexpected outcome routes to `Respond: Ambiguous Claim Rejected (409)` (**Fail Closed**). Side effects are never executed under ambiguity.

---

## 3. Side-Effect Protection & The Pre-Flight Check

### 3.1. The Zombie Worker Side-Effect Hazard
While database fencing tokens (`WHERE claim_version = N`) prevent stale executions from writing to the database, they do not prevent a stalled worker from communicating with an external SMTP relay.

If Worker 1 stalls for > 5 minutes, Worker 2 reclaims the lease. If Worker 1 wakes up and directly executes `Email: Staff Dispatch Alert`, **both workers will send the email before database updates are attempted**.

### 3.2. Pre-Flight Lease Verification (`verify_and_renew_n8n_claim`)
To prevent this, the workflow inserts an atomic pre-flight check immediately before every external email node:

```sql
SELECT * FROM verify_and_renew_n8n_claim(
  $1::uuid, -- idempotency_key
  $2::integer -- claim_version
);
```

This function performs:
```sql
UPDATE n8n_processed_events
SET lease_expires_at = now() + interval '5 minutes', updated_at = now()
WHERE idempotency_key = p_idempotency_key
  AND claim_version = p_claim_version
  AND status = 'processing'
  AND lease_expires_at > now()
RETURNING *;
```
- If Worker 1 is healthy and its lease is active, `is_valid = true` is returned, and the lease is extended.
- If Worker 1's lease expired or was reclaimed by Worker 2 (`claim_version` changed), `is_valid = false` is returned.
- Worker 1 routes to `Respond: Stale Lease Aborted (409)` and **aborts without contacting SMTP**.

### 3.3. The Residual Race Window (Honest SMTP Boundary)
Even with pre-flight checks, a residual race window exists between the database verification and the external SMTP relay:
1. Worker 1 verifies its lease at $t = 0.000\text{s}$ (`is_valid = true`).
2. Worker 1 connects to the SMTP server and issues `RCPT TO` and `DATA`.
3. If an extreme network partition or OS freeze pauses Worker 1 for $> 5$ minutes during the active TCP socket transmission, Worker 2 may reclaim the lease and dispatch a duplicate notification before Worker 1's socket write completes.
4. Furthermore, if the SMTP relay accepts the message but n8n crashes before the subsequent `UPDATE staff_notified = true` commits to PostgreSQL, a retry will resend the notification.

This residual race is inherent to distributed systems lacking two-phase commit across external SMTP relays. Pre-flight lease renewal minimizes this window from "any worker pause ever" to "a freeze occurring strictly during active socket transmission."

---

## 4. SQL Parameterization & Security Validation

1. **Strict Input Sanitization**:
   - `X-Idempotency-Key` and `leadId` are strictly validated using regex:
     `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`.
   - If either value fails regex validation, the workflow rejects the request with HTTP 422 before any database node is invoked.
2. **Explicit SQL Casting**:
   - Every SQL query uses explicit type casting (`::uuid`, `::integer`).
3. **Secrets Isolation**:
   - `N8N_WEBHOOK_SECRET` is evaluated in memory via environment variables (`$env.N8N_WEBHOOK_SECRET`). No secrets or credentials are hardcoded in the exported workflow.
   - Sensitive customer data (project descriptions, phone numbers) is not logged in error responses or unhandled exceptions.

---

## 5. Failure & Concurrency Matrix

| Scenario | Workflow Behavior | Outcome & Duplicate Risk |
| :--- | :--- | :--- |
| **Simultaneous first delivery race** | `acquire_n8n_lead_claim` uses `SELECT ... FOR UPDATE`. Winner gets `CLAIM_ACQUIRED`; loser gets `CONCURRENT_LOCKED` (HTTP 409). | **Safely Recoverable.** No duplicate emails. |
| **Active lease held by another processor** | Query returns `CONCURRENT_LOCKED`. Workflow responds HTTP 409 `in_flight`. Outbox worker backs off and retries. | **Safely Recoverable.** No duplicate emails. |
| **Completed event redelivery** | Query returns `ALREADY_COMPLETED`. Workflow responds HTTP 200 `already_processed`. Skips email nodes. | **Safely Recoverable.** No duplicate emails. |
| **Worker crash with expired lease** | Subsequent delivery calls `acquire_n8n_lead_claim`. Senses `lease_expires_at <= now()`. Reclaims claim, advances `claim_version`, and finishes. | **Safely Recoverable.** Zero orphaned events. |
| **Zombie worker attempts email after lease expiry** | Pre-flight check `verify_and_renew_n8n_claim` finds expired lease or changed `claim_version`. Returns `is_valid = false`. | **Safely Recoverable.** Side effect aborted before SMTP. |
| **Ambiguous claim or DB failure** | Non-acquired status triggers fail-closed route: HTTP 409 `claim_rejected`. | **Safely Handled.** Never falls through to email. |
| **SMTP succeeds but DB fails before commit** | Message accepted by SMTP relay, but crash occurs before `staff_notified = true` is persisted. Next retry resends email. | **Unavoidable Duplicate Risk.** Standard SMTP boundary. |

---

## 6. Workflow Import & Deployment

1. **Database Migration**: Ensure migration [`0003_n8n_claim_functions.sql`](../backend/drizzle/0003_n8n_claim_functions.sql) is applied to PostgreSQL before activating the workflow.
2. **Import Workflow**: Import `roofing-lead-notification-workflow.json` via the private n8n UI (accessible via SSH tunnel `http://localhost:5678`).
3. **Credentials**: Configure `Production Roofing PostgreSQL` and `Roofing Company SMTP` credentials.
4. **Environment Variables**: Verify `N8N_WEBHOOK_SECRET`, `STAFF_NOTIFICATION_EMAIL`, `SMTP_DISPATCH_FROM`, and `COMPANY_NAME` in VPS `.env`.
5. **Activate**: Toggle the workflow to **Active**.
