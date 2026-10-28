// ==============================================================================
// Roofing Lead Management & Automation System — Shared Type Definitions
// ==============================================================================

export type LeadStatus =
  | "new"
  | "contacted"
  | "estimate_scheduled"
  | "won"
  | "lost";

export type AutomationStatus = "pending" | "delivered" | "failed";

export type PreferredContactMethod = "phone" | "email";

export type ServiceType =
  | "Roof Replacement"
  | "Roof Repair"
  | "Roof Inspection"
  | "Storm Damage Restoration"
  | "Commercial Roofing"
  | "Other";

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  serviceType: string;
  propertyLocation: string;
  projectDescription: string | null;
  preferredContactMethod: PreferredContactMethod;
  leadSource: string;
  status: LeadStatus;
  automationStatus: AutomationStatus;
  submissionDate: string;
  lastStatusUpdate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  customerName: string;
  phone: string;
  email: string;
  serviceType: ServiceType | string;
  propertyLocation: string;
  projectDescription?: string;
  preferredContactMethod?: PreferredContactMethod;
  leadSource?: string;
  _hp?: string; // Honeypot field
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorId: string | null;
  authorName?: string;
  noteText: string;
  createdAt: string;
}

export interface LeadListItem {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  serviceType: string;
  propertyLocation: string;
  status: LeadStatus;
  submissionDate: string;
  lastStatusUpdate: string;
  notesCount: number;
  createdAt: string;
}

export interface LeadWithNotes extends Lead {
  notes: LeadNote[];
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadListResponse {
  leads: LeadListItem[];
  pagination: PaginationMetadata;
}

export interface UpdateLeadStatusDto {
  status: LeadStatus;
}

export interface CreateLeadNoteDto {
  noteText: string;
}

export interface LeadListQuery {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
  sortBy?: "submissionDate" | "createdAt" | "customerName" | "status" | "lastStatusUpdate";
  sortOrder?: "asc" | "desc";
}

export type UserRole = "owner" | "admin" | "staff";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface BusinessHours {
  weekdays?: string;
  saturday?: string;
  sunday?: string;
  emergencyPolicy?: string;
  [key: string]: string | undefined;
}

export interface BusinessSettings {
  id: string;
  companyName: string;
  phone: string;
  emergencyPhone?: string | null;
  dispatchEmail: string;
  address?: string | null;
  serviceAreas: string[];
  businessHours: BusinessHours;
  licenseNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBusinessInfo {
  companyName: string;
  phone: string;
  emergencyPhone: string | null;
  dispatchEmail: string;
  serviceAreas: string[];
  businessHours: BusinessHours;
  licenseNumber: string | null;
}

export type OutboxStatus = "pending" | "processing" | "delivered" | "failed";

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  idempotencyKey: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  deliveredAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  last30Days: number;
  conversionRate: number;
  statusCounts: Record<LeadStatus, number>;
  urgentAttentionCount: number;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
