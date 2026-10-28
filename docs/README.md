# Documentation Index — Roofing Lead Management & Automation System

Welcome to the comprehensive technical documentation suite for the Roofing Lead Management and Automation System. This index outlines the purpose, target audience, and canonical links for every specification, architectural guide, and operational runbook in this repository.

---

## 1. Master Documentation Map

| Document | Target Audience | Primary Purpose | Key Contents Covered |
| :--- | :--- | :--- | :--- |
| **[`Overview.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/Overview.md)** | **All Stakeholders**<br>*(Product, Engineering, Business)* | **Primary Business & Product Brief** *(Authoritative source of business requirements)* | Product purpose, target user personas, high-level feature list, single-client isolation philosophy, and MVP scope boundaries. |
| **[`docs/PAGE_AND_SCREEN_REFERENCE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/PAGE_AND_SCREEN_REFERENCE.md)** | **Frontend Developers, QA, Designers** | **UI/UX Screen Inventory** | Route-by-route reference of all public pages (`/`, `/services`, `/about`, `/service-areas`, `/contact`, `/privacy`), login (`/login`), and private dashboard screens (`/dashboard`, `/dashboard/leads`, `/dashboard/leads/:id`), actions, fields, validation, and states. |
| **[`docs/CONFIGURATION_REFERENCE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/CONFIGURATION_REFERENCE.md)** | **DevOps, Sysadmins, Onboarding Engineers** | **Master Settings Catalog** | Complete reference of every environment variable, build argument, and runtime flag across frontend, backend, database, Caddy, and n8n with defaults, restrictions, and sensitivity flags. |
| **[`docs/ARCHITECTURE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/ARCHITECTURE.md)** | **Software Architects, Lead Engineers** | **System Architecture & Data Flows** | 5-service container topology, network boundaries, end-to-end request flows, transactional outbox pattern, n8n boundary security, database claims, and chatbot decision-tree architecture. |
| **[`docs/OPERATIONS_GUIDE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/OPERATIONS_GUIDE.md)** | **DevOps, Site Reliability Engineers** | **Operational Runbooks** | Step-by-step verified procedures for local dev, staging lifecycle, fresh client deployment, secret generation, automated n8n provisioning, health checks, backups, restore drills, and client handover. |
| **[`docs/DEPLOYMENT.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/DEPLOYMENT.md)** | **DevOps, Infrastructure Architects** | **Staging & Infrastructure Specification** | VPS host sizing, multi-tier Docker Compose topology, Caddy auto-TLS, single-tenant client onboarding playbook, and release readiness checklists. |
| **[`docs/API_SPECIFICATION.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/API_SPECIFICATION.md)** | **Backend & Frontend Developers, API Consumers** | **REST API & Webhook Contracts** | JSON request/response formats, HTTP status codes, rate limits, CSRF requirements, role authorization, and backend-to-n8n outbox webhook payloads. |
| **[`docs/DATABASE_SCHEMA.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/DATABASE_SCHEMA.md)** | **Database Administrators, Backend Developers** | **Data Tier & Migrations** | PostgreSQL 16 schema, Drizzle ORM models, relations, Mermaid ER diagram, indexing strategies, and migrations 0000–0003 (including atomic claim stored procedures). |
| **[`docs/SECURITY.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/SECURITY.md)** | **Security Engineers, Auditors** | **Threat Model & Hardening** | Defense-in-depth controls, session management (`connect-pg-simple`), CSRF protection, native n8n Header Auth boundary enforcement, Code-node sandboxing (`N8N_BLOCK_ENV_ACCESS_IN_NODE`), and metadata trust verification. |
| **[`docs/REQUIREMENTS.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/REQUIREMENTS.md)** | **Product Managers, QA Engineers** | **Formal Requirements** | Traceability matrix of functional requirements (FR) and non-functional requirements (NFR), with explicit MVP scope boundaries and deferred features. |
| **[`docs/IMPLEMENTATION_PLAN.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/IMPLEMENTATION_PLAN.md)** | **Technical Project Managers** | **Milestone Roadmap** | Staged delivery roadmap tracing Milestones 1 through 9. |
| **[`automation/n8n/README.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/automation/n8n/README.md)** | **Automation Engineers** | **Workflow & Idempotency Specification** | In-depth concurrency analysis under PostgreSQL `READ COMMITTED` isolation, fail-closed branching, and claim lease renewal logic. |

---

## 2. Navigating the Architecture by Role

### For Developers Building or Debugging Features
1. Review [`docs/ARCHITECTURE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/ARCHITECTURE.md) to understand service communication boundaries and data flows.
2. Review [`docs/PAGE_AND_SCREEN_REFERENCE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/PAGE_AND_SCREEN_REFERENCE.md) for frontend route structure, component states, and validation rules.
3. Review [`docs/API_SPECIFICATION.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/API_SPECIFICATION.md) for endpoint contracts and error response schemas.
4. Review [`docs/DATABASE_SCHEMA.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/DATABASE_SCHEMA.md) for table definitions, relations, and migrations.

### For DevOps & Infrastructure Engineers
1. Follow [`docs/OPERATIONS_GUIDE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/OPERATIONS_GUIDE.md) for local development setup, staging commands, backup drills, and health checks.
2. Follow [`docs/CONFIGURATION_REFERENCE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/CONFIGURATION_REFERENCE.md) when configuring environment variables and build arguments.
3. Refer to [`docs/DEPLOYMENT.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/DEPLOYMENT.md) for VPS sizing, network topology, and the client onboarding playbook.

### For Security Reviewers & Compliance Auditors
1. Consult [`docs/SECURITY.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/SECURITY.md) for session security, CSRF headers, rate limiting, and container isolation.
2. Consult [`docs/PAGE_AND_SCREEN_REFERENCE.md`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/docs/PAGE_AND_SCREEN_REFERENCE.md) Section 5 for the audited separation between implemented features and deferred GUI settings.

---

## 3. Core Architectural Tenets
1. **Single-Tenant VPS Isolation**: Each client operates on a dedicated VPS instance with isolated PostgreSQL database storage and private container networks. No multi-tenant data sharing exists.
2. **Transactional Outbox Guarantee**: Quote inquiries are committed to PostgreSQL *before* automation is dispatched. Even if external email or n8n services are offline, lead data is never dropped.
3. **Native Boundary Authentication**: n8n Webhook requests require an `X-Webhook-Secret` evaluated at the HTTP boundary via Header Auth. Unauthorized calls are rejected with `HTTP 403 Forbidden` before running any workflow code.
4. **Deterministic Client-Side Chatbot**: The public chatbot operates on a deterministic decision-tree state machine without external AI dependencies, eliminating latency, token costs, and hallucination risks.
