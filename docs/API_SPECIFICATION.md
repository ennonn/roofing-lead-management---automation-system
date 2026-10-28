# REST API & Webhook Specification

## 1. Overview & Conventions

All endpoints are versioned under the base URL `/api/v1`. The API follows RESTful design principles and JSON payloads.

### 1.1. Response Format Standards

Every response adheres to a consistent structure:

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      {
        "field": "phone",
        "message": "Must be a valid 10-digit phone number"
      }
    ]
  }
}
```

### 1.2. HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource created successfully.
- `400 Bad Request`: Malformed JSON or unparseable input.
- `401 Unauthorized`: Missing or invalid session cookie.
- `403 Forbidden`: Insufficient role permissions (e.g., Staff attempting to change Business Settings).
- `404 Not Found`: Target entity does not exist.
- `422 Unprocessable Entity`: Request body failed Zod schema validation.
- `429 Too Many Requests`: Rate limit threshold exceeded.
- `500 Internal Server Error`: Unhandled server exception.

---

## 2. Public Endpoints (Unauthenticated)

### 2.1. Submit Quote Request
Submits a new roofing inquiry or quote request from the public website or chatbot.

- **Method**: `POST`
- **Path**: `/api/v1/leads`
- **Rate Limit**: Max 5 submissions per 10 minutes per IP.
- **Request Headers**: `Content-Type: application/json`

#### Request Body (Zod Validated)
```json
{
  "customerName": "Jane Doe",
  "phone": "(555) 234-5678",
  "email": "jane.doe@example.com",
  "serviceType": "Roof Replacement",
  "propertyLocation": "123 Maple St, Dallas, TX 75201",
  "projectDescription": "Asphalt shingle roof is 22 years old and leaking around chimney.",
  "preferredContactMethod": "phone",
  "leadSource": "website_quote_form",
  "_hp": ""
}
```
*Note: `_hp` is an invisible honeypot field. If populated by an automated spam bot, the API silently returns 200 without saving or dispatching.*

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "leadId": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
    "status": "new",
    "submissionDate": "2026-10-27T14:30:00.000Z"
  },
  "message": "Thank you! Your quote request has been received. Our team will contact you shortly."
}
```

---

### 2.2. Get Public Business Information
Retrieves public company details (office phone, emergency line, covered service areas, business hours) for rendering marketing copy and chatbot answers.

- **Method**: `GET`
- **Path**: `/api/v1/business/public-info`
- **Success Response (`200 OK`)**
```json
{
  "success": true,
  "data": {
    "companyName": "Apex Roofing Solutions",
    "phone": "(555) 123-4567",
    "emergencyPhone": "(555) 999-HELP",
    "dispatchEmail": "info@apexroofingexample.com",
    "serviceAreas": ["Dallas County", "Collin County", "Tarrant County"],
    "businessHours": {
      "weekdays": "7:00 AM - 6:00 PM",
      "saturday": "8:00 AM - 2:00 PM",
      "sunday": "Emergency Repairs Only"
    },
    "licenseNumber": "TX-ROOF-88291"
  }
}
```

---

## 3. Authentication Endpoints

### 3.1. Owner / User Login
Authenticates an owner or authorized user using email and password, regenerates the session ID to defend against fixation, and issues a server-managed cookie.

- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Rate Limit**: Max 10 attempts per 15 minutes per IP (returns `429 Too Many Requests`).
- **Security Headers**:
  - `Origin`: Must match `CLIENT_ORIGIN` (when provided by browser).
  - `X-Requested-With: XMLHttpRequest` or `X-CSRF-Token`: Required for state-changing CSRF defense.
