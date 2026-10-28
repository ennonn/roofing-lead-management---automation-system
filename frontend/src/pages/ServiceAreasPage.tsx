import React from "react";
import { MapPin, CheckCircle, ArrowRight, Phone } from "lucide-react";
import { branding } from "../config/branding";
import { Button } from "../components/common";
import { useDocumentHead } from "../hooks/useDocumentHead";

export const ServiceAreasPage: React.FC = () => {
  useDocumentHead({
    title: `Service Areas | ${branding.companyName}`,
    description: `Explore the regional communities and municipalities serviced by ${branding.companyName} for residential and commercial roofing projects.`,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <header className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Regional Service Coverage</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Areas We Proudly Serve
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          {branding.companyName} provides professional roofing evaluations, leak repairs, storm restoration, and full roof installations across the following configured communities.
        </p>
      </header>

      {/* Coverage Grid */}
      <section aria-label="List of Service Areas">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branding.serviceAreas.map((area) => (
            <article
              key={area}
              className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{area}</h2>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full residential & commercial roofing services available throughout {area} and adjoining neighborhoods.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-700 flex items-center gap-1.5">
                <CheckCircle
                  className="w-4 h-4 text-emerald-600 shrink-0"
                  aria-hidden="true"
                />
                <span>Free on-site inspections & estimates</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Neighboring Communities Inquiry Callout */}
      <section
        className="rounded-2xl bg-slate-100 border border-slate-200 p-8 sm:p-10 flex flex-col lg:flex-row justify-between items-center gap-6"
        aria-labelledby="unlisted-areas-heading"
      >
        <div className="space-y-2 text-center lg:text-left max-w-xl">
          <h2
            id="unlisted-areas-heading"
            className="text-xl font-bold text-slate-900"
          >
            Don't See Your Specific Community Listed?
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            We routinely service properties in neighboring townships and zip codes. Contact our dispatch desk directly to confirm availability in your area.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
          <Button
            variant="outline"
            size="md"
            href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
            leftIcon={<Phone className="w-4 h-4 text-sky-600" aria-hidden="true" />}
            className="w-full sm:w-auto bg-white"
          >
            Call: {branding.phone}
          </Button>
          <Button
            variant="primary"
            size="md"
            href="/contact"
            rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
            className="w-full sm:w-auto"
          >
            Request Inspection
          </Button>
        </div>
      </section>
    </div>
  );
};
