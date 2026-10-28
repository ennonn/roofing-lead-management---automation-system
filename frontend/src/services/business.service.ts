import type {
  PublicBusinessInfo,
  BusinessSettings,
  UpdateBusinessSettingsDto,
  ApiResponse,
  ApiErrorResponse,
} from "@roofing/shared-types";

const API_BASE = "/api/v1";

export class BusinessApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = "BusinessApiError";
  }
}

/**
 * Fetches public business operational info, branding, and availability notice.
 */
export async function fetchPublicBusinessInfo(
  signal?: AbortSignal
): Promise<PublicBusinessInfo> {
  const response = await fetch(`${API_BASE}/business/public-info`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }
    throw new BusinessApiError(
      response.status,
      errorData?.error?.code || "FETCH_FAILED",
      errorData?.error?.message || "Failed to load business information."
    );
  }

  const result: ApiResponse<PublicBusinessInfo> = await response.json();
  return result.data;
}

/**
 * Authenticated endpoint: Fetches full business settings for owner/admin dashboard.
 */
export async function fetchBusinessSettings(
  signal?: AbortSignal
): Promise<BusinessSettings> {
  const response = await fetch(`${API_BASE}/business/settings`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }
    throw new BusinessApiError(
      response.status,
      errorData?.error?.code || "FETCH_FAILED",
      errorData?.error?.message || "Failed to load business settings."
    );
  }

  const result: ApiResponse<BusinessSettings> = await response.json();
  return result.data;
}

/**
 * Authenticated endpoint: Updates business settings, operating hours, and availability.
 * CSRF-protected.
 */
export async function saveBusinessSettings(
  data: UpdateBusinessSettingsDto
): Promise<BusinessSettings> {
  const response = await fetch(`${API_BASE}/business/settings`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }
    throw new BusinessApiError(
      response.status,
      errorData?.error?.code || "UPDATE_FAILED",
      errorData?.error?.message || "Failed to save business settings.",
      errorData?.error?.details
    );
  }

  const result: ApiResponse<BusinessSettings> = await response.json();
  return result.data;
}
