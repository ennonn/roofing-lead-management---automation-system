# Security Architecture & Hardening Specification

## 1. Security Philosophy & Threat Model

Security is treated as a fundamental architectural constraint across every tier of the application. The system follows the principle of **least privilege**, treats all external input as hostile, and enforces defense-in-depth across the public internet, API layer, database, and automation engine.

### 1.1. Trust Boundaries & STRIDE Analysis

```mermaid
flowchart LR
    subgraph Untrusted ["Untrusted Boundary"]
        Visitor["Public Visitor / Homeowner"]
        Bot["Automated Bots / Scanners"]
        StaffClient["Staff Browser"]
    end

    subgraph Edge ["Edge Boundary"]
        Proxy["Reverse Proxy (HTTPS / Rate Limiter)"]
    end

    subgraph AppBoundary ["Application Boundary"]
        Express["Express Backend API (Zod, Session Middleware, RBAC)"]
    end

    subgraph Internal ["Protected Internal Network"]
        Postgres[("PostgreSQL 16")]
        N8N["n8n Automation Engine"]
    end

    Visitor -->|HTTPS POST /leads| Proxy
    Bot -->|Hostile Input / Spam| Proxy
    StaffClient -->|HTTPS Session Cookie| Proxy

    Proxy --> Express
    Express -->|Drizzle Parameterized Queries| Postgres
    Express -->|Authenticated Webhook (X-Webhook-Secret)| N8N
```

| STRIDE Category | Threat Description | Architectural Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Impersonating authorized roofing staff or forging session IDs. | Cryptographically signed session cookies with `connect-pg-simple`; Argon2id/bcrypt password hashing; brute-force rate limiting (10 attempts/15 min). |
| **Tampering** | Modifying request parameters, SQL injection, or altering lead history. | 100% parameterized SQL queries via Drizzle ORM; strict schema validation via Zod; immutable audit records for `lead_notes`. |
| **Repudiation** | Denying who changed a lead status or logged a follow-up note. | Mandatory author attribution on all notes (`author_id`); timestamped status transitions (`last_status_update`); delivery tracking in `automation_events`. |
| **Information Disclosure** | Exposing customer PII, database credentials, or internal stack traces. | Strip internal errors in production; never expose secrets in frontend bundles; single-tenant database isolation prevents cross-client data leaks. |
| **Denial of Service** | Flooding quote submission or overwhelming the backend/database. | Rate limiting on public intake (5 requests / 10 min per IP); JSON body parser capped at 10KB; client submission debouncing and honeypot field. |
| **Elevation of Privilege** | Staff user attempting to modify business settings or system config. | Server-side Role-Based Access Control (RBAC) middleware verifying `role === 'owner' \|\| role === 'admin'`. |

---

## 2. Authentication & Session Architecture

### 2.1. Closed Registration Model & Initial Provisioning
- There is **strictly no public registration route**.
- The initial business owner account is created during system setup via `seedDatabase()`, which checks if any accounts exist:
  - If the `users` table is empty (`count === 0`), it hashes `INITIAL_OWNER_PASSWORD` using `bcrypt` (12 rounds) and creates the initial `owner` user with `isActive: true`.
  - If accounts already exist (`count > 0`), the seed procedure skips user creation to prevent accidental overwrites or hardcoded credential injection.
- Additional staff accounts may only be provisioned by authenticated owners.

### 2.2. Password Verification & Timing Side-Channel Defense
- Passwords are verified using `bcrypt.compare` against the stored 12-round hash.
- **Constant-Time Execution**: If an entered email does not exist or the account is inactive, `AuthService` executes a timing-safe `bcrypt.compare` against a pre-computed 12-round dummy hash (`DUMMY_HASH`). This ensures uniform processing time, preventing attackers from using response latency disparities to enumerate valid customer or owner email addresses.
- Login failures always return the uniform generic response: `401 Unauthorized` with error message `"Invalid email or password."`.

### 2.3. Session Fixation Defense via Session Regeneration
- Upon successful credential verification, the backend immediately calls `req.session.regenerate()` prior to attaching user state (`req.session.userId`, `req.session.user`).
- This assigns a completely fresh cryptographically random session identifier to the authenticated session, invalidating any pre-authentication session ID and completely thwarting session fixation attacks.

