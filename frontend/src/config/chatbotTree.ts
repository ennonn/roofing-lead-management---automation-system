import type { BrandingConfig } from "./branding";

export interface ChatOption {
  id: string;
  label: string;
  targetNodeId: string;
}

export interface ChatAction {
  type: "link" | "tel" | "menu" | "restart";
  label: string;
  href?: string;
  targetNodeId?: string;
}

export interface ChatNode {
  id: string;
  title: string;
  botMessage: string[];
  options?: ChatOption[];
  actions?: ChatAction[];
}

export type ChatbotTree = Record<string, ChatNode>;

/**
 * Converts vanity letters (e.g. HELP -> 4357) to standard telephone keypad digits.
 */
export function convertVanityToDigits(phone: string): string {
  const map: Record<string, string> = {
    A: "2", B: "2", C: "2",
    D: "3", E: "3", F: "3",
    G: "4", H: "4", I: "4",
    J: "5", K: "5", L: "5",
    M: "6", N: "6", O: "6",
    P: "7", Q: "7", R: "7", S: "7",
    T: "8", U: "8", V: "8",
    W: "9", X: "9", Y: "9", Z: "9",
  };
  return phone.toUpperCase().replace(/[A-Z]/g, (char) => map[char] || char);
}

/**
 * Validates whether a phone string contains at least 7 digits (including converted vanity letters).
 */
export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false;
  const converted = convertVanityToDigits(phone);
  const digits = converted.replace(/\D/g, "");
  return digits.length >= 7;
}

/**
 * Normalizes phone numbers into standard dialable tel: URLs.
 */
