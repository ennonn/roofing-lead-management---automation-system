import React from "react";
import {
  Users,
  ShieldCheck,
  CheckCircle,
  FileCheck2,
  HardHat,
  Phone,
  ArrowRight,
} from "lucide-react";
import { branding } from "../config/branding";
import { Button, TrustBadges } from "../components/common";
import { useDocumentHead } from "../hooks/useDocumentHead";

export const AboutPage: React.FC = () => {
  useDocumentHead({
    title: `About Us | ${branding.companyName}`,
    description: `Learn about ${branding.companyName}'s workmanship philosophy, transparent estimation standards, and commitment to code-compliant roofing systems.`,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <header className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
          <Users className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
          <span>About {branding.companyName}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Craftsmanship, Transparency & Uncompromising Protection
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          At {branding.companyName}, we believe every homeowner deserves honest roof evaluations, clear line-item scopes, and code-compliant installations that endure extreme weather.
        </p>
      </header>

      {/* Verified Trust Badges (Only rendered if verified credentials are configured) */}
      {branding.trustBadges && branding.trustBadges.length > 0 && (
        <TrustBadges badges={branding.trustBadges} />
      )}

      {/* Workmanship Philosophy Grid */}
      <section aria-labelledby="workmanship-heading">
        <div className="max-w-2xl mb-8">
          <h2
            id="workmanship-heading"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            Our Workmanship Principles
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            No high-pressure sales tactics. No cutting corners on underlayment or ventilation. Just precision craftsmanship.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pillar 1 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div
              className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Code-Compliant Installation Standards
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Every roof installation adheres strictly to regional building codes and manufacturer specifications for wind-uplift and moisture containment.
            </p>
            <ul className="space-y-2.5 pt-2 text-xs text-slate-700" role="list">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Ice-and-water shield installed in all valleys and eaves</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Balanced intake and exhaust attic ventilation calculations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Heavy-duty drip edge along all eaves and rakes</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div
              className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Diagnostic & Itemized Scopes
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              We never quote blind estimates. Our roof inspections provide transparent digital photo documentation so you see exactly what our technicians see.
            </p>
            <ul className="space-y-2.5 pt-2 text-xs text-slate-700" role="list">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>High-resolution photos documenting shingle, valley, and flashing conditions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Detailed line-item pricing with zero surprise add-ons</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Objective repair-versus-replacement advice</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div
              className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <HardHat className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Job-Site Cleanliness & Safety
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              A roofing project shouldn't compromise your lawn, gardens, or driveway. We treat your property with the utmost respect from arrival to completion.
            </p>
            <ul className="space-y-2.5 pt-2 text-xs text-slate-700" role="list">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Heavy-duty tarps shielding landscaping, siding, and air conditioning units</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Multi-pass magnetic nail roller sweeps across driveways and grass</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Complete daily debris removal and dumpster staging</span>
              </li>
            </ul>
          </div>

          {/* Pillar 4 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div
              className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Clear Communication Throughout
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              You are assigned a dedicated project point of contact who keeps you informed before, during, and after your roofing project.
            </p>
            <ul className="space-y-2.5 pt-2 text-xs text-slate-700" role="list">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Direct phone and email contact with your designated estimator</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Pre-job walkthrough to review schedule and access points</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Post-installation inspection to ensure your complete satisfaction</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section
        className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6"
        aria-labelledby="about-cta-heading"
      >
        <div className="space-y-1 text-center md:text-left">
          <h2 id="about-cta-heading" className="text-2xl font-bold">
            Have Questions About Your Roof?
          </h2>
          <p className="text-slate-400 text-sm">
            Speak directly with an authorized roofing estimator at {branding.companyName}.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="emergency"
            size="md"
            href="/contact"
            rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
            className="w-full sm:w-auto"
          >
            Contact Our Team
          </Button>
          <Button
            variant="outline"
            size="md"
            href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
            leftIcon={<Phone className="w-4 h-4 text-sky-600" aria-hidden="true" />}
            className="w-full sm:w-auto bg-slate-800 text-white border-slate-700 hover:bg-slate-700 hover:text-white"
          >
            {branding.phone}
          </Button>
        </div>
      </section>
    </div>
  );
};