### 2.4. Server-Managed Session Cookies & Persistent Storage
Authentication state is managed via server-side sessions stored persistently in PostgreSQL using `connect-pg-simple`:
- **Store**: PostgreSQL `sessions` table (auto-pruned every 15 minutes; indexed on `expire`).
- **MemoryStore Prohibition**: In-memory sessions are strictly restricted to hermetic unit test environments (`NODE_ENV === 'test'`). In production, `createSessionMiddleware` validates the store and immediately throws a fatal exception if `MemoryStore` is provided or attempted.
- **Cookie Name**: `roofing_sid`
- **HttpOnly**: `true` (prohibits JavaScript access via `document.cookie`, preventing XSS token theft).
- **Secure**: `true` in production (enforced via `env.ts` validation, ensuring cookies are transmitted solely over TLS/HTTPS).
- **SameSite**: `'lax'` (mitigates CSRF on cross-origin requests while preserving standard browser top-level navigation).
- **Path**: `'/'` (covers all dashboard and API routes).
- **Rolling Expiration**: 24 hours (`maxAge = 86400000`). Each active request refreshes the expiration window.
- **Session Termination**: On `/api/v1/auth/logout`, `req.session.destroy()` purges the database row, and `res.clearCookie()` expires the cookie on the browser client with matching cookie attributes (`path: '/'`, `httpOnly: true`, `sameSite: 'lax'`, `secure`).

### 2.5. Defense-in-Depth CSRF & CORS Architecture
Session-authenticated state-changing operations (`POST`, `PUT`, `DELETE`) are guarded by three complementary layers:
1. **SameSite=Lax Cookie Policy**: Modern browsers will not attach the session cookie to cross-site requests initiated by foreign third-party origins.
2. **Origin & Referer Header Verification**: When an `Origin` header is provided (including `"null"` from sandboxed iframes or malformed strings), it is safely parsed and must match `CLIENT_ORIGIN`. If `Origin` is absent, the middleware inspects `Referer` and validates its origin against `CLIENT_ORIGIN`. Mismatched origins or referers are rejected with `403 Forbidden` (`CSRF_ORIGIN_INVALID`).
3. **Mandatory Custom Header Enforcement**: Mutating requests require either `X-Requested-With: XMLHttpRequest` or `X-CSRF-Token`. Standard browser security models prevent cross-origin scripts and HTML forms from setting custom request headers without CORS preflight authorization. Requests missing custom headers are rejected with `403 Forbidden` (`CSRF_TOKEN_MISSING`).
4. **CORS Restrictions**: Express CORS explicitly restricts allowed origins to `env.CLIENT_ORIGIN` with `credentials: true`. Wildcards (`*`) with credentials are strictly forbidden.

### 2.6. Server-Enforced Role Boundaries (RBAC)
- **Backend Enforcement**: Authorization is strictly enforced on the server via `requireAuth` and `requireRole(["owner", "admin"])` middleware. Frontend route hiding is treated purely as a usability convenience, never as an authorization boundary.
- **Single-Tenant Role Simplicity**: Per system requirements, each deployment serves a single roofing client. The schema supports `owner`, `admin`, and `staff` roles. Unauthenticated requests are rejected with `401 UNAUTHORIZED`; authenticated users lacking required role permissions are rejected with `403 FORBIDDEN`.

### 2.7. Production Environment Safeguards
The configuration parser (`parseEnv`) enforces fail-safe assertions when `NODE_ENV === 'production'`:
- `SESSION_SECRET`: Must be explicitly provided, must not equal the development default, and must be at least 32 characters long.
- `INITIAL_OWNER_PASSWORD`: Must be explicitly provided, must not equal the default temporary password, and must be at least 12 characters long.
- `N8N_WEBHOOK_SECRET`: Must not equal the development default.
- `COOKIE_SECURE`: Automatically forced to `true`.

---

## 3. Data Protection & Tenant Isolation

### 3.1. Dedicated Single-Tenant Architecture
- Multi-tenancy at the row level introduces risk of accidental data leakage across businesses.
- Instead, **each roofing business receives a completely isolated deployment**: dedicated PostgreSQL container, private database credentials, and dedicated application process.
- No client data or queries ever mix.

### 3.2. Customer PII Minimization
- The quote intake collects only information necessary to provide roofing estimates: name, phone, optional email, address, and project notes.
- Payment details, credit checks, and social security numbers are strictly out-of-scope for the MVP.

