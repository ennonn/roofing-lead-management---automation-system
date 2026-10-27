# System Architecture Specification

## 1. Executive Summary & Purpose

The **Roofing Lead Management & Automation System** is an extensible, single-tenant web application and lead-automation platform tailored for roofing contractors. Each deployment provides a distinct roofing company with:
1. A high-converting, responsive public marketing website with an interactive decision-tree chatbot and quote submission intake.
2. A secure, role-based internal administrative dashboard for managing leads, recording follow-up interactions, and reviewing real-time conversion metrics.
3. An asynchronous automation pipeline powered by self-hosted n8n to deliver instant notifications and scheduled customer follow-ups.

Each roofing business client operates on a **dedicated, isolated deployment** (isolated PostgreSQL database, backend instance, frontend static bundle, and n8n engine) deployed on a VPS via Docker Compose.

---

## 2. Documentation Authority & Organization

> [!IMPORTANT]
> **Project Brief Authority**: [Overview.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/Overview.md) located at the workspace root is the **single authoritative source of business requirements** for this project. 
>
> To avoid document drift or conflicting specifications, we recommend **keeping `Overview.md` at the repository root** as the primary project brief and linking to it directly from this documentation suite. A duplicate `docs/PROJECT_OVERVIEW.md` must not be created.

Related technical specifications in this suite:
- [REQUIREMENTS.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/REQUIREMENTS.md): Functional and non-functional requirements.
- [DATABASE_SCHEMA.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/DATABASE_SCHEMA.md): PostgreSQL entities, migrations, and Drizzle models.
- [API_SPECIFICATION.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/API_SPECIFICATION.md): REST endpoints, schemas, and webhook contracts.
- [SECURITY.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/SECURITY.md): Threat modeling, session auth, rate limiting, and RBAC.
- [DEPLOYMENT.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/DEPLOYMENT.md): Containerization, n8n licensing, networking, and backup protocols.
- [IMPLEMENTATION_PLAN.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/IMPLEMENTATION_PLAN.md): Staged delivery milestones.

---

## 3. High-Level System Architecture

The application adopts a **4-tier service architecture** designed for clean separation of concerns, high resilience, and zero client data bleeding.

```mermaid
flowchart TD
    subgraph Public Internet
        Visitor["Public Visitor / Homeowner"]
        Staff["Business Owner / Staff"]
    end

    subgraph Edge Layer ["Reverse Proxy (Caddy / Nginx)"]
        Proxy["TLS Termination & Reverse Proxy (:80 / :443)"]
    end

    subgraph Client Deployment Stack ["Single-Tenant Docker Compose Stack"]
        subgraph Web Tier
            Frontend["Vite + React Static App (Public Site + Dashboard)"]
        end

        subgraph Application Tier
            Backend["Express + TypeScript REST API (:5000)"]
            ZodVal["Zod Schema Validation & Sanitization"]
            AuthMod["Session Auth Middleware (connect-pg-simple)"]
            LeadsMod["Lead Management & Stats Engine"]
            WebhookClient["Resilient n8n Webhook Client"]
        end

        subgraph Data Tier
            Postgres[("PostgreSQL 16 Database\n(Leads, Sessions, Users, Settings)")]
        end

        subgraph Automation Tier ["Internal Network Only"]
            N8N["Self-Hosted n8n Engine (:5678)"]
            EmailSMTP["SMTP / Email Provider (SendGrid / Postmark)"]
        end
    end

    Visitor -->|HTTPS / GET pages, POST quote| Proxy
    Staff -->|HTTPS / Dashboard Login & Lead Mgt| Proxy

    Proxy -->|Static Web Traffic| Frontend
    Proxy -->|/api/* Requests| Backend

    Backend --> ZodVal
    Backend --> AuthMod
    Backend --> LeadsMod
    Backend --> WebhookClient

    AuthMod <-->|Session Store| Postgres
    LeadsMod <-->|Persistent CRUD| Postgres

    WebhookClient -.->|Internal POST with X-Webhook-Secret| N8N
    N8N -->|Customer Acknowledgement & Owner Alerts| EmailSMTP
```

---

## 4. Key Architectural Principles & Component Boundaries

### 4.1. Single-Tenant Data Isolation
- To guarantee strict privacy and eliminate multi-tenant leak vectors, **every roofing client receives a separate VPS deployment or isolated container stack**.
- Client customer records, follow-up notes, and business configuration never share database schemas or tables with other companies.

### 4.2. Database as Primary Source of Truth
- The PostgreSQL database is the sole authoritative store. External tools like Google Sheets or CRM systems are optional downstream consumers, never system-of-record dependencies.
- **Fail-Safe Lead Ingestion**: When a public quote is submitted, the backend validates and commits the lead record to PostgreSQL *before* attempting to trigger any automation. 
- If n8n or an external email delivery service is offline or errors, the lead is safely recorded with an `automation_status = 'pending'` or `'failed'` flag for subsequent retry. Under no circumstances does an automation failure drop or discard customer data.

### 4.3. Hybrid Business Configuration
To balance fast white-label customization with runtime operational control, configuration follows a two-tier hybrid model:
1. **Static Branding Layer (Build/Env Time)**: Logo assets, default theme color palette, typography tokens, and default legal terms live in frontend static configuration (`src/config/branding.ts`).
2. **Operational Settings Layer (Database Stored)**: Company phone number, notification dispatch email, operational business hours, active service zip codes, and chatbot prompt decisions are stored in the PostgreSQL `business_settings` table and editable in the private dashboard by authorized Owner/Admin users.

