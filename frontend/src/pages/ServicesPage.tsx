import React from "react";
import {
  Wrench,
  Home as HomeIcon,
  Search,
  CloudLightning,
  Building2,
  ShieldCheck,
  Phone,
  ArrowRight,
} from "lucide-react";
import { branding } from "../config/branding";
import { ServiceCard, Button } from "../components/common";
import { useDocumentHead } from "../hooks/useDocumentHead";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  replacement: HomeIcon,
  repair: Wrench,
  inspection: Search,
  storm: CloudLightning,
  commercial: Building2,
};

export const ServicesPage: React.FC = () => {
  useDocumentHead({
    title: `Roofing Services | ${branding.companyName}`,
    description: `Complete residential and commercial roofing services: replacement, repair, storm damage restoration, and certified inspections by ${branding.companyName}.`,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Page Header */}
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
          <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Professional Roofing Solutions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Engineered for Weather Durability & Long-Term Protection
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          From diagnostic storm restoration to complete architectural installations, {branding.companyName} applies manufacturer-certified installation practices to keep your property secure.
        </p>
      </header>

      {/* Services Grid */}
      <section aria-label="Available Roofing Services">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {branding.services.map((service) => (
            <ServiceCard
              key={service.id}
              id={service.id}
              title={service.title}
              description={service.shortDescription}
              features={service.features}
              icon={iconMap[service.id] || ShieldCheck}
              ctaText="Request Free Estimate"
              ctaHref="/contact"
              highlighted={service.id === "replacement"}
            />
          ))}
        </div>
      </section>

      {/* Materials & Guarantee Banner */}
      <section
        className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-8"
        aria-labelledby="services-cta-heading"
      >
        <div className="max-w-2xl space-y-3 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Dedicated Estimators & Clear Scopes</span>
          </div>
          <h2
            id="services-cta-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
          >
            Not Sure Which Roofing Service Fits Your Situation?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Our diagnostic inspectors evaluate attic ventilation, decking integrity, and water runoff to provide an honest recommendation on repair versus replacement.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
          <Button
            variant="emergency"
            size="md"
            href="/contact"
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            className="w-full sm:w-auto"
          >
            Schedule Free Inspection
          </Button>
          <Button
            variant="outline"
            size="md"
            href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
            leftIcon={<Phone className="h-4 w-4 text-sky-600" aria-hidden="true" />}
            className="w-full sm:w-auto bg-slate-800 text-white border-slate-700 hover:bg-slate-700 hover:text-white"
          >
            Call: {branding.phone}
          </Button>
        </div>
      </section>
    </div>
  );
};
