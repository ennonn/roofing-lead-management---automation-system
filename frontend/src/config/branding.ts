// ==============================================================================
// White-Label Roofing Company Branding & Operational Configuration
// ==============================================================================
// Note: All values are white-label template defaults or read from public VITE_ env.
// Placeholders are explicitly identified per project requirements.
// ==============================================================================

import type { TrustBadgeItem } from "../components/common/TrustBadges";
import type { TestimonialCardProps } from "../components/common/TestimonialCard";

export interface RoofingServiceSummary {
  id: string;
  title: string;
  shortDescription: string;
  features?: string[];
}

export interface BrandingConfig {
  companyName: string;
  tagline: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  address: string;
  licenseNumber: string;
  serviceAreas: string[];
  businessHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  services: RoofingServiceSummary[];
  /**
   * Verified credentials and trust badges.
   * Items where isVerified !== true will be suppressed automatically.
   */
  trustBadges?: TrustBadgeItem[];
  /**
   * Verified customer testimonials.
   * If empty or undefined, the testimonial section is omitted cleanly.
   */
  testimonials?: TestimonialCardProps[];
}

export const branding: BrandingConfig = {
  companyName: import.meta.env.VITE_COMPANY_NAME || "Apex Roofing Solutions [Template]",
  tagline: import.meta.env.VITE_COMPANY_TAGLINE || "Professional Roofing & Storm Damage Restoration",
  phone: import.meta.env.VITE_DEFAULT_PHONE || "(555) 123-4567",
  emergencyPhone: import.meta.env.VITE_EMERGENCY_PHONE ?? "(555) 999-HELP",
  email: import.meta.env.VITE_DEFAULT_EMAIL || "contact@apexroofingexample.com",
  address: import.meta.env.VITE_COMPANY_ADDRESS || "100 Commercial Pkwy, Suite 200, Metro Area [Placeholder]",
  licenseNumber: import.meta.env.VITE_COMPANY_LICENSE || "LIC-ROOF-10928 [Placeholder]",
  serviceAreas: import.meta.env.VITE_SERVICE_AREAS
    ? import.meta.env.VITE_SERVICE_AREAS.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [
        "Metro Area",
        "North County",
        "South County",
        "East Suburbs",
        "West Suburbs",
      ],
  businessHours: {
    weekdays: import.meta.env.VITE_HOURS_WEEKDAYS || "7:00 AM - 6:00 PM",
    saturday: import.meta.env.VITE_HOURS_SATURDAY || "8:00 AM - 2:00 PM",
    sunday: import.meta.env.VITE_HOURS_SUNDAY || "Emergency Storm Dispatch Only",
  },
  services: [
    {
      id: "replacement",
      title: "Roof Replacement",
      shortDescription: "Complete architectural shingle, metal, and tile roof installations built to endure extreme weather.",
      features: [
        "Complete tear-off and roof decking structural inspection",
        "Architectural shingles, metal standing seam, and tile options",
        "Ice-and-water barrier and synthetic underlayment installation",
        "Thorough property cleanup with magnetic nail sweep",
      ],
    },
    {
      id: "repair",
      title: "Roof Repair",
      shortDescription: "Prompt, reliable repairs for missing shingles, persistent leaks, flashing failures, and storm damage.",
      features: [
        "Targeted leak diagnosis and water path tracing",
        "Damaged shingle and valley flashing replacement",
        "Chimney, skylight, and pipe collar resealing",
        "Immediate temporary tarping if active leaking occurs",
      ],
    },
    {
      id: "inspection",
      title: "Roof Inspection & Maintenance",
      shortDescription: "Comprehensive multi-point inspections with detailed condition reports for homeowners and buyers.",
      features: [
        "Detailed multi-point roofing system condition report",
        "High-resolution digital photo documentation",
        "Attic insulation and ventilation moisture assessment",
        "Certified storm and hail impact documentation",
      ],
    },
    {
      id: "storm",
      title: "Storm & Hail Damage Restoration",
      shortDescription: "Emergency tarping, hail damage assessments, and expert insurance claims documentation assistance.",
      features: [
        "Emergency tarping to protect interior finishes",
        "Itemized insurance claim damage mapping",
        "Direct coordination with insurance adjusters",
        "Wind-uplift and hail impact structural repairs",
      ],
    },
    {
      id: "commercial",
      title: "Commercial Roofing",
      shortDescription: "Flat roof coatings, TPO single-ply systems, and preventative maintenance contracts for commercial properties.",
      features: [
        "TPO, EPDM, and modified bitumen single-ply systems",
        "Elastomeric silicone fluid-applied restorative coatings",
        "Scheduled semi-annual commercial preventative maintenance",
        "Low-disruption installation scheduling for active facilities",
      ],
    },
  ],
  // Trust badges: Empty by default for unconfigured/unverified white-label deployments.
  // When an actual client configures verified credentials (isVerified: true), they will display.
  trustBadges: [],
  // Testimonials: Empty by default for unconfigured white-label deployments.
  // Testimonials are cleanly hidden rather than presenting fake reviews.
  testimonials: [],
};
