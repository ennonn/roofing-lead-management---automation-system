import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "./Button";

export interface ServiceCardProps {
  id?: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  features?: string[];
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  highlighted?: boolean;
  className?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  id,
  title,
  description,
  icon: IconComponent,
  features = [],
  ctaText = "Learn More",
  ctaHref,
  onCtaClick,
  highlighted = false,
  className = "",
}) => {
  return (
    <article
      id={id}
      className={`flex flex-col justify-between rounded-xl bg-white p-6 sm:p-8 transition-shadow duration-200 border ${
        highlighted
          ? "border-sky-500 shadow-md ring-1 ring-sky-500/20"
          : "border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300"
      } ${className}`}
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      <div>
        {IconComponent && (
          <div
            className={`flex items-center justify-center h-12 w-12 rounded-lg mb-5 ${
              highlighted
                ? "bg-sky-600 text-white"
                : "bg-sky-50 text-sky-700"
            }`}
            aria-hidden="true"
          >
            <IconComponent className="h-6 w-6" />
          </div>
        )}

        <h3
          id={id ? `${id}-heading` : undefined}
          className="text-xl font-bold text-slate-900 tracking-tight mb-2"
        >
          {title}
        </h3>

        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          {description}
        </p>

        {features.length > 0 && (
          <div className="mb-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Included Services
            </h4>
            <ul
              role="list"
              className="space-y-2.5 text-sm text-slate-700"
              aria-label={`Key features of ${title}`}
            >
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span
                    className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="pt-4 mt-auto">
        <Button
          variant={highlighted ? "primary" : "outline"}
          href={ctaHref}
          onClick={onCtaClick}
          fullWidth
          rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          aria-label={`${ctaText} for ${title}`}
        >
          {ctaText}
        </Button>
      </div>
    </article>
  );
};
