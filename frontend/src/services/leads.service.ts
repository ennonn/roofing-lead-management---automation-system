import type {
  CreateLeadDto,
  ApiResponse,
  ApiErrorDetail,
  LeadListQuery,
  LeadListResponse,
  LeadWithNotes,
  LeadStatus,
  LeadNote,
  Lead,
} from "@roofing/shared-types";

export interface FormErrors {
  customerName?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  propertyLocation?: string;
  projectDescription?: string;
  preferredContactMethod?: string;
  _hp?: string;
}

export interface LeadSubmissionSuccessData {
  leadId: string;
  status: string;
  submissionDate: string;
}

/**
 * Custom error class capturing structured 422 validation errors from the backend.
 */
export class ApiValidationError extends Error {
  public details: ApiErrorDetail[];

  constructor(message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiValidationError";
    this.details = details;
  }
}

/**
 * Resolves the API base URL from Vite environment or falls back to /api/v1.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "/api/v1";
}

/**
 * Pure client-side validation logic matching backend Zod schema rules exactly.
 */
export function validateQuoteForm(data: CreateLeadDto): FormErrors {
  const errors: FormErrors = {};

  // Customer Name: required, min 2, max 150
  const trimmedName = data.customerName ? data.customerName.trim() : "";
  if (!trimmedName) {
    errors.customerName = "Customer name is required";
  } else if (trimmedName.length < 2) {
    errors.customerName = "Name must be at least 2 characters";
  } else if (trimmedName.length > 150) {
    errors.customerName = "Name cannot exceed 150 characters";
  }

  // Phone: required, min 7, max 50, valid characters
  const trimmedPhone = data.phone ? data.phone.trim() : "";
  if (!trimmedPhone) {
    errors.phone = "Phone number is required";
  } else if (trimmedPhone.length < 7) {
    errors.phone = "Phone number is too short";
  } else if (trimmedPhone.length > 50) {
    errors.phone = "Phone number cannot exceed 50 characters";
  } else if (!/^[0-9()+\-\s.]+$/.test(trimmedPhone)) {
    errors.phone = "Please enter a valid phone number";
  }

  // Email: required, valid email, max 255
  const trimmedEmail = data.email ? data.email.trim() : "";
  if (!trimmedEmail) {
    errors.email = "Email address is required";
  } else if (trimmedEmail.length > 255) {
    errors.email = "Email cannot exceed 255 characters";
  } else if (
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)
  ) {
    errors.email = "Please provide a valid email address";
  }

  // Service Type: required, min 2, max 100
  const trimmedService = data.serviceType ? data.serviceType.trim() : "";
  if (!trimmedService) {
    errors.serviceType = "Service type is required";
  } else if (trimmedService.length < 2) {
    errors.serviceType = "Service type is required";
  } else if (trimmedService.length > 100) {
    errors.serviceType = "Service type cannot exceed 100 characters";
  }

  // Property Location: required, min 2, max 255
  const trimmedLocation = data.propertyLocation
    ? data.propertyLocation.trim()
    : "";
  if (!trimmedLocation) {
    errors.propertyLocation = "Property location/address is required";
  } else if (trimmedLocation.length < 2) {
    errors.propertyLocation = "Property location is required";
  } else if (trimmedLocation.length > 255) {
    errors.propertyLocation = "Property location cannot exceed 255 characters";
  }

  // Project Description: optional, max 1000
  if (data.projectDescription && data.projectDescription.trim().length > 1000) {
    errors.projectDescription =
      "Project description cannot exceed 1000 characters";
  }

  return errors;
}

/**
 * Submits a validated lead quote request to POST /api/v1/leads.
 * Handles HTTP 201 Created, 422 Validation Error, 429 Rate Limit, and Network Failures.
 */
export async function submitQuoteRequest(
  payload: CreateLeadDto
): Promise<ApiResponse<LeadSubmissionSuccessData>> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (_networkError) {
    throw new Error(
      "Unable to connect to the server. Please check your internet connection or call our office directly."
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // 1. Zod Validation Error (HTTP 422) or Paused Intake
    if (response.status === 422) {
      if (data?.error?.code === "QUOTE_INTAKE_PAUSED") {
        throw new Error(
          data.error.message ||
            "Quote requests are temporarily paused. Please contact our office by phone or check back later."
        );
      }
      if (data?.error?.details) {
        throw new ApiValidationError(
          data.error.message || "One or more input fields are invalid.",
          data.error.details
        );
      }
    }

    // 2. Rate Limit Exceeded (HTTP 429)
    if (response.status === 429) {
      throw new Error(
        data?.error?.message ||
          "Too many quote requests submitted from your network. Please wait a few minutes before trying again."
      );
    }

    // 3. General or Server Errors (HTTP 500, 400, etc.)
    throw new Error(
      data?.error?.message ||
        "An unexpected error occurred while processing your request. Please try again or call our office."
    );
  }

  return data as ApiResponse<LeadSubmissionSuccessData>;
}

