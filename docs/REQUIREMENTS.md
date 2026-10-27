# System Requirements Specification

## 1. Overview & Scope Reference

This document formalizes the functional and non-functional requirements for the **Roofing Lead Management & Automation System**, derived directly from the primary business brief: [Overview.md](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/Overview.md).

---

## 2. User Roles & Personas

| Role | Description | Access Level |
| :--- | :--- | :--- |
| **Public Visitor (Homeowner/Property Owner)** | Browses roofing services, checks service coverage, interacts with decision-tree chatbot, requests quotes. | Public pages only. Rate-limited write access to lead submission. |
| **Business Staff** | Roofing company employee or sales estimator. Reviews incoming leads, updates statuses, logs follow-up notes. | Authenticated dashboard. Access to leads, notes, and overview stats. |
| **Business Owner / Administrator** | Roofing company executive. Manages business details, team members, operational settings, notification emails, and lead analytics. | Full dashboard access including business settings and user management. |
| **System Administrator (DevOps)** | Manages VPS host, Docker Compose stacks, database backups, and SSL/TLS proxy. | Host-level / SSH access. |

---

## 3. Functional Requirements

### 3.1. Public Roofing Website

- **FR-PUB-01: Marketing Content & Pages**:
  - The public site must present 6 distinct responsive pages: **Home**, **Services** (e.g., Roof Replacement, Roof Repair, Inspection & Maintenance, Storm Damage Restoration, Commercial Roofing), **About Us**, **Service Areas** (geographical map/list), **Contact / Request a Quote**, and **Privacy Policy**.
  - All pages must display consistent navigation headers, emergency contact badges, verified trust credentials (licenses, insurance, warranties), client testimonials, and clear call-to-action (CTA) banners.
- **FR-PUB-02: Quote Request Intake Form**:
  - Homeowners must be able to submit a quote request providing:
    - Customer Full Name (Required, 2–100 chars)
    - Phone Number (Required, validated against standard phone formats)
    - Email Address (Optional or Required depending on contact preference, validated RFC 5322)
    - Service Type (Required, dropdown: Replacement, Repair, Inspection, Emergency Leak, Commercial, Other)
    - Property Address / City / Zip Code (Required)
    - Project Description / Urgency Notes (Optional, max 1000 chars)
    - Preferred Contact Method (Phone call, SMS, or Email)
  - Must include spam mitigation (honeypot field and client submission debouncing).
- **FR-PUB-03: Predefined Decision-Tree Chatbot**:
  - A persistent, floating chatbot widget available across all public pages.
  - The chatbot must present guided quick-choice questions without requiring freeform natural language parsing:
    1. *What roofing services do you offer?*
    2. *Do you serve my area?*
    3. *How do I request a quote?*
    4. *How can I contact the business directly?*
    5. *What should I do if my roof is actively leaking?*
  - Responses must dynamically pull from configured business details (e.g., company phone, emergency line, listed service zip codes).
  - Every conversation flow must offer a prominent direct CTA to open the Quote Form or trigger a phone call (`tel:` link).

### 3.2. Authentication & Account Management

- **FR-AUTH-01: Closed Registration Model**:
  - There is **no public sign-up form**. User accounts can only be provisioned by an existing Owner/Admin or via secure initial database seeding.
- **FR-AUTH-02: Session-Based Login**:
  - Staff and Owners log in using email address and password.
  - The server creates an encrypted session persisted in PostgreSQL and issues an `HttpOnly`, `SameSite=Lax`, `Secure` session cookie.
- **FR-AUTH-03: Password Security**:
  - Passwords must be hashed using Argon2id or bcrypt (cost factor >= 12).
  - Minimum password policy: at least 10 characters with mixed-case and numbers.
- **FR-AUTH-04: Session Expiry & Logout**:
  - Sessions automatically expire after 24 hours of inactivity.
  - Logout terminates the session in the PostgreSQL store and clears the client cookie immediately.

### 3.3. Lead Management & Dashboard

