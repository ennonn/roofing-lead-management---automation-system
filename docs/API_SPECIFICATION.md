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

### 3.1. User Login
Authenticates an owner or staff member and sets the session cookie.

- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Rate Limit**: Max 10 attempts per 15 minutes per IP.
- **Request Body**:
```json
{
  "email": "owner@example-roofing.com",
  "password": "StrongPassword123!"
}
```
- **Response Headers**: `Set-Cookie: roofing_sid=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "18f97200-a681-4541-b847-a8e5786a51d8",
      "email": "owner@example-roofing.com",
      "fullName": "John Owner",
      "role": "owner"
    }
  },
  "message": "Login successful"
}
```

### 3.2. User Logout
Destroys the current server session and clears the cookie.

- **Method**: `POST`
- **Path**: `/api/v1/auth/logout`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 3.3. Get Current User Profile
Retrieves authentication state and user details for the frontend session check.

- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "18f97200-a681-4541-b847-a8e5786a51d8",
      "email": "owner@example-roofing.com",
      "fullName": "John Owner",
      "role": "owner"
    }
  }
}
```

---

## 4. Authenticated Dashboard Endpoints

### 4.1. Dashboard Overview Statistics
Computes real-time statistics directly from PostgreSQL records.

- **Method**: `GET`
- **Path**: `/api/v1/dashboard/stats`
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
- **Method**: `GET`
- **Path**: `/api/v1/leads`
- **Query Parameters**:
  - `status`: Filter by status (`new`, `contacted`, `estimate_scheduled`, `won`, `lost`).
  - `search`: Search query matching name, phone, or email.
  - `page`: Page number (default: 1).
  - `limit`: Items per page (default: 20, max: 100).
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

---

### 4.3. Get Lead Details
Retrieves full lead profile with chronological follow-up notes.

- **Method**: `GET`
- **Path**: `/api/v1/leads/:id`
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
    "notes": [
      {
        "id": "119842c2-8089-4bc5-827c-c820b9e8432a",
        "noteText": "Called customer. Scheduled on-site inspection for Thursday at 2:00 PM.",
        "authorName": "Bob Estimator",
        "createdAt": "2026-10-27T15:10:00.000Z"
      }
    ]
  }
}
```

---

### 4.4. Update Lead Status
Updates the lifecycle status of a lead.

- **Method**: `PATCH`
- **Path**: `/api/v1/leads/:id/status`
- **Request Body**:
```json
{
  "status": "estimate_scheduled"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
    "status": "estimate_scheduled",
    "lastStatusUpdate": "2026-10-27T15:20:00.000Z"
  },
  "message": "Lead status updated to 'estimate_scheduled'"
}
```

---

### 4.5. Add Follow-Up Note
Appends a timestamped follow-up note to a lead.

- **Method**: `POST`
- **Path**: `/api/v1/leads/:id/notes`
- **Request Body**:
```json
{
  "noteText": "Customer requested architectural shingle sample book."
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "99ea7831-52f1-432a-bc91-729910e118ba",
    "leadId": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
    "noteText": "Customer requested architectural shingle sample book.",
    "authorName": "John Owner",
    "createdAt": "2026-10-27T16:00:00.000Z"
  }
}
```

---

### 4.6. Business Settings Management (Owner/Admin Only)
- **Method**: `GET /api/v1/business/settings`
- **Method**: `PUT /api/v1/business/settings`
- **Request Body (`PUT`)**:
```json
{
  "companyName": "Apex Roofing Solutions",
  "phone": "(555) 123-4567",
  "emergencyPhone": "(555) 999-HELP",
  "dispatchEmail": "leads@apexroofingexample.com",
  "address": "400 Roofing Way, Suite 100, Dallas, TX 75201",
  "serviceAreas": ["Dallas County", "Collin County", "Denton County"],
  "businessHours": {
    "weekdays": "7:00 AM - 6:00 PM",
    "saturday": "8:00 AM - 3:00 PM"
  },
  "licenseNumber": "TX-ROOF-88291"
}
```

---

## 5. Backend-to-n8n Webhook Contract

Outbound HTTP POST initiated by the backend service to trigger n8n workflows over the internal Docker network.

- **Method**: `POST`
- **URL**: `${N8N_INTERNAL_URL}/webhook/roofing-lead-created`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: [Configured N8N_WEBHOOK_SECRET]`
- **Payload Schema**:
```json
{
  "eventId": "e98e4d29-14a5-48b0-8c29-37fbe01ba321",
  "eventType": "lead_created",
  "timestamp": "2026-10-27T14:30:00.000Z",
  "lead": {
    "id": "7b3b3a62-4217-48f8-b118-2ad16a69df4a",
    "customerName": "Jane Doe",
    "phone": "(555) 234-5678",
    "email": "jane.doe@example.com",
    "serviceType": "Roof Replacement",
    "propertyLocation": "123 Maple St, Dallas, TX 75201",
    "projectDescription": "Asphalt shingle roof is 22 years old and leaking around chimney.",
    "preferredContactMethod": "phone",
    "leadSource": "website_quote_form",
    "submissionDate": "2026-10-27T14:30:00.000Z"
  },
  "business": {
    "companyName": "Apex Roofing Solutions",
    "dispatchEmail": "leads@apexroofingexample.com",
    "phone": "(555) 123-4567"
  }
}
```
- **Expected Response**: `200 OK` with JSON body `{"status": "received"}` within 5000ms.
