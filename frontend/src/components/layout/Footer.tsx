import React from "react";
import { Link } from "react-router-dom";
import { Shield, Phone, Mail, MapPin, Clock } from "lucide-react";
import { branding } from "../../config/branding";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Company Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">{branding.companyName}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {branding.tagline}. High-quality roof replacements, leak repairs, and emergency restorations with guaranteed craftsmanship.
            </p>
            <div className="text-xs text-slate-500">
              Contractor License: <span className="text-slate-400 font-mono">{branding.licenseNumber}</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white text-base font-semibold tracking-wider uppercase">Navigation</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">Roofing Services</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/service-areas" className="hover:text-white transition-colors">Service Areas</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">Request a Quote</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Service Coverage Areas */}
          <div className="space-y-4">
            <h3 className="text-white text-base font-semibold tracking-wider uppercase">Service Coverage</h3>
            <p className="text-xs text-slate-400">Proudly serving homeowners throughout:</p>
            <ul className="space-y-1.5 text-slate-300">
              {branding.serviceAreas.map((area) => (
                <li key={area} className="flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact & Hours */}
          <div className="space-y-4">
            <h3 className="text-white text-base font-semibold tracking-wider uppercase">Contact Details</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-300 font-medium">{branding.phone}</div>
                  {branding.emergencyPhone && branding.emergencyPhone.trim().length > 0 && (
                    <div className="text-xs text-amber-400 font-semibold">24/7 Emergency: {branding.emergencyPhone}</div>
                  )}
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-slate-300">{branding.email}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <span className="text-slate-300">{branding.address}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-400">
                  <div>Mon-Fri: {branding.businessHours.weekdays}</div>
                  <div>Sat: {branding.businessHours.saturday}</div>
                  <div>Sun: {branding.businessHours.sunday}</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {currentYear} {branding.companyName}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-slate-400 transition-colors">Contact Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
