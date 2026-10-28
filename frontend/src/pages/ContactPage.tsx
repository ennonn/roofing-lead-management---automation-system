import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { branding } from "../config/branding";
import { QuoteForm } from "../components/forms/QuoteForm";
import { useDocumentHead } from "../hooks/useDocumentHead";

export const ContactPage: React.FC = () => {
  useDocumentHead({
    title: `Contact & Free Quote Request | ${branding.companyName}`,
    description: `Contact ${branding.companyName} for emergency roofing repairs, roof inspections, or an itemized quote on architectural roof replacements.`,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Page Header */}
      <header className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
          <Phone className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
          <span>Contact & Quote Intake</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Get in Touch With Our Roofing Team
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          Whether you need immediate storm leak mitigation or wish to schedule an on-site evaluation for a replacement project, we are ready to assist.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Direct Office & Dispatch Info Card */}
        <aside
          className="lg:col-span-1 bg-slate-900 text-white rounded-2xl p-7 sm:p-8 space-y-6 shadow-md flex flex-col justify-between"
          aria-labelledby="dispatch-info-heading"
        >
          <div className="space-y-6">
            <div>
              <h2 id="dispatch-info-heading" className="text-xl font-bold">
                Direct Office & Dispatch
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Reach our team during operating hours or connect with dispatch for emergency services.
              </p>
            </div>

            <div className="space-y-4 text-sm" role="list">
              {/* Primary Phone */}
              <div className="flex items-start gap-3" role="listitem">
                <Phone className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-slate-400">General Inquiries & Office</div>
                  <a
                    href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
                    className="font-semibold text-white hover:text-sky-300 transition-colors"
                    aria-label={`Call office at ${branding.phone}`}
                  >
                    {branding.phone}
                  </a>
                </div>
              </div>

              {/* Emergency Phone */}
              {branding.emergencyPhone && (
                <div className="flex items-start gap-3" role="listitem">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-amber-400 font-bold">
                      24/7 Emergency Storm Line
                    </div>
                    <a
                      href={`tel:${branding.emergencyPhone.replace(/[^0-9+]/g, "")}`}
                      className="font-bold text-amber-300 hover:text-amber-200 transition-colors"
                      aria-label={`Call emergency line at ${branding.emergencyPhone}`}
                    >
                      {branding.emergencyPhone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="flex items-center gap-3" role="listitem">
                <Mail className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-slate-400">Estimating & Inquiries</div>
                  <a
                    href={`mailto:${branding.email}`}
                    className="text-slate-200 hover:text-white transition-colors"
                  >
                    {branding.email}
                  </a>
                </div>
              </div>

              {/* Physical Address */}
              <div className="flex items-start gap-3" role="listitem">
                <MapPin className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-slate-400">Headquarters</div>
                  <span className="text-slate-300">{branding.address}</span>
                </div>
              </div>

              {/* Business Hours */}
              <div className="flex items-start gap-3 pt-4 border-t border-slate-800" role="listitem">
                <Clock className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-white">Business Hours:</div>
                  <div>Mon-Fri: {branding.businessHours.weekdays}</div>
                  <div>Saturday: {branding.businessHours.saturday}</div>
                  <div>Sunday: {branding.businessHours.sunday}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              {branding.licenseNumber.includes("Placeholder")
                ? "Licensed Contractor (Template Default)"
                : `License: ${branding.licenseNumber}`}
            </span>
          </div>
        </aside>

        {/* Interactive Quote Form */}
        <section
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 lg:p-10 shadow-xs"
          aria-labelledby="quote-form-title"
        >
          <QuoteForm />
        </section>
      </div>
    </div>
  );
};
