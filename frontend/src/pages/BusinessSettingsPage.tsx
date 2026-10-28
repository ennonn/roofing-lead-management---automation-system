import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Plus,
  X,
  Eye,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBusinessInfo } from "../context/BusinessInfoContext";
import {
  fetchBusinessSettings,
  saveBusinessSettings,
  BusinessApiError,
} from "../services/business.service";
import type {
  BusinessSettings,
  AvailabilityStatus,
  UpdateBusinessSettingsDto,
  PublicAvailabilityInfo,
} from "@roofing/shared-types";
import { AvailabilityNoticeBanner } from "../components/common/AvailabilityNoticeBanner";

type TabId = "general" | "coverage" | "availability";

interface FormState {
  companyName: string;
  phone: string;
  emergencyPhone: string;
  dispatchEmail: string;
  address: string;
  licenseNumber: string;
  serviceAreas: string[];
  availabilityStatus: AvailabilityStatus;
  noticeHeadline: string;
  noticeBody: string;
  reopenAt: string; // YYYY-MM-DDTHH:mm formatted for input
  autoResume: boolean;
  acceptQuotesWhenUnavailable: boolean;
  timezone: string;
}

function isoToDatetimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    // format as YYYY-MM-DDTHH:mm local representation
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function datetimeLocalToIso(val: string): string | null {
  if (!val || val.trim() === "") return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export const BusinessSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshBusinessInfo } = useBusinessInfo();

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [initialSettings, setInitialSettings] = useState<BusinessSettings | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [newAreaInput, setNewAreaInput] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Confirmation modal state for pausing quote intake
  const [showPauseModal, setShowPauseModal] = useState(false);

  // Check if current user is authorized to mutate settings
  const isAuthorized = user?.role === "owner" || user?.role === "admin";

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchBusinessSettings();
      setInitialSettings(data);
      setFormState({
        companyName: data.companyName,
        phone: data.phone,
        emergencyPhone: data.emergencyPhone || "",
        dispatchEmail: data.dispatchEmail,
        address: data.address || "",
        licenseNumber: data.licenseNumber || "",
        serviceAreas: Array.isArray(data.serviceAreas) ? [...data.serviceAreas] : [],
        availabilityStatus: data.availabilityStatus || "available",
        noticeHeadline: data.noticeHeadline || "",
        noticeBody: data.noticeBody || "",
        reopenAt: isoToDatetimeLocal(data.reopenAt),
        autoResume: data.autoResume ?? false,
        acceptQuotesWhenUnavailable: data.acceptQuotesWhenUnavailable ?? true,
        timezone: data.timezone || "America/New_York",
      });
    } catch (err: unknown) {
      if (err instanceof BusinessApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load business settings.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Track dirty changes
  const isDirty = useMemo(() => {
    if (!initialSettings || !formState) return false;
    const initialIso = initialSettings.reopenAt ? new Date(initialSettings.reopenAt).toISOString() : "";
    const currentIso = formState.reopenAt ? datetimeLocalToIso(formState.reopenAt) || "" : "";

    const areasEqual =
      JSON.stringify(initialSettings.serviceAreas || []) ===
      JSON.stringify(formState.serviceAreas || []);

    return (
      formState.companyName !== initialSettings.companyName ||
      formState.phone !== initialSettings.phone ||
      formState.emergencyPhone !== (initialSettings.emergencyPhone || "") ||
      formState.dispatchEmail !== initialSettings.dispatchEmail ||
      formState.address !== (initialSettings.address || "") ||
      formState.licenseNumber !== (initialSettings.licenseNumber || "") ||
      !areasEqual ||
      formState.availabilityStatus !== initialSettings.availabilityStatus ||
      formState.noticeHeadline !== (initialSettings.noticeHeadline || "") ||
      formState.noticeBody !== (initialSettings.noticeBody || "") ||
      currentIso !== initialIso ||
      formState.autoResume !== initialSettings.autoResume ||
      formState.acceptQuotesWhenUnavailable !== initialSettings.acceptQuotesWhenUnavailable ||
      formState.timezone !== initialSettings.timezone
    );
  }, [initialSettings, formState]);

  const handleFieldChange = (
    field: keyof FormState,
    value: string | boolean | string[]
  ) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : null));
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setSuccessMessage(null);
  };

  const handleToggleQuoteIntake = () => {
    if (!formState) return;
    if (formState.acceptQuotesWhenUnavailable) {
      // Trying to pause quote intake: show warning confirmation modal
      setShowPauseModal(true);
    } else {
      // Resuming intake
      handleFieldChange("acceptQuotesWhenUnavailable", true);
    }
  };

  const confirmPauseQuoteIntake = () => {
    handleFieldChange("acceptQuotesWhenUnavailable", false);
    setShowPauseModal(false);
  };

  const handleAddServiceArea = () => {
    const trimmed = newAreaInput.trim();
    if (!trimmed || !formState) return;
    if (formState.serviceAreas.includes(trimmed)) {
      setNewAreaInput("");
      return;
    }
    handleFieldChange("serviceAreas", [...formState.serviceAreas, trimmed]);
    setNewAreaInput("");
  };

  const handleRemoveServiceArea = (areaToRemove: string) => {
    if (!formState) return;
    handleFieldChange(
      "serviceAreas",
      formState.serviceAreas.filter((a) => a !== areaToRemove)
    );
  };

  const handleReset = () => {
    if (!initialSettings) return;
    setFormState({
      companyName: initialSettings.companyName,
      phone: initialSettings.phone,
      emergencyPhone: initialSettings.emergencyPhone || "",
      dispatchEmail: initialSettings.dispatchEmail,
      address: initialSettings.address || "",
      licenseNumber: initialSettings.licenseNumber || "",
      serviceAreas: Array.isArray(initialSettings.serviceAreas)
        ? [...initialSettings.serviceAreas]
        : [],
      availabilityStatus: initialSettings.availabilityStatus || "available",
      noticeHeadline: initialSettings.noticeHeadline || "",
      noticeBody: initialSettings.noticeBody || "",
      reopenAt: isoToDatetimeLocal(initialSettings.reopenAt),
      autoResume: initialSettings.autoResume ?? false,
      acceptQuotesWhenUnavailable: initialSettings.acceptQuotesWhenUnavailable ?? true,
      timezone: initialSettings.timezone || "America/New_York",
    });
    setValidationErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState || !isAuthorized || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationErrors({});

    // Client-side pre-validations
    const errors: Record<string, string> = {};
    if (!formState.companyName.trim()) {
      errors.companyName = "Company name is required.";
    }
    if (!formState.phone.trim()) {
      errors.phone = "Phone number is required.";
    }
    if (!formState.dispatchEmail.trim()) {
      errors.dispatchEmail = "Dispatch email is required.";
    }
    if (
      formState.availabilityStatus === "temporarily_unavailable" &&
      formState.autoResume &&
      !formState.reopenAt
    ) {
      errors.reopenAt =
        "A valid reopening date and time is required when automatic reopening is enabled.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsSaving(false);
      setErrorMessage("Please correct the highlighted fields before saving.");
      return;
    }

    const payload: UpdateBusinessSettingsDto = {
      companyName: formState.companyName.trim(),
      phone: formState.phone.trim(),
      emergencyPhone: formState.emergencyPhone.trim() || null,
      dispatchEmail: formState.dispatchEmail.trim(),
      address: formState.address.trim() || null,
      licenseNumber: formState.licenseNumber.trim() || null,
      serviceAreas: formState.serviceAreas,
      availabilityStatus: formState.availabilityStatus,
      noticeHeadline: formState.noticeHeadline.trim() || null,
      noticeBody: formState.noticeBody.trim() || null,
      reopenAt:
        formState.availabilityStatus === "temporarily_unavailable"
          ? datetimeLocalToIso(formState.reopenAt)
          : null,
      autoResume:
        formState.availabilityStatus === "temporarily_unavailable"
          ? formState.autoResume
          : false,
      acceptQuotesWhenUnavailable: formState.acceptQuotesWhenUnavailable,
      timezone: formState.timezone,
    };

    try {
      const updated = await saveBusinessSettings(payload);
      setInitialSettings(updated);
      setFormState({
        companyName: updated.companyName,
        phone: updated.phone,
        emergencyPhone: updated.emergencyPhone || "",
        dispatchEmail: updated.dispatchEmail,
        address: updated.address || "",
        licenseNumber: updated.licenseNumber || "",
        serviceAreas: Array.isArray(updated.serviceAreas) ? [...updated.serviceAreas] : [],
        availabilityStatus: updated.availabilityStatus || "available",
        noticeHeadline: updated.noticeHeadline || "",
        noticeBody: updated.noticeBody || "",
        reopenAt: isoToDatetimeLocal(updated.reopenAt),
        autoResume: updated.autoResume ?? false,
        acceptQuotesWhenUnavailable: updated.acceptQuotesWhenUnavailable ?? true,
        timezone: updated.timezone || "America/New_York",
      });
      // Synchronize dynamic public cache across public site components
      await refreshBusinessInfo();
      setSuccessMessage("Business settings and public availability saved successfully.");
    } catch (err: unknown) {
      if (err instanceof BusinessApiError) {
        if (err.details && err.details.length > 0) {
          const detailMap: Record<string, string> = {};
          err.details.forEach((d) => {
            if (d.field) detailMap[d.field] = d.message;
          });
          setValidationErrors(detailMap);
        }
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to save settings. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-slate-400 text-sm">
          You do not have administrative privileges to view or edit business operational settings. Please contact your company administrator.
        </p>
      </div>
    );
  }

  if (isLoading || !formState) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        <div className="h-10 bg-slate-800 rounded-lg w-1/3" />
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl" />
      </div>
    );
  }

  // Build simulated preview info for the live notice preview banner
  const previewAvailability: PublicAvailabilityInfo = {
    status: formState.availabilityStatus,
    noticeHeadline: formState.noticeHeadline || null,
    noticeBody: formState.noticeBody || null,
    headline: formState.noticeHeadline || null,
    body: formState.noticeBody || null,
    reopenAt:
      formState.availabilityStatus === "temporarily_unavailable"
        ? datetimeLocalToIso(formState.reopenAt)
        : null,
    autoResume: formState.autoResume,
    acceptQuotesWhenUnavailable: formState.acceptQuotesWhenUnavailable,
    timezone: formState.timezone,
  };

  return (
    <div className="space-y-8" data-testid="business-settings-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Business Settings & Availability
            </h1>
            {isDirty && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Control dynamic company contact information and public availability notices live without redeploying.
          </p>
        </div>

        {/* Global Save Actions */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Settings Updated</div>
            <p className="text-xs text-emerald-300/90">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Update Failed</div>
            <p className="text-xs text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "general"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>General Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("coverage")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "coverage"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Service Areas & Hours</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("availability")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "availability"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Availability & Public Notices</span>
          {formState.availabilityStatus !== "available" && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ==================================================================== */}
        {/* TAB 1: General Information */}
        {/* ==================================================================== */}
        {activeTab === "general" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Company Identity & Public Contact</h2>
              <p className="text-xs text-slate-400">
                These contact details appear on the public website header, footer, quote confirmations, and automated client notifications.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Company Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="companyName" className="block text-xs font-semibold text-slate-300">
                  Business / Brand Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={formState.companyName}
                  onChange={(e) => handleFieldChange("companyName", e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    validationErrors.companyName ? "border-rose-500" : "border-slate-700"
                  }`}
                  placeholder="e.g. Apex Peak Roofing Specialists"
                />
                {validationErrors.companyName && (
                  <p className="text-xs text-rose-400">{validationErrors.companyName}</p>
                )}
              </div>

              {/* Office Phone */}
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-300">
                  Primary Office Phone <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="phone"
                    value={formState.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      validationErrors.phone ? "border-rose-500" : "border-slate-700"
                    }`}
                    placeholder="e.g. (555) 123-4567"
                  />
                </div>
                {validationErrors.phone && (
                  <p className="text-xs text-rose-400">{validationErrors.phone}</p>
                )}
              </div>

              {/* Emergency Phone */}
              <div className="space-y-1.5">
                <label htmlFor="emergencyPhone" className="block text-xs font-semibold text-slate-300">
                  24/7 Emergency Storm Leak Line <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-amber-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="emergencyPhone"
                    value={formState.emergencyPhone}
                    onChange={(e) => handleFieldChange("emergencyPhone", e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Leave empty if emergency service is not offered"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  If set, an emergency response call button will appear in the top banner. Leave empty to hide.
                </p>
              </div>

              {/* Dispatch Email */}
              <div className="space-y-1.5">
                <label htmlFor="dispatchEmail" className="block text-xs font-semibold text-slate-300">
                  Internal Lead Dispatch Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="dispatchEmail"
                    value={formState.dispatchEmail}
                    onChange={(e) => handleFieldChange("dispatchEmail", e.target.value)}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      validationErrors.dispatchEmail ? "border-rose-500" : "border-slate-700"
                    }`}
                    placeholder="leads@yourdomain.com"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Private operational email used for new quote notifications. Never exposed to public website visitors.
                </p>
                {validationErrors.dispatchEmail && (
                  <p className="text-xs text-rose-400">{validationErrors.dispatchEmail}</p>
                )}
              </div>

              {/* Contractor License Number */}
              <div className="space-y-1.5">
                <label htmlFor="licenseNumber" className="block text-xs font-semibold text-slate-300">
                  State Contractor License # <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="licenseNumber"
                    value={formState.licenseNumber}
                    onChange={(e) => handleFieldChange("licenseNumber", e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. ROC #349120"
                  />
                </div>
              </div>

              {/* Physical Business Address */}
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="address" className="block text-xs font-semibold text-slate-300">
                  Headquarters / Dispatch Office Address <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="address"
                    value={formState.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 1040 Industrial Pkwy, Suite 200, Phoenix, AZ 85001"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: Service Areas & Hours */}
        {/* ==================================================================== */}
        {activeTab === "coverage" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Covered Service Areas</h2>
                <p className="text-xs text-slate-400">
                  Municipalities and counties where your crews provide roofing estimates and emergency tarping.
                </p>
              </div>

              {/* Add Area Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newAreaInput}
                  onChange={(e) => setNewAreaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddServiceArea();
                    }
                  }}
                  placeholder="Enter city or neighborhood (e.g. Scottsdale, AZ)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddServiceArea}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Area</span>
                </button>
              </div>

              {/* Service Areas Tag Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {formState.serviceAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200"
                  >
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceArea(area)}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                      aria-label={`Remove ${area}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                {formState.serviceAreas.length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    No service areas specified. Add cities above to display them on your public site.
                  </p>
                )}
              </div>
            </div>

            {/* Business Hours Note / Deferred Scheduling */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Operational Business Hours</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Standard dispatch hours are currently loaded from company branding configuration (Monday–Friday: 7:00 AM – 6:00 PM; Saturday: 8:00 AM – 2:00 PM; Sunday: Closed / 24/7 Emergency Line).
                  </p>
                  <p className="text-xs text-slate-500">
                    Granular holiday schedules, shift overrides, and custom daily hours management are deferred to Milestone 13 to maintain architectural stability without premature complexity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: Availability & Public Notices */}
        {/* ==================================================================== */}
        {activeTab === "availability" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Business Availability Status</h2>
                <p className="text-xs text-slate-400">
                  Select your current operational state to broadcast notices and manage online quote intake.
                </p>
              </div>

              {/* Status Radio Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Available */}
                <label
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    formState.availabilityStatus === "available"
                      ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50"
                      : "bg-slate-800/50 border-slate-700/80 hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="availabilityStatus"
                    value="available"
                    checked={formState.availabilityStatus === "available"}
                    onChange={() => handleFieldChange("availabilityStatus", "available")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm font-bold text-white">Available</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Normal operations. Full website access, standard dispatching, and immediate quote requests.
                  </p>
                </label>

                {/* Temporarily Unavailable */}
                <label
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    formState.availabilityStatus === "temporarily_unavailable"
                      ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/50"
                      : "bg-slate-800/50 border-slate-700/80 hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="availabilityStatus"
                    value="temporarily_unavailable"
                    checked={formState.availabilityStatus === "temporarily_unavailable"}
                    onChange={() => handleFieldChange("availabilityStatus", "temporarily_unavailable")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-sm font-bold text-white">Temporarily Closed</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Storm delay, holiday closure, or maintenance. Allows scheduled reopening date and advisory notices.
                  </p>
                </label>

                {/* Unavailable Indefinitely */}
                <label
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    formState.availabilityStatus === "unavailable_indefinite"
                      ? "bg-rose-500/10 border-rose-500/50 ring-1 ring-rose-500/50"
                      : "bg-slate-800/50 border-slate-700/80 hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="availabilityStatus"
                    value="unavailable_indefinite"
                    checked={formState.availabilityStatus === "unavailable_indefinite"}
                    onChange={() => handleFieldChange("availabilityStatus", "unavailable_indefinite")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="text-sm font-bold text-white">Closed Indefinitely</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Long-term shutdown or seasonal hiatus. Notice displayed without any automated reopening date.
                  </p>
                </label>
              </div>

              {/* Notice Details (When not available) */}
              {formState.availabilityStatus !== "available" && (
                <div className="space-y-5 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-white">Public Notice Configuration</h3>

                  {/* Headline */}
                  <div className="space-y-1.5">
                    <label htmlFor="noticeHeadline" className="block text-xs font-semibold text-slate-300">
                      Notice Headline
                    </label>
                    <input
                      type="text"
                      id="noticeHeadline"
                      value={formState.noticeHeadline}
                      onChange={(e) => handleFieldChange("noticeHeadline", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g. Weather Advisory: Crews Paused During Severe Storm"
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-1.5">
                    <label htmlFor="noticeBody" className="block text-xs font-semibold text-slate-300">
                      Notice Body / Description
                    </label>
                    <textarea
                      id="noticeBody"
                      rows={3}
                      value={formState.noticeBody}
                      onChange={(e) => handleFieldChange("noticeBody", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                      placeholder="Provide helpful instructions for homeowners, expected timeline, or emergency contact directions."
                    />
                  </div>

                  {/* Reopening Time (only for temporarily_unavailable) */}
                  {formState.availabilityStatus === "temporarily_unavailable" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                      <div className="space-y-1.5">
                        <label htmlFor="reopenAt" className="block text-xs font-semibold text-slate-300">
                          Scheduled Reopening Date & Time
                        </label>
                        <div className="relative">
                          <input
                            type="datetime-local"
                            id="reopenAt"
                            value={formState.reopenAt}
                            onChange={(e) => handleFieldChange("reopenAt", e.target.value)}
                            className={`w-full px-3.5 py-2 rounded-xl bg-slate-900 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                              validationErrors.reopenAt ? "border-rose-500" : "border-slate-700"
                            }`}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Configured in timezone: <strong className="text-amber-400">{formState.timezone}</strong>
                        </p>
                        {validationErrors.reopenAt && (
                          <p className="text-xs text-rose-400">{validationErrors.reopenAt}</p>
                        )}
                      </div>

                      {/* Auto-Resume Toggle */}
                      <div className="flex items-center space-x-3 pt-6">
                        <input
                          type="checkbox"
                          id="autoResume"
                          checked={formState.autoResume}
                          onChange={(e) => handleFieldChange("autoResume", e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 focus:ring-offset-slate-900"
                        />
                        <label htmlFor="autoResume" className="text-xs font-medium text-slate-200 cursor-pointer">
                          Automatically resume normal availability once this time passes (Lazy safe transition)
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Quote Intake Toggle */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Online Quote Request Intake</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            formState.acceptQuotesWhenUnavailable
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {formState.acceptQuotesWhenUnavailable ? "Accepting" : "Paused"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                        {formState.acceptQuotesWhenUnavailable
                          ? "Homeowners can still submit quote requests while the notice is active, but will be shown an advisory of potential scheduling delay."
                          : "Online quote intake is completely suspended. The quote form is replaced with an informative notice and direct phone calling buttons."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleQuoteIntake}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                        formState.acceptQuotesWhenUnavailable
                          ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40"
                          : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                      }`}
                    >
                      {formState.acceptQuotesWhenUnavailable ? "Pause Intake" : "Enable Intake"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Notice Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-white text-sm font-bold">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Live Public Notice Preview</span>
              </div>
              <p className="text-xs text-slate-400">
                This banner will appear across public pages according to the current availability settings above.
              </p>

              <div className="pt-2">
                {formState.availabilityStatus === "available" ? (
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 text-center text-xs text-slate-500">
                    No active closure notice is displayed when business availability is set to Available.
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-700 shadow-sm">
                    <AvailabilityNoticeBanner
                      previewAvailability={previewAvailability}
                      dismissible={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Confirmation Modal: Pausing Quote Intake */}
      {showPauseModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 id="pause-modal-title" className="text-lg font-bold text-white">
                Pause Online Quote Requests?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When quote intake is paused, prospective customers visiting your website will not be able to submit new quote requests online. The quote form will be replaced with your contact phone numbers and advisory notice.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Existing leads in your dashboard and pending email notifications will not be affected.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Keep Accepting Quotes
              </button>
              <button
                type="button"
                onClick={confirmPauseQuoteIntake}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-md"
              >
                Confirm Pause Intake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