export function sanitizeTelHref(phone: string): string {
  const converted = convertVanityToDigits(phone);
  const cleaned = converted.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

/**
 * Constructs the deterministic decision tree using verified branding configuration.
 * Avoids inventing pricing, warranties, or unverified claims.
 */
export function buildChatbotTree(config: BrandingConfig): ChatbotTree {
  const companyName = config.companyName || "Our Roofing Team";
  const phone = isValidPhoneNumber(config.phone) ? config.phone : "";
  const emergencyPhone = isValidPhoneNumber(config.emergencyPhone)
    ? config.emergencyPhone
    : phone;
  const hasPhone = Boolean(phone);
  const hasEmergencyPhone = Boolean(emergencyPhone);
  const serviceAreasList =
    config.serviceAreas && config.serviceAreas.length > 0
      ? config.serviceAreas.join(", ")
      : "our local service regions";

  const tree: ChatbotTree = {
    // --------------------------------------------------------------------------
    // ROOT / MAIN MENU
    // --------------------------------------------------------------------------
    root: {
      id: "root",
      title: "Main Menu",
      botMessage: [
        `Hello! Welcome to ${companyName}. I am your automated roofing assistant.`,
        "How can we help you today? Please choose an option below to learn more, check emergency guidance, or request an estimate.",
      ],
      options: [
        { id: "opt-repair", label: "Roof Repair", targetNodeId: "repair" },
        { id: "opt-replacement", label: "Roof Replacement", targetNodeId: "replacement" },
        { id: "opt-inspection", label: "Roof Inspection & Maintenance", targetNodeId: "inspection" },
        { id: "opt-emergency", label: "Storm & Emergency Damage", targetNodeId: "emergency" },
        { id: "opt-commercial", label: "Commercial Roofing", targetNodeId: "commercial" },
        { id: "opt-areas", label: "Service Areas", targetNodeId: "service-areas" },
        { id: "opt-quote", label: "Request an Estimate", targetNodeId: "quote" },
        { id: "opt-contact", label: "Speak with the Company", targetNodeId: "contact" },
        { id: "opt-other", label: "Other Questions", targetNodeId: "other" },
      ],
    },

    // --------------------------------------------------------------------------
    // ROOF REPAIR
    // --------------------------------------------------------------------------
    repair: {
      id: "repair",
      title: "Roof Repair",
      botMessage: [
        "We diagnose and repair roof leaks, damaged or missing shingles, valley flashing failures, and storm impact.",
        "If you have an active leak during severe weather, emergency tarping can be dispatched to mitigate interior water damage prior to permanent repair.",
      ],
      actions: [
        { type: "link", label: "Request a Repair Quote", href: "/contact" },
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "rep-emerg", label: "Is this an active leak?", targetNodeId: "emergency" },
        { id: "rep-quote", label: "Get a free estimate", targetNodeId: "quote" },
        { id: "rep-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // ROOF REPLACEMENT
    // --------------------------------------------------------------------------
    replacement: {
      id: "replacement",
      title: "Roof Replacement",
      botMessage: [
        "We install architectural shingle, standing-seam metal, and tile roofing systems engineered for weather resilience.",
        "Every installation includes a thorough decking structural inspection, high-performance underlayment, and a comprehensive property cleanup.",
        "Exact pricing depends on roof pitch, square footage, and chosen materials. We provide detailed in-person estimates with no obligation.",
      ],
      actions: [
        { type: "link", label: "Schedule In-Person Estimate", href: "/contact" },
        { type: "link", label: "View Our Roofing Services", href: "/services" },
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "repl-insp", label: "Need an inspection first?", targetNodeId: "inspection" },
        { id: "repl-quote", label: "How do I request an estimate?", targetNodeId: "quote" },
        { id: "repl-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // ROOF INSPECTION & MAINTENANCE
    // --------------------------------------------------------------------------
    inspection: {
      id: "inspection",
      title: "Roof Inspection & Maintenance",
      botMessage: [
        "Our multi-point inspections evaluate roof surface integrity, flashing sealants, gutter drainage, and attic ventilation.",
        "You receive high-resolution photo documentation detailing any existing storm damage, wear, or preventative maintenance opportunities.",
      ],
      actions: [
        { type: "link", label: "Book a Roof Inspection", href: "/contact" },
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "insp-repair", label: "Need repairs after an inspection?", targetNodeId: "repair" },
        { id: "insp-storm", label: "Inspect storm or hail damage", targetNodeId: "emergency" },
        { id: "insp-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // STORM & EMERGENCY DAMAGE
    // --------------------------------------------------------------------------
    emergency: {
      id: "emergency",
      title: "Storm & Emergency Damage",
      botMessage: hasEmergencyPhone
        ? [
            "⚠️ URGENT: If you have an active roof leak, storm damage, or structural hazard, occupant safety is the top priority.",
            `Please call our emergency dispatch directly at ${emergencyPhone} so our team can coordinate rapid response.`,
            "For non-immediate storm restoration, you can also submit an urgent quote request online.",
          ]
        : [
            "⚠️ URGENT: If you have an active roof leak or storm damage, please ensure all occupants are safe.",
            "If there is immediate structural danger, contact local emergency services immediately.",
            "For emergency tarping or storm repair estimates, please submit an urgent request via our Contact page.",
          ],
      actions: [
        ...(hasEmergencyPhone
          ? [
              {
                type: "tel" as const,
                label: `Call Emergency Dispatch: ${emergencyPhone}`,
                href: sanitizeTelHref(emergencyPhone),
              },
            ]
          : []),
        { type: "link", label: "Submit Urgent Quote Request", href: "/contact" },
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "em-rep", label: "What does roof repair involve?", targetNodeId: "repair" },
        { id: "em-quote", label: "Submit estimate request", targetNodeId: "quote" },
        { id: "em-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // COMMERCIAL ROOFING
    // --------------------------------------------------------------------------
    commercial: {
      id: "commercial",
      title: "Commercial Roofing",
      botMessage: [
        "We provide commercial roofing solutions including TPO, EPDM single-ply membranes, modified bitumen, and elastomeric silicone roof coatings.",
        "We also offer preventative maintenance agreements to extend commercial roof lifespans and avoid active facility disruptions.",
      ],
      actions: [
        { type: "link", label: "Inquire About Commercial Systems", href: "/contact" },
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "comm-insp", label: "Commercial roof inspection", targetNodeId: "inspection" },
        { id: "comm-quote", label: "Request commercial quote", targetNodeId: "quote" },
        { id: "comm-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // SERVICE AREAS
    // --------------------------------------------------------------------------
    "service-areas": {
      id: "service-areas",
      title: "Service Areas & Coverage",
      botMessage: [
        `We proudly serve properties throughout: ${serviceAreasList}.`,
        "If your property is situated nearby, give us a call to confirm estimator availability and scheduling.",
      ],
      actions: [
        { type: "link", label: "View All Service Areas", href: "/service-areas" },
        { type: "link", label: "Request Quote in Your Area", href: "/contact" },
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "area-quote", label: "Request an Estimate", targetNodeId: "quote" },
        { id: "area-contact", label: "Contact our Office", targetNodeId: "contact" },
        { id: "area-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // REQUEST AN ESTIMATE
    // --------------------------------------------------------------------------
    quote: {
      id: "quote",
      title: "Request a Free Quote",
      botMessage: [
        "We provide transparent, detailed roofing quotes with zero obligation.",
        "To get started, please visit our Contact page to complete our secure quote submission form. Our estimators will review your requirements and follow up.",
      ],
      actions: [
        { type: "link", label: "Go to Quote Request Form", href: "/contact" },
        ...(hasPhone
          ? [
              {
                type: "tel" as const,
                label: `Call Our Office: ${phone}`,
                href: sanitizeTelHref(phone),
              },
            ]
          : []),
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "qt-areas", label: "Check service areas", targetNodeId: "service-areas" },
        { id: "qt-emerg", label: "Is this an emergency leak?", targetNodeId: "emergency" },
        { id: "qt-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // SPEAK WITH THE COMPANY
    // --------------------------------------------------------------------------
    contact: {
      id: "contact",
      title: "Speak with Our Team",
      botMessage: [
        `You can connect with ${companyName} directly by phone or via our website.`,
        `Business Hours: Monday–Friday ${config.businessHours.weekdays}; Saturday ${config.businessHours.saturday}; Sunday: ${config.businessHours.sunday}.`,
        config.address ? `Office Location: ${config.address}.` : "",
      ].filter(Boolean),
      actions: [
        ...(hasPhone
          ? [
              {
                type: "tel" as const,
                label: `Call ${phone}`,
                href: sanitizeTelHref(phone),
              },
            ]
          : []),
        { type: "link", label: "Visit Contact Page", href: "/contact" },
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "ct-quote", label: "Request an Estimate", targetNodeId: "quote" },
        { id: "ct-emerg", label: "Emergency assistance", targetNodeId: "emergency" },
        { id: "ct-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },

    // --------------------------------------------------------------------------
    // OTHER / FALLBACK QUESTIONS
    // --------------------------------------------------------------------------
    other: {
      id: "other",
      title: "Other Questions",
      botMessage: [
        "Have a custom question not covered in this guide (such as specific material warranties, timeline constraints, or insurance claim details)?",
        "Our estimators and project coordinators are available to answer your questions directly.",
      ],
      actions: [
        { type: "link", label: "Send Message via Contact Page", href: "/contact" },
        ...(hasPhone
          ? [
              {
                type: "tel" as const,
                label: `Call Office: ${phone}`,
                href: sanitizeTelHref(phone),
              },
            ]
          : []),
        { type: "menu", label: "Back to Main Menu", targetNodeId: "root" },
      ],
      options: [
        { id: "oth-quote", label: "Request an Estimate", targetNodeId: "quote" },
        { id: "oth-menu", label: "Return to Main Menu", targetNodeId: "root" },
      ],
    },
  };

  return tree;
}
