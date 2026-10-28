import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Phone, Shield, Menu, X, ArrowRight } from "lucide-react";
import { branding } from "../../config/branding";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "About Us", path: "/about" },
    { name: "Service Areas", path: "/service-areas" },
    { name: "Contact / Quote", path: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200">
      {/* Top Banner: Emergency Contact (Only rendered when emergencyPhone is configured) */}
      {branding.emergencyPhone && branding.emergencyPhone.trim().length > 0 && (
        <div className="bg-slate-900 text-slate-200 text-xs sm:text-sm py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-medium text-slate-300">24/7 Emergency Storm Leak Response Available</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`tel:${branding.emergencyPhone.replace(/[^0-9+]/g, "")}`}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Emergency: {branding.emergencyPhone}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Company Identity */}
          <Link to="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-brand-primary rounded-lg p-1">
            <div className="w-10 h-10 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {branding.companyName}
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Licensed & Insured Roofing Specialist
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors duration-200 hover:text-sky-600 ${
                    isActive ? "text-sky-600 border-b-2 border-sky-600 pb-1" : "text-slate-600"
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Direct CTA Button */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4 text-sky-600" />
              <span>{branding.phone}</span>
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              <span>Get Free Quote</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-2" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive ? "bg-sky-50 text-sky-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </nav>
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <a
              href={`tel:${branding.phone.replace(/[^0-9+]/g, "")}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Phone className="w-4 h-4 text-sky-600" />
              <span>Call Us: {branding.phone}</span>
            </a>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
            >
              <span>Request a Free Quote</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