- **Request Body**:
```json
{
  "email": "owner@example-roofing.com",
  "password": "StrongPassword123!"
}
```
- **Response Headers**: `Set-Cookie: roofing_sid=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400; Secure (in production)`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "18f97200-a681-4541-b847-a8e5786a51d8",
      "email": "owner@example-roofing.com",
      "fullName": "Apex Business Owner",
      "role": "owner"
    }
  },
  "message": "Authentication successful."
}
```
- **Failure Responses**:
  - `401 Unauthorized`: Generic error when email does not exist or password does not match (prevents user enumeration):
    ```json
    {
      "success": false,
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password."
      }
    }
    ```
  - `403 Forbidden`: Missing CSRF custom header (`CSRF_TOKEN_MISSING`) or mismatched Origin (`CSRF_ORIGIN_INVALID`).
  - `429 Too Many Requests`: Rate limit exceeded (`AUTH_RATE_LIMIT_EXCEEDED`).

---

### 3.2. Owner / User Logout
Destroys the current session in PostgreSQL, invalidates the session identifier, and instructs the browser to clear the session cookie.

- **Method**: `POST`
- **Path**: `/api/v1/auth/logout`
- **Authentication**: Required (`requireAuth`).
- **Security Headers**: `X-Requested-With: XMLHttpRequest` or `X-CSRF-Token`.
- **Response Headers**: `Set-Cookie: roofing_sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully."
}
```

---

### 3.3. Verify Active Session
Retrieves the currently authenticated user's session profile. Used by the dashboard to verify session persistence on page reload.

- **Method**: `GET`
- **Path**: `/api/v1/auth/session` *(Alias: `/api/v1/auth/me`)*
- **Authentication**: Required (`requireAuth`).
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "18f97200-a681-4541-b847-a8e5786a51d8",
      "email": "owner@example-roofing.com",
      "fullName": "Apex Business Owner",
      "role": "owner"
    }
  }
}
```
- **Failure Response (`401 Unauthorized`)**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required to access this resource."
  }
}
```

---

### 3.4. Protected Dashboard Authorization Probe
Verification endpoint demonstrating server-side Role-Based Access Control (`requireAuth`, `requireRole(["owner", "admin"])`).

- **Method**: `GET`
- **Path**: `/api/v1/auth/protected-probe`
- **Authentication**: Required (`requireAuth`).
- **Authorization**: Role must be `owner` or `admin`.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "18f97200-a681-4541-b847-a8e5786a51d8",
      "email": "owner@example-roofing.com",
      "fullName": "Apex Business Owner",
      "role": "owner"
    },
    "message": "Authorized dashboard access confirmed."
  }
}
```
- **Forbidden Response (`403 Forbidden`)**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource."
  }
}
```

---

## 4. Authenticated Dashboard Endpoints

### 4.1. Dashboard Overview Statistics
Computes real-time lead metrics directly from persistent PostgreSQL records.

- **Method**: `GET`
- **Path**: `/api/v1/dashboard/stats`
- **Security & Authorization**:
  - Requires an active, server-managed HTTP-only session cookie (`credentials: "include"`).
  - Role-guarded: Only `owner` and `admin` roles are authorized (`requireRole(["owner", "admin"])`).
  - Returns `401 Unauthorized` if session cookie is absent or expired.
  - Returns `403 Forbidden` if the authenticated user lacks owner/admin privileges.
- **Calculation Details**:
  - `totalLeads`: `COUNT(*)` of all non-deleted records in the `leads` table.
  - `last30Days`: `COUNT(*)` where `created_at >= NOW() - INTERVAL '30 days'`.
  - `conversionRate`: `(won_leads / total_leads) * 100`, rounded to 1 decimal place (returns `0` if `total_leads === 0`).
  - `statusCounts`: Record of lead counts partitioned across all 5 standard lifecycle statuses (`new`, `contacted`, `estimate_scheduled`, `won`, `lost`).
  - `urgentAttentionCount`: `COUNT(*)` of leads currently in `new` status where `created_at < NOW() - INTERVAL '24 hours'` (inquiries awaiting outreach > 24h).
  - Zero-State Guarantee: Returns genuine zero counts across all metrics when the database is empty; does not fabricate sample leads or performance metrics.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "totalLeads": 142,
    "last30Days": 38,
    "conversionRate": 28.9,
    "statusCounts": {
      "new": 12,
      "contacted": 19,
      "estimate_scheduled": 15,
      "won": 41,
      "lost": 55
    },
    "urgentAttentionCount": 4
  }
}
```

---

### 4.2. List Leads (Filterable & Paginated)
Retrieves a paginated list of leads with server-side filtering, searching, and sorting.

- **Method**: `GET`
- **Path**: `/api/v1/leads`
- **Authentication**: Required (`requireAuth`, session cookie).
- **Authorization**: `owner` or `admin` (`requireRole(["owner", "admin"])`).
- **Query Parameters**:
  - `page`: Page number (coerced integer $\ge 1$, default: `1`).
  - `limit`: Items per page (coerced integer between `1` and `100`, default: `20`).
  - `status`: Filter by status (`new`, `contacted`, `estimate_scheduled`, `won`, `lost`).
  - `search`: Search query string (trimmed, max 100 characters; parameterized case-insensitive ILIKE search against `customer_name`, `phone`, `email`, and `property_location` with wildcard escaping).
  - `sortBy`: Field to sort by (`submissionDate`, `createdAt`, `customerName`, `status`, `lastStatusUpdate`; default: `submissionDate`).
  - `sortOrder`: Sort direction (`asc`, `desc`; default: `desc`).
