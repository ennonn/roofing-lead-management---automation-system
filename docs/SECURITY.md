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

### 2.1. Closed Registration Model
- There is **no public registration route**.
- Initial business owner accounts are provisioned via secure initial database seeding or through direct command-line utility.
- Staff members can only be created by an authenticated `owner` or `admin`.

### 2.2. Password Hashing
- Password hashes use **Argon2id** (preferred) or **bcrypt** with a minimum work factor of 12 rounds.
- Plaintext passwords are never logged, cached, or transmitted in unencrypted form.

### 2.3. Server-Managed Session Cookies
Authentication is managed via HTTP sessions stored in PostgreSQL using `connect-pg-simple`:
- **Cookie Name**: `roofing_sid`
- **HttpOnly**: `true` (prohibits JavaScript access via `document.cookie`, preventing XSS token theft).
- **Secure**: `true` in production (ensures transmission solely over TLS/HTTPS).
- **SameSite**: `'lax'` (mitigates Cross-Site Request Forgery (CSRF) on cross-origin requests while preserving standard top-level navigation).
- **Session Lifespan**: 24-hour rolling expiration (`maxAge = 86400000`).

---

## 3. Data Protection & Tenant Isolation

### 3.1. Dedicated Single-Tenant Architecture
- Multi-tenancy at the row level introduces risk of accidental data leakage across businesses.
- Instead, **each roofing business receives a completely isolated deployment**: dedicated PostgreSQL container, private database credentials, and dedicated application process.
- No client data or queries ever mix.

### 3.2. Customer PII Minimization
- The quote intake collects only information necessary to provide roofing estimates: name, phone, optional email, address, and project notes.
- Payment details, credit checks, and social security numbers are strictly out-of-scope for the MVP.

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

---

## 5. Automation & n8n Hardening

### 5.1. n8n Editor UI Isolation
- The n8n graphical workflow editor contains credentials for email SMTP and internal API keys.
- **The n8n editor must never be exposed publicly to the open internet**.
- It is bound strictly to `127.0.0.1:5678` on the VPS host or placed behind an internal reverse proxy secured with strong Basic Authentication / SSH tunnel.

### 5.2. Webhook Authentication
- Inbound webhooks to n8n from the Express backend require an `X-Webhook-Secret` header matching the server's `N8N_WEBHOOK_SECRET`.
- The webhook payload structure is validated at the trigger node before any email is dispatched.

---

## 6. HTTP Security Headers

Express applies security headers using `helmet`:
- **Content-Security-Policy (CSP)**: Restricts script sources to `'self'` and trusted CDNs (Google Fonts).
- **X-Content-Type-Options**: `nosniff` (prevents MIME type sniffing).
- **X-Frame-Options**: `DENY` (prevents clickjacking attacks).
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains` in production.
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
