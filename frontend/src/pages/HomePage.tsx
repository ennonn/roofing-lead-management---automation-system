import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  FileCheck2,
  HardHat,
  ArrowRight,
  Phone,
  Home as HomeIcon,
  Wrench,
  CloudLightning,
} from "lucide-react";
import { branding } from "../config/branding";
import {
  Button,
  EmergencyBanner,
  TrustBadges,
  ServiceCard,
  TestimonialCard,
} from "../components/common";
import { useDocumentHead } from "../hooks/useDocumentHead";

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  replacement: HomeIcon,
  repair: Wrench,
  storm: CloudLightning,
};

export const HomePage: React.FC = () => {
  useDocumentHead({
    title: `${branding.companyName} | Professional Roofing & Storm Damage Restoration`,
    description: `Expert residential and commercial roofing, leak repair, and storm damage restoration by ${branding.companyName}. Request a free inspection today.`,
  });

  const featuredServices = branding.services.slice(0, 3);
  const hasVerifiedTestimonials =
    branding.testimonials && branding.testimonials.length > 0;

  return (
    <div className="flex flex-col gap-12 sm:gap-16 pb-16">
      {/* 24/7 Emergency Dispatch Banner */}
      <EmergencyBanner phone={branding.emergencyPhone} />

      {/* Hero Section */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
        aria-labelledby="hero-heading"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 p-8 sm:p-12 lg:p-16 text-white shadow-xl">
          {/* Subtle geometric pattern overlay */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-sky-300 border border-sky-400/20 backdrop-blur-xs">
              <ShieldCheck className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>
                {branding.licenseNumber.includes("Placeholder")
                  ? "Licensed & Insured Roofing Specialist"
                  : `Contractor License: ${branding.licenseNumber}`}
              </span>
            </div>

            <h1
              id="hero-heading"
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
            >
              Roofing Built to Protect What Matters Most.
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              From emergency leak repairs and storm restoration to complete
              architectural shingle replacements, {branding.companyName} provides
              reliable craftsmanship, transparent scopes, and dependable service.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <Button
                variant="emergency"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
              >
                Request Free Roof Inspection
              </Button>

              <Button
                variant="outline"
                size="lg"
                href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
                leftIcon={<Phone className="h-4 w-4 text-sky-600" aria-hidden="true" />}
                className="bg-slate-900/60 text-white border-slate-700 hover:bg-slate-800 hover:border-slate-600"
              >
                Call: {branding.phone}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Trust Credentials Strip (Renders only if verified credentials exist) */}
      {branding.trustBadges && branding.trustBadges.length > 0 && (
        <TrustBadges badges={branding.trustBadges} />
      )}

      {/* Trust & Workmanship Pillars */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
        aria-labelledby="trust-pillars-heading"
      >
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2
            id="trust-pillars-heading"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            Built on Integrity, Safety & Skill
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Every project follows strict regional building codes, transparent documentation, and verified manufacturer standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 sm:p-8 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col items-start gap-4">
            <div
              className="w-12 h-12 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Itemized & Upfront Scopes
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Clear diagnostic reports with photos and detailed scope breakdowns before any work begins.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col items-start gap-4">
            <div
              className="w-12 h-12 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Code-Compliant Installation
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Rigorous ventilation, leak barrier underlayments, and precision fastening designed for high-wind stability.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col items-start gap-4">
            <div
              className="w-12 h-12 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Clean & Safe Job Sites
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Full magnetic sweeps to capture stray nails, shrubbery protection tarps, and complete daily debris haul-away.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services Section */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
        aria-labelledby="services-overview-heading"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2
              id="services-overview-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            >
              Comprehensive Roofing Solutions
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base max-w-xl">
              Engineered for residential homes and commercial structures facing harsh sun, hail, and high-wind conditions.
            </p>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700 hover:text-sky-800 transition-colors"
          >
            <span>View All Services</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredServices.map((service) => (
            <ServiceCard
              key={service.id}
              id={`service-${service.id}`}
              title={service.title}
              description={service.shortDescription}
              features={service.features}
              icon={serviceIcons[service.id]}
              ctaText="Explore Service"
              ctaHref={`/services#${service.id}`}
              highlighted={service.id === "replacement"}
            />
          ))}
        </div>
      </section>

      {/* Verified Customer Reviews Grid (Renders only if authentic reviews are configured) */}
      {hasVerifiedTestimonials && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
          aria-labelledby="testimonials-heading"
        >
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2
              id="testimonials-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            >
              What Homeowners Say
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              Verified feedback from property owners across our service territory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branding.testimonials?.map((t, idx) => (
              <TestimonialCard
                key={t.id || idx}
                authorName={t.authorName}
                quote={t.quote}
                location={t.location}
                serviceType={t.serviceType}
                rating={t.rating}
                isVerified={t.isVerified}
                isPlaceholder={t.isPlaceholder}
              />
            ))}
          </div>
        </section>
      )}

      {/* Final Call to Action */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
        aria-labelledby="cta-heading"
      >
        <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 lg:p-14 shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-2 text-center md:text-left">
            <h2
              id="cta-heading"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
            >
              Need an Honest Assessment of Your Roof?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Schedule a comprehensive on-site roof condition inspection with a dedicated specialist from {branding.companyName}.
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
              Request Free Estimate
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
        </div>
      </section>
    </div>
  );
};
