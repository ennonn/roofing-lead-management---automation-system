import React from "react";
import { ShieldCheck, Award, FileCheck, CheckCircle2, Star } from "lucide-react";

export type TrustBadgeCategory =
  | "license"
  | "insurance"
  | "warranty"
  | "certification"
  | "rating";

export interface TrustBadgeItem {
  id: string;
  title: string;
  description?: string;
  /**
   * Only badges where isVerified === true are rendered.
   * Unverified, pending, or unconfigured badges are hidden by default
   * to strictly prevent false advertising or unverified factual claims.
   */
  isVerified: boolean;
  verificationDetails?: string;
  badgeType?: TrustBadgeCategory;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TrustBadgesProps {
  badges?: TrustBadgeItem[];
  layout?: "strip" | "grid";
  className?: string;
}

const defaultIcons: Record<
  TrustBadgeCategory,
  React.ComponentType<{ className?: string }>
> = {
  license: FileCheck,
  insurance: ShieldCheck,
  warranty: Award,
  certification: CheckCircle2,
  rating: Star,
};

export const TrustBadges: React.FC<TrustBadgesProps> = ({
  badges = [],
  layout = "strip",
  className = "",
}) => {
  // Strict compliance: Filter OUT any badge that is unverified, missing, or has an empty title.
  // Never display unverified claims as factual statements.
  const verifiedBadges = badges.filter(
    (b) =>
      Boolean(b) &&
      b.isVerified === true &&
      typeof b.title === "string" &&
      b.title.trim().length > 0
  );

  // If there are no verified credentials configured, hide the component entirely.
  if (verifiedBadges.length === 0) {
    return null;
  }

  const containerClasses =
    layout === "grid"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      : "flex flex-wrap items-center justify-center gap-4 sm:gap-6";

  return (
    <section
      aria-label="Verified Credentials & Trust Badges"
      className={`py-6 px-4 bg-slate-50 border-y border-slate-200/80 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        <ul
          role="list"
          className={containerClasses}
          aria-label="Verified credential list"
        >
          {verifiedBadges.map((badge) => {
            const IconComponent =
              badge.icon ||
              (badge.badgeType ? defaultIcons[badge.badgeType] : ShieldCheck);

            return (
              <li
                key={badge.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200/70 shadow-xs hover:border-slate-300 transition-colors"
                aria-label={`Verified: ${badge.title}`}
              >
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-sky-50 text-sky-700 shrink-0"
                  aria-hidden="true"
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {badge.title}
                    </span>
                    <span
                      className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium bg-emerald-100 text-emerald-800 rounded-full shrink-0"
                      title="Verified Credential"
                    >
                      Verified
                    </span>
                  </div>
                  {badge.verificationDetails ? (
                    <span className="text-xs text-slate-500 truncate font-mono">
                      {badge.verificationDetails}
                    </span>
                  ) : badge.description ? (
                    <span className="text-xs text-slate-600 line-clamp-1">
                      {badge.description}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
