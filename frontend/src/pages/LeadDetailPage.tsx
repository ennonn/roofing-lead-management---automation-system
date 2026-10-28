import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  User,
  MessageSquare,
  RefreshCw,
  Check,
} from "lucide-react";
import {
  fetchLeadById,
  updateLeadStatus,
  addLeadNote,
  LeadApiError,
} from "../services/leads.service";
import { LeadStatusBadge } from "../components/leads/LeadStatusBadge";
import type { LeadWithNotes, LeadStatus } from "@roofing/shared-types";

const STATUS_OPTIONS: { key: LeadStatus; label: string; description: string }[] = [
  {
    key: "new",
    label: "New",
    description: "Initial inquiry awaiting phone or email outreach",
  },
  {
    key: "contacted",
    label: "Contacted",
    description: "First outreach initiated with homeowner",
  },
  {
    key: "estimate_scheduled",
    label: "Estimate Scheduled",
    description: "In-person roof inspection booked on calendar",
  },
  {
    key: "won",
    label: "Won",
    description: "Roofing project proposal approved & contract awarded",
  },
  {
    key: "lost",
    label: "Lost",
    description: "Project canceled, customer chose competitor, or out-of-scope",
  },
];

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Main Lead Data
  const [lead, setLead] = useState<LeadWithNotes | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Status Change State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Note Submission State
  const [noteText, setNoteText] = useState<string>("");
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);

  // Fetch lead details
  const loadLead = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const data = await fetchLeadById(id);
      setLead(data);
    } catch (err: unknown) {
      if (err instanceof LeadApiError && err.status === 404) {
        setIsNotFound(true);
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to load lead details.";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  // Handle status update
  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead || !id || newStatus === lead.status || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    setStatusMessage(null);

    const previousStatus = lead.status;
    const previousUpdate = lead.lastStatusUpdate;

    // Optimistic status update with rollback safeguard
    setLead((prev) =>
      prev
        ? {
            ...prev,
            status: newStatus,
            lastStatusUpdate: new Date().toISOString(),
          }
        : null
    );

    try {
      const result = await updateLeadStatus(id, newStatus);
      setStatusMessage({
        type: "success",
        text: result.message || `Lead status updated to '${newStatus}'.`,
      });

      // Update with server confirmed timestamps
      setLead((prev) =>
        prev
          ? {
              ...prev,
              status: (result.lead.status as LeadStatus) || newStatus,
              lastStatusUpdate:
                result.lead.lastStatusUpdate || new Date().toISOString(),
              updatedAt: result.lead.updatedAt || new Date().toISOString(),
            }
          : null
      );
    } catch (err: unknown) {
      // Rollback optimistic state
      setLead((prev) =>
        prev
          ? {
              ...prev,
              status: previousStatus,
              lastStatusUpdate: previousUpdate,
            }
          : null
      );

      const message =
        err instanceof LeadApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update lead status.";
      setStatusMessage({ type: "error", text: message });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle note submission
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !lead) return;

    const trimmed = noteText.trim();
    if (!trimmed || trimmed.length > 2000 || isSubmittingNote) return;

    setIsSubmittingNote(true);
    setNoteError(null);
    setNoteSuccess(null);

    try {
      const createdNote = await addLeadNote(id, trimmed);
      // Append created note to state
      setLead((prev) =>
        prev
          ? {
              ...prev,
              notes: [...prev.notes, createdNote],
            }
          : null
      );

      // Clear textarea only on success
      setNoteText("");
      setNoteSuccess("Follow-up note saved successfully.");
    } catch (err: unknown) {
      // Input text is preserved on failure
      const message =
        err instanceof LeadApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to add note. Please try again.";
      setNoteError(message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" data-testid="lead-detail-loading">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-32 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // 404 Lead Not Found State
  if (isNotFound) {
    return (
      <div className="p-12 text-center bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4 max-w-lg mx-auto mt-8" data-testid="lead-not-found">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Lead Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested lead record could not be found. It may have been removed or the link is incorrect.
        </p>
        <Link
          to="/dashboard/leads"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Leads List</span>
        </Link>
      </div>
    );
  }

  // General Error State
  if (error || !lead) {
    return (
      <div className="p-8 text-center bg-slate-900/80 border border-red-900/40 rounded-2xl space-y-4 max-w-lg mx-auto mt-8" data-testid="lead-detail-error">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Unable to Load Lead</h2>
        <p className="text-sm text-slate-400">{error || "An error occurred."}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadLead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            to="/dashboard/leads"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <span>Back to Leads</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedSubmissionDate = new Date(lead.submissionDate).toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const formattedLastUpdate = new Date(lead.lastStatusUpdate).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const charCount = noteText.trim().length;
  const isNoteValid = charCount > 0 && charCount <= 2000;

  return (
    <div className="space-y-6" data-testid="lead-detail-page">
      {/* Navigation Breadcrumb / Back Link */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard/leads"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Leads List</span>
        </Link>

        <span className="text-xs text-slate-500 font-mono">
          ID: {lead.id}
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {lead.customerName}
              </h1>
              <LeadStatusBadge status={lead.status} size="md" />
            </div>

            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-amber-400">
                {lead.serviceType}
              </span>
              <span>&bull;</span>
              <span>Submitted {formattedSubmissionDate}</span>
            </p>
          </div>

          {/* Quick Contact Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Call {lead.phone}</span>
              </a>
            )}

            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Send Email</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Details (Left 2 cols) & Status/Actions (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Full Lead Profile & Follow-up Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Project Details Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-amber-400" />
              <span>Customer & Property Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Customer Name
                </span>
                <span className="text-slate-200 font-semibold">
                  {lead.customerName}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Property Location
                </span>
                <span className="text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{lead.propertyLocation}</span>
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Phone Number
                </span>
                <span className="text-slate-200">{lead.phone || "Not provided"}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Email Address
                </span>
                <span className="text-slate-200">{lead.email || "Not provided"}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Preferred Contact Method
                </span>
                <span className="text-slate-200 capitalize">
                  {lead.preferredContactMethod}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Lead Source
                </span>
                <span className="text-slate-200 font-mono text-xs">
                  {lead.leadSource}
                </span>
              </div>
            </div>

            {/* Project Description Block */}
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-500 font-medium block mb-2">
                Homeowner Project Description
              </span>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {lead.projectDescription ? (
                  lead.projectDescription
                ) : (
                  <span className="text-slate-500 italic">
                    No additional project notes provided by homeowner in quote request.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up Notes Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Follow-Up Notes</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {lead.notes.length}
                </span>
              </h2>
            </div>

            {/* Chronological Notes History */}
            <div className="space-y-3" data-testid="lead-notes-list">
              {lead.notes.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-950/50 border border-slate-800/60 text-slate-400 text-xs">
                  No follow-up notes recorded yet. Add the first note below to track homeowner conversations.
                </div>
              ) : (
                lead.notes.map((note) => {
                  const formattedNoteDate = new Date(note.createdAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>{note.authorName || "Staff Member"}</span>
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formattedNoteDate}</span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {note.noteText}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Follow-Up Note Form */}
            <form onSubmit={handleNoteSubmit} className="pt-4 border-t border-slate-800 space-y-3">
              <label htmlFor="lead-note-input" className="block text-xs font-semibold text-slate-300">
                Add Follow-Up Note
              </label>

              <div className="relative">
                <textarea
                  id="lead-note-input"
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={2000}
                  placeholder="Record phone conversation, customer estimate feedback, or inspection details..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors resize-y min-h-[80px]"
                />
              </div>

              {/* Form Footer: Character Count & Submit Button */}
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-mono ${
                    charCount > 1900
                      ? "text-red-400 font-bold"
                      : charCount > 1500
                      ? "text-amber-400"
                      : "text-slate-500"
                  }`}
                >
                  {charCount} / 2000 characters
                </span>

                <button
                  type="submit"
                  disabled={!isNoteValid || isSubmittingNote}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {isSubmittingNote ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </>
                  )}
                </button>
              </div>

              {/* Note Submission Feedback Alerts */}
              {noteError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{noteError}</span>
                </div>
              )}

              {noteSuccess && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{noteSuccess}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Lead Status Management & Quick Actions */}
        <div className="space-y-6">
          {/* Status Update Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Lead Status Lifecycle</span>
            </h2>

            <div>
              <span className="text-xs text-slate-500 font-medium block mb-1">
                Current Status
              </span>
              <LeadStatusBadge status={lead.status} size="md" />
              <span className="text-[11px] text-slate-500 block mt-1.5">
                Last updated {formattedLastUpdate}
              </span>
            </div>

            {/* Status Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label htmlFor="lead-status-select" className="block text-xs font-semibold text-slate-300">
                Update Status
              </label>

              <div className="space-y-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const isCurrent = lead.status === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={isUpdatingStatus || isCurrent}
                      onClick={() => handleStatusChange(opt.key)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        isCurrent
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-400 cursor-default"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700"
                      } ${isUpdatingStatus ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">{opt.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal leading-tight">
                          {opt.description}
                        </span>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 shrink-0 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Change Feedback */}
            {statusMessage && (
              <div
                role={statusMessage.type === "error" ? "alert" : "status"}
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                    : "bg-red-950/40 border border-red-800 text-red-300"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
