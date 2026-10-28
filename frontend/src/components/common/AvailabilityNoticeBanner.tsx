import React from "react";
import { AlertTriangle, Clock, Phone, Info } from "lucide-react";
import type { PublicAvailabilityInfo } from "@roofing/shared-types";

export interface AvailabilityNoticeBannerProps {
  availability?: PublicAvailabilityInfo;
  previewAvailability?: PublicAvailabilityInfo;
  emergencyPhone?: string | null;
  companyPhone?: string;
  className?: string;
  dismissible?: boolean;
}

export function formatReopenDate(
  isoDateStr: string,
  timeZone?: string
): string {
  try {
    const date = new Date(isoDateStr);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timeZone || "America/New_York",
    }).format(date);
  } catch {
    return isoDateStr;
  }
}

export const AvailabilityNoticeBanner: React.FC<AvailabilityNoticeBannerProps> = ({
  availability: propAvailability,
  previewAvailability,
  emergencyPhone,
  companyPhone,
  className = "",
}) => {
  const availability = previewAvailability || propAvailability;

  if (!availability || availability.status === "available") {
    return null;
  }

  const isTemporary = availability.status === "temporarily_unavailable";
  const headline =
    availability.headline ||
    (availability as any).noticeHeadline ||
    (isTemporary ? "Temporary Operational Notice" : "Important Business Notice");
  const body =
    availability.body ||
    (availability as any).noticeBody ||
    (isTemporary
      ? "Our office and roofing crews are temporarily unavailable. Normal operations will resume shortly."
      : "Our roofing services are currently paused. Please check back later.");

  const formattedReopen =
    isTemporary && availability.reopenAt
      ? formatReopenDate(availability.reopenAt, availability.timezone)
      : null;

  return (
    <div
      role="region"
      aria-label="Operational availability notice"
      data-testid="availability-notice-banner"
      className={`bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/30 text-slate-100 py-3.5 px-4 shadow-md ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base tracking-tight">
                {headline}
              </span>
              {isTemporary && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3" />
                  <span>Temporary Notice</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed max-w-3xl">
              {body}
            </p>
            {formattedReopen && (
              <div className="mt-1 text-xs text-amber-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Expected reopening: <strong>{formattedReopen}</strong>
                </span>
              </div>
            )}
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {availability.acceptQuotesWhenUnavailable
                  ? "Online quote requests submitted now will be answered in order received when we reopen."
                  : "Online quote intake is currently paused during this closure."}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Hotline Options */}
        <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          {emergencyPhone && emergencyPhone.trim().length > 0 && (
            <a
              href={`tel:${emergencyPhone.replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Emergency: {emergencyPhone}</span>
            </a>
          )}
          {!availability.acceptQuotesWhenUnavailable && companyPhone && companyPhone.trim().length > 0 && (
            <a
              href={`tel:${companyPhone.replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>Office: {companyPhone}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
