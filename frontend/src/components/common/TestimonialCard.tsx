import React from "react";
import { Star, CheckCircle2, Quote } from "lucide-react";

export interface TestimonialCardProps {
  id?: string;
  authorName: string;
  quote: string;
  location?: string;
  serviceType?: string;
  date?: string;
  /**
   * Star rating (1 to 5).
   * If omitted, undefined, or null, rating stars are completely hidden.
   * Never display fabricated or unverified ratings.
   */
  rating?: number;
  /**
   * Only displays "Verified Customer" if strictly true.
   * Never display unverified reviews as verified.
   */
  isVerified?: boolean;
  /**
   * If true, explicitly tags the card as a development placeholder/sample
   * to strictly comply with advertising truthfulness standards.
   */
  isPlaceholder?: boolean;
  className?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  id,
  authorName,
  quote,
  location,
  serviceType,
  date,
  rating,
  isVerified = false,
  isPlaceholder = false,
  className = "",
}) => {
  // Validate rating: only consider valid if number between 1 and 5
  const hasValidRating =
    typeof rating === "number" &&
    !isNaN(rating) &&
    rating >= 1 &&
    rating <= 5;

  return (
    <figure
      id={id}
      className={`flex flex-col justify-between rounded-xl bg-white p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative ${className}`}
    >
      <div>
        {/* Placeholder flag if active */}
        {isPlaceholder && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
              [Sample Testimonial]
            </span>
          </div>
        )}

        {/* Rating stars if provided and verified */}
        {hasValidRating && (
          <div
            className="flex items-center gap-1 mb-4 text-amber-500"
            role="img"
            aria-label={`${rating} out of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((starIndex) => (
              <Star
                key={starIndex}
                className={`h-4 w-4 ${
                  starIndex <= Math.round(rating)
                    ? "fill-amber-400 text-amber-500"
                    : "text-slate-200 fill-slate-100"
                }`}
                aria-hidden="true"
              />
            ))}
            <span className="text-xs font-semibold text-slate-700 ml-1.5">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Quote content */}
        <blockquote className="relative">
          <Quote
            className="h-6 w-6 text-slate-200 -mt-1 mb-2 select-none"
            aria-hidden="true"
          />
          <p className="text-slate-700 text-sm sm:text-base leading-relaxed italic">
            "{quote}"
          </p>
        </blockquote>
      </div>

      {/* Attribution and Verification Details */}
      <figcaption className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-900">
              {authorName}
            </span>
            {isVerified && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60"
                aria-label="Verified Customer Review"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                <span>Verified</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            {location && <span>{location}</span>}
            {location && serviceType && <span aria-hidden="true">•</span>}
            {serviceType && <span>{serviceType}</span>}
          </div>
        </div>

        {date && (
          <time
            dateTime={date}
            className="text-xs text-slate-400 shrink-0 font-mono"
          >
            {date}
          </time>
        )}
      </figcaption>
    </figure>
  );
};