// ==============================================================================
// Authenticated Lead Management API Services (Owner & Admin Dashboard)
// ==============================================================================

export class LeadApiError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 400, code: string = "LEAD_API_ERROR") {
    super(message);
    this.name = "LeadApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Fetches a paginated, filtered, and sorted list of leads via GET /api/v1/leads.
 * Supports request abort signals to cancel stale queries.
 */
export async function fetchLeads(
  query: LeadListQuery = {},
  signal?: AbortSignal
): Promise<LeadListResponse> {
  const baseUrl = getApiBaseUrl();
  const searchParams = new URLSearchParams();

  if (query.page !== undefined && query.page !== null) {
    searchParams.set("page", String(query.page));
  }
  if (query.limit !== undefined && query.limit !== null) {
    searchParams.set("limit", String(query.limit));
  }
  if (query.status) {
    searchParams.set("status", query.status);
  }
  if (query.search && query.search.trim().length > 0) {
    searchParams.set("search", query.search.trim());
  }
  if (query.sortBy) {
    searchParams.set("sortBy", query.sortBy);
  }
  if (query.sortOrder) {
    searchParams.set("sortOrder", query.sortOrder);
  }

  const queryString = searchParams.toString();
  const url = queryString ? `${baseUrl}/leads?${queryString}` : `${baseUrl}/leads`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new LeadApiError(
      "Unable to connect to the lead service. Please check your internet connection.",
      0,
      "NETWORK_ERROR"
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
        ? "You do not have permission to view leads."
        : "Failed to load leads from the server.");
    const code = payload?.error?.code || (response.status === 401 ? "UNAUTHORIZED" : "ERROR");
    throw new LeadApiError(message, response.status, code);
  }

  return payload.data as LeadListResponse;
}

/**
 * Retrieves full lead profile with chronological follow-up notes via GET /api/v1/leads/:id.
 */
export async function fetchLeadById(
  id: string,
  signal?: AbortSignal
): Promise<LeadWithNotes> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads/${encodeURIComponent(id)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new LeadApiError(
      "Unable to connect to the lead service. Please check your internet connection.",
      0,
      "NETWORK_ERROR"
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (response.status === 404
        ? "Lead not found."
        : response.status === 401
        ? "Your session has expired. Please sign in again."
        : "Failed to load lead details.");
    const code = payload?.error?.code || (response.status === 404 ? "NOT_FOUND" : "ERROR");
    throw new LeadApiError(message, response.status, code);
  }

  return payload.data as LeadWithNotes;
}

/**
 * Updates a lead's lifecycle status via PATCH /api/v1/leads/:id/status.
 * Attaches the CSRF protection header and sends session credentials.
 */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<{ lead: Partial<Lead>; message: string }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads/${encodeURIComponent(id)}/status`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
  } catch (_error: unknown) {
    throw new LeadApiError(
      "Unable to connect to update lead status. Please check your network connection.",
      0,
      "NETWORK_ERROR"
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
        ? "You do not have permission to update lead status."
        : response.status === 404
        ? "Lead not found."
        : "Failed to update lead status.");
    const code = payload?.error?.code || "UPDATE_STATUS_FAILED";
    throw new LeadApiError(message, response.status, code);
  }

  return {
    lead: payload.data,
    message: payload.message || `Lead status updated to '${status}'.`,
  };
}

/**
 * Appends a follow-up note to a lead via POST /api/v1/leads/:id/notes.
 * Sends CSRF protection header and session credentials.
 */
export async function addLeadNote(
  id: string,
  noteText: string
): Promise<LeadNote> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads/${encodeURIComponent(id)}/notes`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
      body: JSON.stringify({ noteText: noteText.trim() }),
    });
  } catch (_error: unknown) {
    throw new LeadApiError(
      "Unable to connect to add follow-up note. Please check your network connection.",
      0,
      "NETWORK_ERROR"
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
        ? "You do not have permission to add notes."
        : response.status === 404
        ? "Lead not found."
        : response.status === 422
        ? payload?.error?.details?.[0]?.message || "Invalid note content."
        : "Failed to create follow-up note.");
    const code = payload?.error?.code || "ADD_NOTE_FAILED";
    throw new LeadApiError(message, response.status, code);
  }

  return payload.data as LeadNote;
}

