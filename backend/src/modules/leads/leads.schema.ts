import { z } from "zod";
import type { LeadStatus } from "@roofing/shared-types";

export const createLeadSchema = z.object({
  customerName: z
    .string({ required_error: "Customer name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(150, "Name cannot exceed 150 characters"),
  phone: z
    .string({ required_error: "Phone number is required" })
    .trim()
    .min(7, "Phone number is too short")
    .max(50, "Phone number cannot exceed 50 characters")
    .regex(/^[0-9()+\-\s.]+$/, "Please enter a valid phone number"),
  email: z
    .string({ required_error: "Email address is required" })
    .trim()
    .email("Please provide a valid email address")
    .max(255)
    .toLowerCase(),
  serviceType: z
    .string({ required_error: "Service type is required" })
    .trim()
    .min(2, "Service type is required")
    .max(100),
  propertyLocation: z
    .string({ required_error: "Property location/address is required" })
    .trim()
    .min(2, "Property location is required")
    .max(255),
  projectDescription: z
    .string()
    .trim()
    .max(1000, "Project description cannot exceed 1000 characters")
    .optional(),
  preferredContactMethod: z
    .enum(["phone", "email"])
    .default("phone"),
  leadSource: z
    .string()
    .trim()
    .max(50)
    .default("website_quote_form"),
  _hp: z
    .string()
    .optional(), // Invisible honeypot field. Must be empty.
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const listLeadsQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "Page must be a number" })
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a number" })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
  status: z
    .enum(["new", "contacted", "estimate_scheduled", "won", "lost"], {
      invalid_type_error: "Invalid status filter value",
    })
    .optional(),
  search: z
    .string()
    .trim()
    .max(100, "Search query cannot exceed 100 characters")
    .optional(),
  sortBy: z
    .enum(["submissionDate", "createdAt", "customerName", "status", "lastStatusUpdate"], {
      invalid_type_error: "Invalid sort column",
    })
    .default("submissionDate"),
  sortOrder: z
    .enum(["asc", "desc"], {
      invalid_type_error: "Invalid sort order. Must be 'asc' or 'desc'",
    })
    .default("desc"),
});

export type ListLeadsQueryInput = z.infer<typeof listLeadsQuerySchema>;

export const leadIdParamSchema = z.object({
  id: z.string().uuid("Invalid lead ID format. Must be a valid UUID."),
});

export type LeadIdParamInput = z.infer<typeof leadIdParamSchema>;

export const updateLeadStatusSchema = z
  .object({
    status: z.enum(
      ["new", "contacted", "estimate_scheduled", "won", "lost"],
      {
        required_error: "Status is required",
        invalid_type_error: "Invalid lead status. Must be one of: new, contacted, estimate_scheduled, won, lost",
      }
    ),
  })
  .strict("Unexpected fields in status update payload. Only 'status' is permitted.");

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const createLeadNoteSchema = z
  .object({
    noteText: z
      .string({ required_error: "Note content is required" })
      .trim()
      .min(1, "Note content cannot be empty")
      .max(2000, "Note content cannot exceed 2000 characters"),
  })
  .strict("Unexpected fields in note payload. Only 'noteText' is permitted.");

export type CreateLeadNoteInput = z.infer<typeof createLeadNoteSchema>;