### 3.3. Public Information & Operational Privacy Protections
- **Public API Allowlisting**: The public endpoint [`GET /api/v1/business/public-info`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/API_SPECIFICATION.md#22-get-public-business-information) enforces a strict projection allowlist. Internal database keys (`id`), private operational dispatch emails (`dispatchEmail`), and internal timestamps are never returned to public visitors.
- **Settings Authorization Boundaries**: Administrative business settings (`GET /api/v1/business/settings` and `PATCH /api/v1/business/settings`) require authenticated sessions with `owner` or `admin` role and CSRF header verification. Staff members receive `403 Forbidden`.
- **Quote Intake Defense**: When quote intake is paused, the policy is enforced server-side in `POST /api/v1/leads`. Submissions are rejected before database transaction creation, preventing spam leads and unneeded outbound email notifications.
- **Concurrency-Safe Lazy Reopening**: Scheduled reopening transitions execute atomic PostgreSQL updates, ensuring concurrent public requests cannot cause race conditions or inconsistent availability states.

---

## 4. Input Validation & Spam Defense

### 4.1. Server-Side Schema Validation
All inbound payloads must parse through strict **Zod schemas** before reaching controllers or services:
- Unknown fields are stripped automatically.
- Strings are trimmed and sanitized.
- Numeric and phone formats are normalized.
- Failures return standardized `422 Unprocessable Entity` responses without revealing internal database structures.

### 4.2. Public Form Spam Protection
1. **Honeypot Field**: An invisible field `_hp` is placed on the quote form. Humans cannot see it; automated bots fill it. If present, the submission is silently dropped with a simulated 200 OK.
2. **IP Rate Limiting**: Managed via `express-rate-limit`:
   - `/api/v1/leads`: Max 5 submissions per 10 minutes per IP.
   - `/api/v1/auth/login`: Max 10 attempts per 15 minutes per IP.

### 4.3. SQL Parameterization & Injection Defense Preflight
- **Backend Application Queries**: All backend database queries use Drizzle ORM which executes parameterized SQL prepared statements natively. User inputs are never concatenated into raw SQL strings.
- **n8n Automation Engine Queries**: Every PostgreSQL node within `roofing-lead-notification-workflow.json` (such as atomic claim acquisition, lease verification/renewal, and status completion) passes external and workflow values through positional query parameters (`$1::uuid`, `$2::integer`, `$2::uuid`). Values are bound via the node configuration `options.queryReplacement = "={{ [...] }}"` array bindings, completely eliminating raw template interpolation (`{{ ... }}`) inside SQL execution statements.
- **Migration & Schema Parity**: All database migrations (`0000` through `0004`) remain strictly idempotent, consistent with Drizzle schema definitions, and encompass stored functions (`acquire_n8n_lead_claim`, `verify_and_renew_n8n_claim`) utilizing row-level locks (`FOR UPDATE`).

---

## 5. Automation & n8n Hardening

### 5.1. n8n Editor UI Isolation
- The n8n graphical workflow editor contains credentials for email SMTP and internal API keys.
- **The n8n editor must never be exposed publicly to the open internet**.
- It is bound strictly to `127.0.0.1:5678` on the VPS host or placed behind an internal reverse proxy secured with strong Basic Authentication / SSH tunnel.

### 5.2. Webhook Authentication & Native Boundary Enforcement
- Inbound webhooks from the Express backend require an `X-Webhook-Secret` header matching the provisioned `N8N_WEBHOOK_SECRET`.
- **Native Boundary Authentication**: Authentication is enforced at the webhook node boundary using n8n's built-in `headerAuth` mechanism mapped to an `httpHeaderAuth` credential (`HEADER_AUTH_CREDENTIAL_ID`). Unauthenticated or invalid requests are rejected immediately with `HTTP 403 Forbidden` (`Authorization data is wrong!`) before executing any downstream nodes, database queries, or Code scripts.
- **Explanation of `WWW-Authenticate: Basic realm="Webhook"` Header Artifact**:
  - In n8n runtime (`n8n-nodes-base/dist/nodes/Webhook/Webhook.node.js:228`), the catch handler for `WebhookAuthorizationError` unconditionally executes:
    `resp.writeHead(error.responseCode, { 'WWW-Authenticate': 'Basic realm="Webhook"' });`
    `resp.end(error.message);`
  - Regardless of whether the configured authentication mode is `basicAuth`, `headerAuth`, or `jwtAuth`, n8n emits this generic header on failure.
  - Runtime code verification (`utils.js:275`) confirms that `validateAuth` evaluates `authentication === 'headerAuth'` and compares the incoming `X-Webhook-Secret` against the decrypted credential data.
  - **Empirical Boundary Rejection**: Live staging testing confirmed that requests with missing or incorrect secrets trigger zero execution runs in n8n's `execution_entity` database table, confirming that unauthorized requests never reach Code nodes, subflows, or PostgreSQL claim acquisitions.
- The webhook payload structure and idempotency key are strictly validated with UUID regexes before any notification is dispatched.

### 5.3. Notification Metadata Trust & Server-Side Routing Integrity
- **Server-Side Provenance**: All business branding and notification routing destinations (`companyName`, `dispatchEmail`, `staffNotificationEmail`) are sourced strictly from validated server configuration in `leads.service.ts`:
  - `companyName`: `env.COMPANY_NAME`
  - `dispatchEmail`: `env.COMPANY_DISPATCH_EMAIL || env.INITIAL_OWNER_EMAIL`
  - `staffNotificationEmail`: `process.env.STAFF_NOTIFICATION_EMAIL || env.INITIAL_OWNER_EMAIL`
- **Protection Against Routing Hijacking & Spoofing**:
  - Public quote submissions via `/api/v1/leads` are validated against strict Zod schemas that parse only customer contact fields (`customerName`, `phone`, `email`, `serviceType`, `propertyLocation`, `projectDescription`, `preferredContactMethod`).
  - Any attacker attempt to supply `dispatchEmail`, `staffNotificationEmail`, or `companyName` in public form payloads is completely discarded by the schema parser.
  - Verified via staging injection tests: sending spoofed notification destinations in public quote requests resulted in outbox payloads containing strictly the server-configured client email destinations (`Apex Roofing Solutions`, `owner@apexroofing.com`), preventing open-relay or notification diversion attacks.

### 5.4. Environment-Variable Access Boundaries & Code-Node Isolation
- The n8n container sets `N8N_BLOCK_ENV_ACCESS_IN_NODE: "true"`, strictly blocking workflow Code nodes from reading container environment variables.
- **Elimination of `$env` Workflow Dependencies**:
  - Operational branding and notification addresses (`companyName`, `dispatchEmail`, `staffNotificationEmail`) are provided dynamically in the outbox event payload by the Express backend (`leads.service.ts`).
  - Notification email nodes reference payload items directly (`$('Validate & Authenticate Request').item.json.dispatchEmail`).
  - Workflow Code nodes contain zero `$env` expressions.
- **Sensitive Isolation Verification**:
  - `N8N_ENCRYPTION_KEY`, basic auth passwords, and internal container variables are completely inaccessible to workflow code.
  - `POSTGRES_PASSWORD`: Stored exclusively within the encrypted credentials vault in n8n's SQLite volume.
  - SMTP Credentials: Stored exclusively within the encrypted credentials vault.
  - Session Secret (`SESSION_SECRET`): Exists only in the backend API container.
- **Four-Layered Compensating Controls**:
  1. Boundary Authentication: Native Header Auth rejects unauthenticated calls prior to workflow execution.
  2. Strict Loopback Binding: Port `5678` is bound exclusively to `127.0.0.1` (loopback only) with no public reverse-proxy ingress.
  3. Node Environment Blocking: `N8N_BLOCK_ENV_ACCESS_IN_NODE: "true"` actively blocks environment variable reads in Code nodes.
  4. Mandatory SSH Tunneling & Basic Auth: Access requires host SSH key authentication to open an encrypted tunnel, plus HTTP Basic Authentication (`N8N_BASIC_AUTH_ACTIVE: true`). Clients have no access to the n8n interface.

---

## 6. HTTP Security Headers

Express applies security headers using `helmet`:
- **Content-Security-Policy (CSP)**: Restricts script sources to `'self'` and trusted CDNs (Google Fonts).
- **X-Content-Type-Options**: `nosniff` (prevents MIME type sniffing).
- **X-Frame-Options**: `DENY` (prevents clickjacking attacks).
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains` in production.
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
