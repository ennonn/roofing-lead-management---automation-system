import React, { useState } from "react";
import { PhoneCall, AlertTriangle, X } from "lucide-react";
import { Button } from "./Button";

export interface EmergencyBannerProps {
  phone?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Normalizes phone string into a valid tel: URI.
 * Preserves alphanumeric characters and leading '+'.
 * Returns empty string if invalid or empty.
 */
export const formatTelUri = (phone?: string): string => {
  if (!phone || typeof phone !== "string") return "";
  const cleaned = phone.trim().replace(/[^\w+]/g, "");
  return cleaned.length > 0 ? `tel:${cleaned}` : "";
};

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  phone,
  title = "24/7 Emergency Storm & Leak Response",
  subtitle = "Active roof leak or severe storm damage? Our rapid dispatch crew is available around the clock.",
  ctaText = "Call Emergency Crew",
  dismissible = false,
  onDismiss,
  className = "",
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Missing-phone behavior: If no valid phone is provided, do NOT render a broken tel: link or banner.
  const telUri = formatTelUri(phone);
  if (!phone || phone.trim().length === 0 || !telUri || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <aside
      role="complementary"
      aria-label="Emergency Roofing Support"
      className={`bg-amber-500 text-slate-950 border-b border-amber-600 shadow-sm relative z-20 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span
              className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-950 text-amber-400 shrink-0 shadow-xs"
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <div className="font-bold text-sm sm:text-base tracking-tight text-slate-950">
                {title}
              </div>
              <p className="text-xs sm:text-sm text-slate-900 leading-tight">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              href={telUri}
              leftIcon={<PhoneCall className="h-4 w-4" aria-hidden="true" />}
              aria-label={`${ctaText} at ${phone}`}
              className="font-bold shadow-xs whitespace-nowrap min-h-[40px]"
            >
              <span className="sm:inline">{ctaText}:</span>{" "}
              <span className="underline decoration-amber-400">{phone}</span>
            </Button>

            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-md text-slate-900 hover:text-slate-950 hover:bg-amber-400/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 transition-colors"
                aria-label="Dismiss emergency notice"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