### 4.4. Separation of Public Website and Authenticated Dashboard
- **Public Surface**: Static roofing marketing pages (Home, Services, About, Service Areas, Contact/Quote, Privacy) and decision-tree chatbot. These invoke only public, rate-limited intake endpoints.
- **Private Surface**: Dashboard pages (Login, Overview Stats, Leads List, Lead Details, Business Settings). Enforced at the network and server level by Express session authentication cookies (`HttpOnly`, `SameSite=Lax`, `Secure`). Client-side route hiding is treated purely as a UI convenience; all API endpoints enforce server-side session checks.

---

## 5. Automation Architecture (Transactional Outbox Pattern)

To ensure **guaranteed lead preservation**, **zero data loss**, and **reliable at-least-once delivery**, the integration between the Express backend and n8n adopts the **Transactional Outbox Pattern**:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Homeowner / Visitor
    participant React as React Frontend
    participant API as Express API
    participant DB as PostgreSQL
    participant Worker as Outbox Worker (Backend)
    participant N8N as n8n Community Engine
    actor Owner as Roofing Owner / Staff

    Customer->>React: Submits Text-Only Quote Form
    React->>API: POST /api/v1/leads (with payload)
    API->>API: Zod validation & honeypot check

    rect rgb(240, 248, 255)
        Note over API,DB: ACID Transaction (Same DB Commit)
        API->>DB: INSERT into leads (status: 'new', automation_status: 'pending')
        API->>DB: INSERT into outbox_events (aggregate_id: lead.id, event: 'lead.created', idempotency_key: UUID, status: 'pending')
        DB-->>API: Transaction Committed Successfully
    end

    API-->>React: 201 Created { leadId, message: "Quote received" }
    React-->>Customer: Displays Instant Confirmation Screen

    rect rgb(255, 250, 240)
        Note over Worker,N8N: Asynchronous Outbox Delivery Worker
        Worker->>DB: SELECT pending events FOR UPDATE SKIP LOCKED
        Worker->>N8N: POST /webhook/roofing-lead-created<br/>Header: X-Webhook-Secret: [SECRET]<br/>Header: X-Idempotency-Key: [UUID]<br/>Body: { leadId, customer, service, location }
        alt n8n Confirmed Success (HTTP 200 OK)
            N8N->>Owner: Dispatches Email Notification
            N8N-->>Worker: 200 OK { status: "received", confirmed: true }
            Worker->>DB: UPDATE outbox_events SET status = 'delivered', delivered_at = now()
            Worker->>DB: UPDATE leads SET automation_status = 'delivered'
        else n8n Failure / Network Timeout
            Worker->>DB: UPDATE outbox_events SET status = 'pending', retry_count = retry_count + 1, next_retry_at = now() + backoff, last_error = error
            Note over Worker,DB: Lead remains safe. Worker retries using exponential backoff (max 5 retries). Never marked 'delivered' prematurely.
        end
    end
```

### 5.1. Delivery Guarantees & Duplicate Prevention
1. **Single ACID Transaction**: The lead record and outbox record commit together. If the database crashes, neither exists. If the database succeeds, the lead is safely stored and queued for delivery.
2. **Delivery Confirmation**: The system **never claims automation is delivered** until n8n returns an explicit HTTP 200 OK with confirmed status.
3. **Idempotency**: Every outbox event carries an immutable `idempotency_key` (UUID v4) sent via the `X-Idempotency-Key` header. If network timeouts cause a retry, n8n uses this key to deduplicate executions, preventing duplicate customer or staff emails.
4. **Concurrency Safety**: The worker processes events using `SELECT ... FOR UPDATE SKIP LOCKED`, preventing multiple worker ticks or processes from duplicating in-flight requests.
5. **Exponential Backoff**: Failed delivery attempts retry with exponential backoff (`30s`, `1m`, `2m`, `5m`, `15m`). If `retry_count >= max_retries`, the event transitions to `'failed'` and triggers a high-priority system alert in the dashboard.

### 5.2. n8n Deployment & Security Isolation
- The n8n Webhook node listens only on the internal Docker network or behind an authenticated internal proxy route.
- The n8n web editor UI is **never exposed directly to the public internet**. Access for workflow adjustments is restricted to `127.0.0.1` via SSH tunneling or basic-auth protected internal endpoints.

---

## 6. Scope Clarifications & Resolved Architectural Decisions

### 6.1. Resolved MVP Scope Decisions
1. **Notification Channels**: **Email notifications only** in the MVP for both staff alerts and customer acknowledgements. SMS notifications (e.g., Twilio) are deferred to post-MVP.
2. **Quote Form Intake**: **Text-only quote requests** in the MVP. Photo/file attachments are deferred to avoid early multi-part storage and S3 configuration overhead.
3. **Multi-Tenant Model**: Strictly **single-tenant per deployment**. Each roofing company receives a dedicated Docker Compose stack and isolated PostgreSQL database.
4. **Backend Stack**: Express with TypeScript, Zod validation, and Drizzle ORM.
5. **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`) with `HttpOnly`, `SameSite=Lax`, and `Secure` cookies.
6. **Authentication**: Closed registration. Owner/Admin and Staff roles seeded or managed by admins.

