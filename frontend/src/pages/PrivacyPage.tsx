import React from "react";
import { ShieldCheck, Lock, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { branding } from "../config/branding";
import { useDocumentHead } from "../hooks/useDocumentHead";

export const PrivacyPage: React.FC = () => {
  useDocumentHead({
    title: `Privacy Policy & Data Security | ${branding.companyName}`,
    description: `Read ${branding.companyName}'s privacy policy regarding lead data collection, storage, operational use, and homeowner rights.`,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Page Header */}
      <header className="space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
          <span>Homeowner Privacy & Data Handling</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy & Lead Commitment
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Last Updated: October 2026 • Document Version: 1.0 • {branding.companyName}
        </p>
      </header>

      {/* Main Policy Content */}
      <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" aria-hidden="true" />
            <span>1. Information We Collect</span>
          </h2>
          <p>
            When you request an estimate, schedule an inspection, or contact {branding.companyName}, we collect only the information strictly required to evaluate and service your roofing project:
          </p>
          <ul className="space-y-1.5 pl-5 list-disc text-slate-600" role="list">
            <li>Customer full name and primary telephone number.</li>
            <li>Email address for estimate delivery and confirmation.</li>
            <li>Physical property address and municipality for on-site inspection dispatch.</li>
            <li>Requested roofing service type (e.g., replacement, repair, storm inspection).</li>
            <li>Project description and damage notes provided voluntarily by the homeowner.</li>
            <li>Technical security tokens (such as anti-bot honeypot verification) to prevent spam.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600 shrink-0" aria-hidden="true" />
            <span>2. How We Use Your Information</span>
          </h2>
          <p>
            Your information is used exclusively by authorized personnel at {branding.companyName} for operational fulfillment:
          </p>
          <ul className="space-y-1.5 pl-5 list-disc text-slate-600" role="list">
            <li>Contacting you by telephone or email to schedule roof evaluations.</li>
            <li>Preparing itemized scopes of work and formal project estimates.</li>
            <li>Coordinating on-site diagnostic inspections and crew dispatches.</li>
            <li>Communicating project timelines, warranty terms, and follow-up service.</li>
          </ul>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2 mt-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Zero Data Selling:</strong> We do not sell, rent, license, or trade homeowner personal information to third-party lead generators, marketing brokers, or advertising networks.
            </span>
          </div>
        </section>

        {/* Section 3 */}
        <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-sky-600 shrink-0" aria-hidden="true" />
            <span>3. Data Storage & Isolated Architecture</span>
          </h2>
          <p>
            Lead data is stored persistently in secure, isolated PostgreSQL database environments dedicated to {branding.companyName}. Each client deployment operates with separate data storage to prevent co-mingling of customer records.
          </p>
          <p>
            Internal operational notifications (such as dispatching email alerts to our on-call estimators) are processed via self-hosted workflow automation engines. All communications remain under the direct control of the roofing business.
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            4. Data Retention & Homeowner Privacy Rights
          </h2>
          <p>
            We retain lead records for the duration required to service your estimate, manage your active project, and support manufacturer warranty records.
          </p>
          <p>
            As a property owner, you have the right to:
          </p>
          <ul className="space-y-1.5 pl-5 list-disc text-slate-600" role="list">
            <li>Request a summary of the personal information stored in your project record.</li>
            <li>Request corrections to contact details or property notes.</li>
            <li>Request complete deletion of your lead record from our active system.</li>
          </ul>
          <p className="pt-2">
            To exercise these rights, please contact our privacy compliance desk by emailing{" "}
            <a href={`mailto:${branding.email}`} className="text-sky-600 font-semibold underline">
              {branding.email}
            </a>{" "}
            or calling our main office at{" "}
            <a href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`} className="text-sky-600 font-semibold underline">
              {branding.phone}
            </a>.
          </p>
        </section>

        {/* Section 5: Business-Specific Details Requiring Client Confirmation */}
        <section className="bg-amber-50/80 p-6 sm:p-8 rounded-xl border border-amber-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
            <h2>5. Business-Specific Details Requiring Client Confirmation</h2>
          </div>
          <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
            This policy template reflects the default technical architecture of the roofing lead management system. Before commercial production deployment, the specific business owner must confirm and supplement the following legal details:
          </p>
          <ul className="space-y-1.5 pl-5 list-disc text-xs sm:text-sm text-amber-900" role="list">
            <li>
              <strong>Registered Legal Entity:</strong> Confirmation of the official LLC or Corporate registration name and registered agent address.
            </li>
            <li>
              <strong>State-Specific Contractor Licensing:</strong> Inclusion of mandatory state licensing board disclosures and warranty record retention mandates.
            </li>
            <li>
              <strong>Regional Privacy Statutes:</strong> If serving property owners in jurisdictions with specific consumer privacy acts (such as California CCPA/CPRA, Texas, or Virginia), specific statutory notice clauses must be finalized.
            </li>
            <li>
              <strong>Third-Party Analytics:</strong> If external web analytics or conversion tracking scripts are added in subsequent milestones, cookie consent notices must be updated accordingly.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
