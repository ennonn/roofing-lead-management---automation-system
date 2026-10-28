import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Phone,
} from "lucide-react";
import type { CreateLeadDto } from "@roofing/shared-types";
import { branding } from "../../config/branding";
import { Button } from "../common/Button";
import {
  validateQuoteForm,
  submitQuoteRequest,
  ApiValidationError,
  FormErrors,
  LeadSubmissionSuccessData,
} from "../../services/leads.service";

export interface QuoteFormProps {
  onSuccess?: (data: LeadSubmissionSuccessData) => void;
  className?: string;
}

const initialFormState: CreateLeadDto = {
  customerName: "",
  phone: "",
  email: "",
  serviceType: "",
  propertyLocation: "",
  projectDescription: "",
  preferredContactMethod: "phone",
  leadSource: "website_quote_form",
  _hp: "",
};

export const QuoteForm: React.FC<QuoteFormProps> = ({
  onSuccess,
  className = "",
}) => {
  const [formData, setFormData] = useState<CreateLeadDto>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<LeadSubmissionSuccessData | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear inline error on change
    if (fieldErrors[name as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleContactMethodChange = (method: "phone" | "email") => {
    setFormData((prev) => ({ ...prev, preferredContactMethod: method }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent duplicate submissions while an in-flight request is pending
    if (isSubmitting) return;

    setServerError(null);

    // 1. Client-Side Validation
    const validationErrors = validateQuoteForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setServerError("Please correct the highlighted fields below before submitting.");

      // Focus first error field for accessibility
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.focus();
      }
      return;
    }

    // 2. Submission to Backend API
    setIsSubmitting(true);
    try {
      const response = await submitQuoteRequest(formData);
      if (response.success && response.data) {
        setSuccessData(response.data);
        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiValidationError) {
        const mappedErrors: FormErrors = {};
        err.details.forEach((d) => {
          if (d.field) {
            mappedErrors[d.field as keyof FormErrors] = d.message;
          }
        });
        setFieldErrors(mappedErrors);
        setServerError("One or more fields did not meet our validation requirements. Please review your entries.");
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("An unexpected error occurred. Please try again or call our dispatch desk.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setFieldErrors({});
    setServerError(null);
    setSuccessData(null);
  };

  // ============================================================================
  // Success Confirmation State
  // ============================================================================
  if (successData) {
    return (
      <div
        className={`bg-emerald-50/80 border border-emerald-200 rounded-2xl p-8 sm:p-10 text-center space-y-6 shadow-sm ${className}`}
        role="region"
        aria-label="Quote Request Confirmation"
      >
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quote Request Received!
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Thank you, <strong className="text-slate-900">{formData.customerName}</strong>. Your roofing project details have been successfully received and recorded in our dispatch system.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 max-w-md mx-auto border border-emerald-200/80 text-left text-xs text-slate-600 space-y-2">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="font-semibold text-slate-700">Service:</span>
            <span>{formData.serviceType}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="font-semibold text-slate-700">Location:</span>
            <span>{formData.propertyLocation}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="font-semibold text-slate-700">Preferred Contact:</span>
            <span className="capitalize">{formData.preferredContactMethod}</span>
          </div>
          <div className="flex justify-between pt-1 font-mono text-[11px] text-slate-400">
            <span>Reference ID:</span>
            <span title={successData.leadId}>{successData.leadId.slice(0, 8)}...</span>
          </div>
        </div>

        <div className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          An authorized roofing specialist from <strong>{branding.companyName}</strong> will review your request and contact you shortly to confirm your inspection.
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="outline" size="md" onClick={handleReset}>
            Submit Another Project
          </Button>
          <Button
            variant="secondary"
            size="md"
            href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
            leftIcon={<Phone className="h-4 w-4 text-sky-400" aria-hidden="true" />}
          >
            Call Office: {branding.phone}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Active Interactive Form
  // ============================================================================
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`space-y-6 ${className}`}
      aria-labelledby="quote-form-title"
    >
      <div className="space-y-1">
        <h2
          id="quote-form-title"
          className="text-2xl font-bold text-slate-900 tracking-tight"
        >
          Request an On-Site Roofing Quote
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Complete project specifications with zero cost or obligation. We do not sell or share your contact data.
        </p>
      </div>

      {/* Top-level Server / Validation Error Banner */}
      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <div className="font-semibold">Submission Problem</div>
            <p className="text-xs text-rose-800 leading-relaxed">{serverError}</p>
          </div>
        </div>
      )}

      {/* Invisible Anti-Spam Honeypot Field */}
      <div
        style={{ display: "none" }}
        className="hidden"
        aria-hidden="true"
      >
        <label htmlFor="_hp">Do not fill this field if human</label>
        <input
          type="text"
          id="_hp"
          name="_hp"
          value={formData._hp || ""}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Customer Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="customerName"
            className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
          >
            Full Name <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="e.g. Jane Doe"
            autoComplete="name"
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.customerName)}
            aria-describedby={
              fieldErrors.customerName ? "customerName-error" : undefined
            }
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.customerName
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
            } disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          {fieldErrors.customerName && (
            <p
              id="customerName-error"
              role="alert"
              className="text-xs text-rose-600 font-medium"
            >
              {fieldErrors.customerName}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label
            htmlFor="phone"
            className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
          >
            Phone Number <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="e.g. (555) 234-5678"
            autoComplete="tel"
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.phone
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
            } disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          {fieldErrors.phone && (
            <p
              id="phone-error"
              role="alert"
              className="text-xs text-rose-600 font-medium"
            >
              {fieldErrors.phone}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Email Address */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
          >
            Email Address <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="e.g. jane.doe@example.com"
            autoComplete="email"
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
            } disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          {fieldErrors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-xs text-rose-600 font-medium"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Roofing Service Selection */}
        <div className="space-y-1.5">
          <label
            htmlFor="serviceType"
            className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
          >
            Service Requested <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <select
            id="serviceType"
            name="serviceType"
            value={formData.serviceType}
            onChange={handleChange}
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.serviceType)}
            aria-describedby={
              fieldErrors.serviceType ? "serviceType-error" : undefined
            }
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.serviceType
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
            } disabled:bg-slate-100 disabled:cursor-not-allowed`}
          >
            <option value="">Select a roofing service...</option>
            {branding.services.map((s) => (
              <option key={s.id} value={s.title}>
                {s.title}
              </option>
            ))}
            <option value="Other / Custom Evaluation">Other / Custom Evaluation</option>
          </select>
          {fieldErrors.serviceType && (
            <p
              id="serviceType-error"
              role="alert"
              className="text-xs text-rose-600 font-medium"
            >
              {fieldErrors.serviceType}
            </p>
          )}
        </div>
      </div>

      {/* Property Address / Location */}
      <div className="space-y-1.5">
        <label
          htmlFor="propertyLocation"
          className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
        >
          Property Address & City <span className="text-rose-500" aria-hidden="true">*</span>
        </label>
        <input
          type="text"
          id="propertyLocation"
          name="propertyLocation"
          value={formData.propertyLocation}
          onChange={handleChange}
          disabled={isSubmitting}
          placeholder="e.g. 123 Maple St, North County"
          autoComplete="street-address"
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.propertyLocation)}
          aria-describedby={
            fieldErrors.propertyLocation ? "propertyLocation-error" : undefined
          }
          className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
            fieldErrors.propertyLocation
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
          } disabled:bg-slate-100 disabled:cursor-not-allowed`}
        />
        {fieldErrors.propertyLocation && (
          <p
            id="propertyLocation-error"
            role="alert"
            className="text-xs text-rose-600 font-medium"
          >
            {fieldErrors.propertyLocation}
          </p>
        )}
      </div>

      {/* Preferred Contact Method */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
          Preferred Contact Method
        </span>
        <div className="flex items-center gap-6" role="radiogroup" aria-label="Preferred contact method">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 select-none">
            <input
              type="radio"
              name="preferredContactMethod"
              value="phone"
              checked={formData.preferredContactMethod === "phone"}
              onChange={() => handleContactMethodChange("phone")}
              disabled={isSubmitting}
              className="w-4 h-4 text-sky-600 border-slate-300 focus:ring-sky-500"
            />
            <span>Phone Call</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 select-none">
            <input
              type="radio"
              name="preferredContactMethod"
              value="email"
              checked={formData.preferredContactMethod === "email"}
              onChange={() => handleContactMethodChange("email")}
              disabled={isSubmitting}
              className="w-4 h-4 text-sky-600 border-slate-300 focus:ring-sky-500"
            />
            <span>Email</span>
          </label>
        </div>
      </div>

      {/* Project Description (Optional) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label
            htmlFor="projectDescription"
            className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
          >
            Project Notes & Symptoms (Optional)
          </label>
          <span className="text-[11px] text-slate-400">Max 1000 characters</span>
        </div>
        <textarea
          id="projectDescription"
          name="projectDescription"
          rows={3}
          value={formData.projectDescription || ""}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={1000}
          placeholder="Describe your roof condition, active leaks, age of current roof, or recent storm/hail activity..."
          aria-invalid={Boolean(fieldErrors.projectDescription)}
          aria-describedby={
            fieldErrors.projectDescription
              ? "projectDescription-error"
              : undefined
          }
          className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
            fieldErrors.projectDescription
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
          } disabled:bg-slate-100 disabled:cursor-not-allowed`}
        />
        {fieldErrors.projectDescription && (
          <p
            id="projectDescription-error"
            role="alert"
            className="text-xs text-rose-600 font-medium"
          >
            {fieldErrors.projectDescription}
          </p>
        )}
      </div>

      {/* Submit Action */}
      <div className="pt-2">
        <Button
          variant="emergency"
          size="lg"
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText="Submitting Quote Request..."
          rightIcon={<Send className="w-4 h-4" aria-hidden="true" />}
          className="shadow-sm"
        >
          Request Free Quote & Inspection
        </Button>
      </div>

      {/* Privacy & Guarantee Reassurance */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>No spam commitment. Your information is protected under our privacy policy.</span>
      </div>
    </form>
  );
};
