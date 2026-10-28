import type {
  LoginDto,
  AuthUser,
  DashboardStats,
  ApiResponse,
  ApiErrorResponse,
} from "@roofing/shared-types";
import { getApiBaseUrl } from "./leads.service";

export class AuthError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string = "AUTH_ERROR", status: number = 400) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Authenticates the user with email and password via POST /api/v1/auth/login.
 * Attaches the X-Requested-With header for CSRF protection and includes credentials for session cookies.
 */
export async function loginUser(credentials: LoginDto): Promise<AuthUser> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/auth/login`;

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
      body: JSON.stringify(credentials),
    });
  } catch (_networkError) {
    throw new AuthError(
      "Unable to connect to the authentication server. Please check your internet connection.",
      "NETWORK_ERROR",
      0
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<{ user: AuthUser }>
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const errorBody = payload as ApiErrorResponse | null;
    const errorCode = errorBody?.error?.code || "AUTH_FAILED";
    const errorMessage =
      errorBody?.error?.message ||
      (response.status === 401
        ? "Invalid email or password."
        : response.status === 429
        ? "Too many login attempts. Please wait 15 minutes before trying again."
        : "An unexpected authentication error occurred.");

    throw new AuthError(errorMessage, errorCode, response.status);
  }

  const successBody = payload as ApiResponse<{ user: AuthUser }>;
  return successBody.data.user;
}

/**
 * Terminates the active session via POST /api/v1/auth/logout.
 * Sends the CSRF protection header and requests cookie eviction.
 */
export async function logoutUser(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/auth/logout`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
    });
  } catch (_error) {
    // Gracefully ignore network errors on logout since client state will be purged regardless
  }
}

/**
 * Verifies the currently authenticated session identity via GET /api/v1/auth/session.
 * Returns null if the session is absent or expired (401 Unauthorized).
 */
export async function getActiveSession(): Promise<AuthUser | null> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/auth/session`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    if (response.status === 401 || !response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiResponse<{ user: AuthUser }>;
    return payload.data.user;
  } catch (_error) {
    return null;
  }
}

/**
 * Fetches dashboard summary statistics via GET /api/v1/dashboard/stats.
 * Requires an active owner or admin session.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/dashboard/stats`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });
  } catch (_networkError) {
    throw new Error(
      "Unable to connect to the dashboard statistics service. Please check your internet connection."
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<DashboardStats>
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const errorBody = payload as ApiErrorResponse | null;
    throw new Error(
      errorBody?.error?.message ||
        "Failed to load dashboard statistics. Please try refreshing the page."
    );
  }

  const successBody = payload as ApiResponse<DashboardStats>;
  return successBody.data;
}