- **FR-LEAD-01: Lead Storage & Lifecycle**:
  - Every quote submission generates a persistent record in PostgreSQL with a unique UUID.
  - Allowed lead statuses:
    1. `New`: Recently submitted, awaiting initial review.
    2. `Contacted`: Staff reached out via phone or email.
    3. `Estimate Scheduled`: In-person roof inspection scheduled.
    4. `Won`: Contract signed or job approved.
    5. `Lost`: Unresponsive, out of service area, or declined.
- **FR-LEAD-02: Follow-Up Notes**:
  - Authorized staff can attach timestamped follow-up notes to any lead.
  - Each note records the author user ID, creation timestamp, and text content. Notes are immutable once created.
- **FR-LEAD-03: Search & Filter**:
  - Dashboard users can search leads by customer name, phone number, email, or zip code.
  - Users can filter leads by status and sort chronologically.
- **FR-LEAD-04: Real-Time Statistics & Metrics**:
  - Dashboard metrics are **computed directly from live PostgreSQL records** (never mocked or hardcoded):
    - Total leads received (overall & current 30-day window).
    - Status distribution breakdown (New, Contacted, Estimate Scheduled, Won, Lost).
    - Conversion rate (% of leads reaching 'Won').
    - Leads requiring follow-up (> 24 hours in 'New' status without contact).

### 3.4. Business Settings Management

- **FR-SET-01: Operational Configuration**:
  - Owner/Admin users can update business operational details via the dashboard:
    - Company legal name and DBA.
    - Primary dispatch email (destination for new lead alerts).
    - Primary office phone and emergency storm contact numbers.
    - Operating hours and weekend emergency policy.
    - Active service counties/cities/zip codes.

### 3.5. n8n Automation Workflows

- **FR-AUTO-01: New Lead Notification (Workflow A)**:
  - Triggered by backend webhook upon successful lead database commit.
  - Validates webhook secret header and payload integrity.
  - Formats an alert email to the configured business dispatch address with customer details and urgency level.
- **FR-AUTO-02: Customer Acknowledgement (Workflow B)**:
  - Dispatches an automated confirmation email/SMS to the customer confirming quote receipt and outlining expected follow-up time (e.g., within 2 business hours).
- **FR-AUTO-03: Stale Lead Follow-Up Reminder (Workflow C)**:
  - Scheduled cron (e.g., daily at 08:00 AM) that queries leads stuck in 'New' or 'Contacted' without updates for > 48 hours and notifies staff.

---

## 4. Non-Functional Requirements

### 4.1. Security & Compliance
- **NFR-SEC-01**: Server-side enforcement of authentication on all `/api/v1/dashboard/*` and `/api/v1/leads/*` routes.
- **NFR-SEC-02**: Parameterized queries via Drizzle ORM to prevent SQL injection.
- **NFR-SEC-03**: Strict rate limiting: 10 failed login attempts per 15 minutes per IP; 5 quote submissions per 10 minutes per IP.
- **NFR-SEC-04**: Complete n8n UI isolation; n8n editor must not be publicly routable.

### 4.2. Reliability & Fault Tolerance
- **NFR-REL-01 (Lead Preservation Guarantee)**: Lead records must commit to PostgreSQL before any external webhook call. If n8n or SMTP fails, the customer receives a success response, and the lead is marked for background retry.
- **NFR-REL-02**: Database connection pooling with auto-reconnect and health checks.

### 4.3. Usability & Aesthetics
- **NFR-USE-01**: Responsive layout optimized for mobile smartphones (majority of emergency roof repair searches happen on mobile devices).
- **NFR-USE-02**: Clean, modern aesthetic tailored for high-end roofing contractors (curated color scheme, clear typographic hierarchy, subtle interactive hover states, no raw browser defaults).

---

## 5. Explicitly Out-of-Scope (MVP)

Per [Overview.md:L383-403](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/Overview.md#L383-403), the following capabilities are explicitly deferred:
- Online payments, credit card processing, or financing applications.
- Full roofing job/crew dispatch and project management.
- Employee payroll and time tracking.
- Homeowner customer portal/login accounts.
- Native mobile applications (iOS/Android).
- Generative AI / LLM-powered chatbot (only rule-based decision tree is in scope).
- Multi-tenant multi-client shared administrative portals.