- **Ordering Guarantee**: Employs secondary tie-breaker `leads.id asc` for stable pagination when timestamps or primary sort columns match.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
        "customerName": "Jane Doe",
        "phone": "(555) 234-5678",
        "email": "jane.doe@example.com",
        "serviceType": "Roof Replacement",
        "propertyLocation": "Dallas, TX 75201",
        "status": "new",
        "submissionDate": "2026-10-27T14:30:00.000Z",
        "lastStatusUpdate": "2026-10-27T14:30:00.000Z",
        "notesCount": 0
      }
    ],
    "pagination": {
      "total": 142,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Session cookie missing, expired, or invalid.
  - `403 Forbidden`: Authenticated user does not have `owner` or `admin` role.
  - `422 Unprocessable Entity`: Invalid query parameters (e.g., negative page, limit > 100, invalid status enum, search length > 100 chars, unsupported sort column).

---

### 4.3. Get Lead Details
Retrieves the full lead profile with chronological follow-up notes.

- **Method**: `GET`
- **Path**: `/api/v1/leads/:id`
- **Authentication**: Required (`requireAuth`, session cookie).
- **Authorization**: `owner` or `admin` (`requireRole(["owner", "admin"])`).
- **Path Parameters**:
  - `id`: UUID of the lead (`leadIdParamSchema`).
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
    "customerName": "Jane Doe",
    "phone": "(555) 234-5678",
    "email": "jane.doe@example.com",
    "serviceType": "Roof Replacement",
    "propertyLocation": "123 Maple St, Dallas, TX 75201",
    "projectDescription": "Asphalt shingle roof is 22 years old and leaking around chimney.",
    "preferredContactMethod": "phone",
    "leadSource": "website_quote_form",
    "status": "contacted",
    "automationStatus": "delivered",
    "submissionDate": "2026-10-27T14:30:00.000Z",
    "lastStatusUpdate": "2026-10-27T15:10:00.000Z",
    "createdAt": "2026-10-27T14:30:00.000Z",
    "updatedAt": "2026-10-27T15:10:00.000Z",
    "notes": [
      {
        "id": "119842c2-8089-4bc5-827c-c820b9e8432a",
        "leadId": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
        "authorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "authorName": "Bob Estimator",
        "noteText": "Called customer. Scheduled on-site inspection for Thursday at 2:00 PM.",
        "createdAt": "2026-10-27T15:10:00.000Z"
      }
    ]
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Unauthenticated request.
  - `403 Forbidden`: Insufficient role authorization.
  - `404 Not Found`: Lead with requested ID does not exist (`{"error": {"code": "NOT_FOUND", "message": "Lead not found."}}`).
  - `422 Unprocessable Entity`: `id` is not a valid UUID format.

---

### 4.4. Update Lead Status
Updates the lifecycle status of a lead. Strict schema prevents mass-assignment of arbitrary fields.

- **Method**: `PATCH`
- **Path**: `/api/v1/leads/:id/status`
- **Authentication**: Required (`requireAuth`, session cookie).
- **Authorization**: `owner` or `admin` (`requireRole(["owner", "admin"])`).
- **CSRF Protection**: Enforced (`verifyCsrf`). Requires custom header (`X-Requested-With: XMLHttpRequest` or `X-CSRF-Token`) and verified Origin.
- **Path Parameters**:
  - `id`: UUID of the lead.
- **Request Body**:
```json
{
  "status": "estimate_scheduled"
}
```
- **Validation**: Accepts only the 5 valid status values: `new`, `contacted`, `estimate_scheduled`, `won`, `lost`. Body is strict; additional fields trigger validation error.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
    "status": "estimate_scheduled",
    "lastStatusUpdate": "2026-10-27T15:20:00.000Z",
    "updatedAt": "2026-10-27T15:20:00.000Z"
  },
  "message": "Lead status updated to 'estimate_scheduled'"
}
```
- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid session cookie.
  - `403 Forbidden`: CSRF check failed or non-owner/non-admin user.
  - `404 Not Found`: Lead ID does not exist.
  - `422 Unprocessable Entity`: Status missing, status not an allowed enum value, or extra fields provided.

---

### 4.5. Add Follow-Up Note
Appends a timestamped follow-up note to a lead, associated with the authenticated user.

- **Method**: `POST`
- **Path**: `/api/v1/leads/:id/notes`
- **Authentication**: Required (`requireAuth`, session cookie).
- **Authorization**: `owner` or `admin` (`requireRole(["owner", "admin"])`).
- **CSRF Protection**: Enforced (`verifyCsrf`). Requires custom header and verified Origin.
- **Path Parameters**:
  - `id`: UUID of the target lead.
- **Request Body**:
```json
{
  "noteText": "Customer requested architectural shingle sample book."
}
```
- **Validation**: `noteText` is trimmed and validated: minimum 1 character, maximum 2000 characters. Schema is strict.
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "99ea7831-52f1-432a-bc91-729910e118ba",
    "leadId": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
    "authorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "authorName": "Apex Business Owner",
    "noteText": "Customer requested architectural shingle sample book.",
    "createdAt": "2026-10-27T16:00:00.000Z"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Unauthenticated request.
  - `403 Forbidden`: CSRF check failed or insufficient permissions.
  - `404 Not Found`: Lead ID does not exist.
  - `422 Unprocessable Entity`: `noteText` is empty, whitespace only, exceeds 2000 characters, or extra fields are supplied.

---

### 4.6. Business Settings Architecture Note
- **Public Business Info**: The public endpoint [`GET /api/v1/business/public-info`](#22-get-public-business-information) provides public company branding, contact details, operating hours, and service areas.
- **Administrative Editing Status**: **Not implemented as an in-app API endpoint**. Operational business settings are configured at deployment time via environment variables (`COMPANY_*`, `VITE_*`) and seeded into the `business_settings` database table during initial deployment (`npm run db:seed`). There are no authenticated `PUT /api/v1/business/settings` routes or in-app settings modification screens in the MVP.

---

## 5. Backend-to-n8n Webhook Contract (Transactional Outbox)

Outbound HTTP POST initiated by the backend Outbox Worker to trigger the n8n automation engine over the internal Docker network (`roofing_backend_net`).

- **Method**: `POST`
- **URL**: `${N8N_INTERNAL_URL}/webhook/roofing-lead-created` (e.g. `http://n8n:5678/webhook/roofing-lead-created`)
- **Headers**:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: [Configured N8N_WEBHOOK_SECRET]` (Evaluated at webhook boundary by n8n Header Auth)
  - `X-Idempotency-Key: [UUID v4 from outbox_events table]` (Evaluated for atomic claim acquisition)
- **Actual Event Payload Schema** (Dispatched from `backend/src/modules/leads/leads.service.ts`):
```json
{
  "leadId": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
  "customerName": "Jane Doe",
  "phone": "(555) 234-5678",
  "email": "jane.doe@example.com",
  "serviceType": "Roof Replacement",
  "propertyLocation": "123 Maple St, Dallas, TX 75201",
  "projectDescription": "Asphalt shingle roof is 22 years old and leaking around chimney.",
  "preferredContactMethod": "phone",
  "leadSource": "website_quote_form",
  "submissionDate": "2026-10-27T14:30:00.000Z",
  "companyName": "Apex Roofing Solutions",
  "dispatchEmail": "leads@apexroofingexample.com",
  "staffNotificationEmail": "owner@example-roofing.com"
}
```

- **Response Contracts**:
  - **Success (`200 OK`)**:
    ```json
    {
      "success": true,
      "status": "received",
      "confirmed": true,
      "idempotencyKey": "9d903e05-2b44-48f8-bca7-ec902b77543a",
      "leadId": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
      "processedAt": "2026-10-27T14:30:01.200Z"
    }
    ```
  - **Duplicate Previously Completed (`200 OK`)**:
    ```json
    {
      "success": true,
      "status": "already_processed",
      "idempotencyKey": "9d903e05-2b44-48f8-bca7-ec902b77543a",
      "leadId": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
      "message": "Event previously completed. Duplicate notification suppressed."
    }
    ```
  - **Unauthorized (`403 Forbidden`)**:
    ```
    Authorization data is wrong!
    ```
    *(Note: Upstream n8n artifact returns `WWW-Authenticate: Basic realm="Webhook"`, but evaluation is strictly Header Auth checking `X-Webhook-Secret`).*
  - **Concurrent Active Lease (`409 Conflict`)**:
    ```json
    {
      "success": false,
      "status": "in_flight",
      "message": "Event is currently being processed by another worker lease."
    }
    ```
  - **Validation Failure (`422 Unprocessable Entity`)**:
    ```json
    {
      "success": false,
      "error": {
        "code": "INVALID_IDEMPOTENCY_KEY",
        "message": "X-Idempotency-Key must be a valid UUID string"
      }
    }
    ```

- **Delivery Guarantee**: The outbox event and lead `automation_status` are only updated to `'delivered'` after the backend receives HTTP 200 OK. In the event of a timeout or non-200 error, the worker retries using the same `X-Idempotency-Key` with exponential backoff.

