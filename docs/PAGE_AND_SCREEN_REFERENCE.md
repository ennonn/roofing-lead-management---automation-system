# Page and Screen Reference — Roofing Lead Management System

This document provides a comprehensive technical and functional reference for every public website page, private authenticated dashboard screen, and shared UI component in the Roofing Lead Management System.

---

## Table of Contents

1. [Architectural Overview & Layout Shells](#1-architectural-overview--layout-shells)
   - [Public Application Layout (`AppLayout`)](#11-public-application-layout-applayout)
   - [Private Dashboard Layout (`DashboardLayout`)](#12-private-dashboard-layout-dashboardlayout)
2. [Public Website Pages](#2-public-website-pages)
   - [Home Page (`/`)](#21-home-page-)
   - [Services Page (`/services`)](#22-services-page-services)
   - [About Us Page (`/about`)](#23-about-us-page-about)
   - [Service Areas Page (`/service-areas`)](#24-service-areas-page-service-areas)
   - [Contact & Quote Intake Page (`/contact`)](#25-contact--quote-intake-page-contact)
   - [Privacy Policy Page (`/privacy`)](#26-privacy-policy-page-privacy)
3. [Authentication Screen](#3-authentication-screen)
   - [Owner / Staff Login Page (`/login`)](#31-owner--staff-login-page-login)
4. [Private Authenticated Dashboard Screens](#4-private-authenticated-dashboard-screens)
   - [Dashboard Overview Screen (`/dashboard`)](#41-dashboard-overview-screen-dashboard)
   - [Leads Management List Screen (`/dashboard/leads`)](#42-leads-management-list-screen-dashboardleads)
   - [Lead Details & Note History Screen (`/dashboard/leads/:id`)](#43-lead-details--note-history-screen-dashboardleadsid)
5. [Audited Feature Realities: Implemented vs. Unimplemented Settings](#5-audited-feature-realities-implemented-vs-unimplemented-settings)
   - [Business Settings Reality](#51-business-settings-reality)
   - [User Management Reality](#52-user-management-reality)
6. [Fallback & Error Screens](#6-fallback--error-screens)
   - [Not Found Screen (`*`)](#61-not-found-screen-)
7. [Shared & Floating UI Components](#7-shared--floating-ui-components)
   - [Sticky Header Navigation Bar (`Navbar`)](#71-sticky-header-navigation-bar-navbar)
   - [Site Footer (`Footer`)](#72-site-footer-footer)
   - [Floating Decision-Tree Chatbot (`ChatbotWidget`)](#73-floating-decision-tree-chatbot-chatbotwidget)
   - [24/7 Emergency Storm Banner (`EmergencyBanner`)](#74-247-emergency-storm-banner-emergencybanner)
   - [Public Quote Form Component (`QuoteForm`)](#75-public-quote-form-component-quoteform)

---

## 1. Architectural Overview & Layout Shells

The frontend is a single-page React application built with TypeScript, Tailwind CSS, and React Router (`v6`). All routes are mounted within [`src/routes/AppRoutes.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/routes/AppRoutes.tsx) and wrapped by the global [`AuthProvider`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/context/AuthContext.tsx).

### 1.1. Public Application Layout (`AppLayout`)
- **Source File**: [`src/components/layout/AppLayout.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/layout/AppLayout.tsx)
- **Routes Covered**: `/`, `/services`, `/about`, `/service-areas`, `/contact`, `/privacy`.
- **Structure**:
  - Top [`Navbar`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/layout/Navbar.tsx) with branding, navigation links, direct telephone action, and conditional 24/7 emergency dispatch alert.
  - Main semantic container `<main id="main-content" className="flex-1">` rendering child routes via React Router `<Outlet />`.
  - Global [`Footer`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/layout/Footer.tsx) with multi-column company info, license number, service areas, and contact hours.
  - Global floating [`ChatbotWidget`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/chat/ChatbotWidget.tsx) anchored to the bottom-right viewport.
- **Authentication**: None. Publicly accessible.

### 1.2. Private Dashboard Layout (`DashboardLayout`)
- **Source File**: [`src/components/dashboard/DashboardLayout.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/dashboard/DashboardLayout.tsx)
- **Routes Covered**: `/dashboard`, `/dashboard/leads`, `/dashboard/leads/:id`.
- **Access Guard**: Wrapped in [`ProtectedRoute`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/auth/ProtectedRoute.tsx). Redirects unauthenticated requests to `/login` preserving intended destination in navigation state.
- **Structure**:
  - **Desktop Sidebar** (`md:flex`): Sticky left sidebar (72rem / 288px) in sleek dark mode (`bg-slate-900 border-slate-800`).
  - **Mobile Top Bar** (`md:hidden`): Fixed header with company badge, "Owner Portal" subtitle, and animated hamburger/close toggle.
  - **Navigation Links**:
    - *Overview*: `/dashboard` (icon: `LayoutDashboard`).
    - *Leads*: `/dashboard/leads` (icon: `Users`).
  - **User Profile Area**: Displays authenticated user's `fullName`, `email`, and role badge (`Owner`, `Admin`, or `Staff`).
  - **Header Actions**: "View Public Website" link (`/`) opening in current tab, and "Sign Out" button triggering CSRF-protected session termination via [`auth.service.ts`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/services/auth.service.ts).

---

## 2. Public Website Pages

### 2.1. Home Page (`/`)
- **Source File**: [`src/pages/HomePage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/HomePage.tsx)
- **Target Audience**: Residential and commercial property owners seeking roofing evaluations or emergency repairs.
- **Main Sections**:
  1. **24/7 Emergency Banner**: Highlighted callout rendered only if `emergencyPhone` is configured in branding.
  2. **Hero Section**: High-contrast dark gradient banner (`from-slate-900 via-slate-800 to-sky-950`) with contractor license badge, primary heading, value proposition, and dual CTA buttons ("Request Free Roof Inspection" linking to `/contact` and "Call: [Phone]" `tel:` link).
  3. **Verified Trust Badges**: Renders [`TrustBadges`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/common/TrustBadges.tsx) only when verified credentials (`isVerified: true`) exist in client branding.
  4. **Featured Services Grid**: 3-column responsive grid showcasing the top 3 services from [`branding.services`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/config/branding.ts) using [`ServiceCard`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/common/ServiceCard.tsx).
  5. **Why Choose Us / Workmanship Highlights**: Key differentiators including code compliance, diagnostic itemized scopes, and dedicated project cleanup.
  6. **Customer Testimonials**: Renders [`TestimonialCard`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/common/TestimonialCard.tsx) only if real testimonials are provided in branding; cleanly omitted otherwise to prevent displaying synthetic reviews.
  7. **Bottom CTA Banner**: High-urgency dispatch banner with direct phone call and estimate booking actions.
- **SEO & Accessibility**: Document title dynamically updated via `useDocumentHead`. Proper heading hierarchy (`h1` in hero, `h2` per section). Interactive phone numbers normalized via RFC 3966 `tel:` links.

### 2.2. Services Page (`/services`)
- **Source File**: [`src/pages/ServicesPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/ServicesPage.tsx)
- **Target Audience**: Homeowners evaluating specific roofing solutions (replacement vs. repair vs. storm mitigation).
- **Main Sections**:
  1. **Page Header**: Explains weather durability and manufacturer-certified installation standards.
  2. **Comprehensive Service Grid**: Responsive 3-column grid rendering all configured services:
     - *Roof Replacement* (highlighted card with architectural shingle and metal options).
     - *Roof Repair* (targeted leak diagnostics and flashing resealing).
     - *Roof Inspection & Maintenance* (multi-point digital photo documentation).
     - *Storm & Hail Damage Restoration* (emergency tarping and insurance documentation mapping).
     - *Commercial Roofing* (TPO, EPDM, and fluid-applied restorative coatings).
  3. **Diagnostic Advice Banner**: Helps homeowners decide between repair and full replacement with direct CTA buttons.
- **Interactive Elements**: Every service card features an itemized checklist of capabilities and a "Request Free Estimate" button navigating to `/contact`.

### 2.3. About Us Page (`/about`)
- **Source File**: [`src/pages/AboutPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/AboutPage.tsx)
- **Target Audience**: Prospective clients researching the contractor's credentials, craftsmanship standards, and company background.
- **Main Sections**:
  1. **Header**: Introduces the company's workmanship philosophy and zero-pressure sales commitment.
  2. **Trust Badges Bar**: Displays verified licenses and insurance credentials.
  3. **Workmanship Principles Grid**: 4 detailed pillars:
     - *Code-Compliant Installation Standards* (ice-and-water shield, ventilation, drip edge).
     - *Diagnostic & Itemized Scopes* (clear line items, digital photo inspections).
     - *Structural Property Protection* (tarps, magnetic nail sweeps, landscaping care).
     - *Manufacturer-Backed Warranties* (certified materials, certified installers).
  4. **Contractor Credentials & Licensing Panel**: Displays legal license number, liability insurance coverage, and workers' compensation confirmation.
  5. **Direct Call-to-Action**: Drives conversions to the quote intake form.

### 2.4. Service Areas Page (`/service-areas`)
- **Source File**: [`src/pages/ServiceAreasPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/ServiceAreasPage.tsx)
- **Target Audience**: Property owners checking whether their property falls within the company's dispatch boundary.
- **Main Sections**:
  1. **Header**: Explains regional service coverage.
  2. **Coverage Grid**: Responsive grid rendering every area defined in `branding.serviceAreas` (or `VITE_SERVICE_AREAS` build argument). Each card includes a map pin icon, area name, and confirmation of free on-site inspections.
  3. **Neighboring Communities Callout**: Reassures users in adjacent zip codes that dispatch is often available, providing office telephone and quote request buttons.
- **Configuration Parity**: Defaults to 5 core regional areas (`Metro Area`, `North County`, `South County`, `East Suburbs`, `West Suburbs`) or parses client-specific comma-separated strings during Docker build.

### 2.5. Contact & Quote Intake Page (`/contact`)
- **Source File**: [`src/pages/ContactPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/ContactPage.tsx)
- **Target Audience**: In-market property owners ready to submit a project scope or call dispatch directly.
- **Main Sections**:
  1. **Header**: Clear instructions for standard estimate booking vs. urgent storm leak response.
  2. **Direct Office & Dispatch Info Card** (Left Column / Aside):
     - Primary phone number with click-to-call.
     - 24/7 Emergency Storm Line (conditionally rendered with high-visibility amber badge).
     - General estimating email address.
     - Physical business address.
     - Operating hours for weekdays, Saturday, and Sunday.
     - Contractor license number.
  3. **Interactive Quote Form Container** (Right Column / Main): Embeds [`QuoteForm`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/forms/QuoteForm.tsx) for text-only lead intake.

### 2.6. Privacy Policy Page (`/privacy`)
- **Source File**: [`src/pages/PrivacyPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/PrivacyPage.tsx)
- **Route**: `/privacy` (Note: `/privacy-policy` redirects or defaults to `/privacy` per routing table).
- **Target Audience**: Homeowners reviewing data handling, storage isolation, and privacy commitments.
- **Main Sections**:
  1. *Information We Collect*: Explicitly lists customer name, phone, optional email, physical address, service type, and project notes.
  2. *How We Use Your Information*: Confirms operational fulfillment use only. Includes prominent **"Zero Data Selling"** assurance (no selling to third-party lead brokers).
  3. *Data Storage & Isolated Architecture*: Explains dedicated single-tenant PostgreSQL database storage and private self-hosted automation.
  4. *Data Retention & Homeowner Privacy Rights*: Details rights to request summaries, corrections, or full deletion of project records.
  5. *Contacting the Privacy Desk*: Direct email and postal address for inquiries.

---

## 3. Authentication Screen

### 3.1. Owner / Staff Login Page (`/login`)
- **Source File**: [`src/pages/LoginPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/LoginPage.tsx)
- **Route**: `/login`
- **Target Audience**: Roofing company owner and authorized estimators/staff.
- **Main Elements**:
  - Company branding badge with dynamic company name.
  - "Return to public website" back link (`/`).
  - Login Card in slate dark-mode styling:
    - **Email Address Input**: Type `email`, client-side format regex check, accessible label.
    - **Password Input**: Type `password`, required check, accessible label.
    - **Submit Button**: "Sign In to Dashboard" with inline loading spinner when in flight.
  - **Security Callout**: Notice informing users that accounts are provisioned administratively and all login attempts are rate-limited and logged.
- **Validation & Submission Behavior**:
  - Client-side validation catches empty fields and invalid email formats before network requests.
  - Dispatches `POST /api/v1/auth/login` with credentials.
  - Handles CSRF handshake automatically via `X-CSRF-Token` header.
  - On HTTP 200: AuthContext updates user state, issues session cookie `roofing_sid`, and redirects user to `/dashboard` (or previously attempted route).
  - On HTTP 401 / 422 / 429: Displays clear, accessible alert without exposing backend stack details.

---

## 4. Private Authenticated Dashboard Screens

### 4.1. Dashboard Overview Screen (`/dashboard`)
- **Source File**: [`src/pages/DashboardOverviewPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/DashboardOverviewPage.tsx)
- **Route**: `/dashboard`
- **Access**: Authenticated users (`Owner` or `Admin`).
- **Main Sections**:
  1. **Header Banner**: Welcomes the user by `fullName` and displays current date and quick "Refresh" button.
  2. **Top Metrics Row (KPI Cards)**:
     - *Total Inquiries* (All-time recorded leads).
     - *New Inquiries* (Awaiting initial contact).
     - *Estimates Scheduled* (In-person inspections booked).
     - *Conversion Rate* (Percentage of leads won: `Won / Total`).
  3. **Pipeline Status Distribution Grid**: 5 cards breaking down leads by exact status (`New`, `Contacted`, `Estimate Scheduled`, `Won`, `Lost`) with counts and descriptions.
  4. **Needs Attention Banner**: Highlights new uncontacted leads that require immediate follow-up.
  5. **Recent Leads Table**: Displays the 5 most recent submissions with customer name, phone, service type, submission date, status badge, and direct link to lead details.
- **API Endpoint**: `GET /api/v1/dashboard/stats`.
- **States**:
  - *Loading*: Animated pulsing skeleton cards.
  - *Empty*: Helpful guidance message when zero leads exist.
  - *Error*: Red alert banner with "Retry" button.

### 4.2. Leads Management List Screen (`/dashboard/leads`)
- **Source File**: [`src/pages/LeadsListPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/LeadsListPage.tsx)
- **Route**: `/dashboard/leads`
- **Access**: Authenticated users (`Owner` or `Admin`).
- **Controls & Actions**:
  1. **Search Bar**: Debounced text search with clear (`X`) button. Searches customer name, phone, email, and property location. Parameterized in URL as `?search=...`.
  2. **Status Filter Tabs**: Quick-filter pills: `All Leads`, `New`, `Contacted`, `Estimate Scheduled`, `Won`, `Lost`. Parameterized in URL as `?status=...`.
  3. **Sort Controls**: Dropdown and direction toggle (`asc` / `desc`). Sort by `Submission Date`, `Last Status Update`, `Customer Name`, `Status`, or `Created At`.
  4. **Data Table / Cards**:
     - *Desktop Table*: Columns for Customer Name, Contact Info (phone/email), Service Type & Location, Status Badge, Submission Date, and Action arrow.
     - *Mobile Responsive Cards*: Stacked card format for smaller screens with direct call/email touch targets.
  5. **Server-Side Pagination Bar**: Controls for `Page [N] of [Total]`, Previous/Next buttons, and per-page limit selector (`20`, `50`, `100`).
- **API Endpoint**: `GET /api/v1/leads?page=1&limit=20&status=all&search=...&sortBy=submissionDate&sortOrder=desc`.
- **States**:
  - *Loading*: Skeleton table rows.
  - *Empty (Zero Leads in System)*: "No inquiries recorded yet" empty state.
  - *Empty (No Search Matches)*: "No customer inquiries match your current search and filter settings. Try adjusting your query or resetting filters." with a one-click "Reset Filters" action.
  - *Error*: Error alert with retry button.

### 4.3. Lead Details & Note History Screen (`/dashboard/leads/:id`)
- **Source File**: [`src/pages/LeadDetailPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/LeadDetailPage.tsx)
- **Route**: `/dashboard/leads/:id`
- **Access**: Authenticated users (`Owner` or `Admin`).
- **Main Sections**:
  1. **Breadcrumb / Return Link**: `< Back to all leads` navigating back to `/dashboard/leads`.
  2. **Lead Header Panel**:
     - Customer name, unique UUID, and current status badge.
     - Submission date and last update timestamp.
     - Direct communication actions: Call button (`tel:`), Email button (`mailto:`), and Google Maps property link.
  3. **Status Workflow Transition Control**:
     - Select dropdown containing all 5 allowed statuses.
     - Description of the selected status.
     - "Update Status" button.
     - Dispatches `PATCH /api/v1/leads/:id/status` with CSRF token. Updates UI optimistically with error rollback.
  4. **Project Scope & Customer Details Card**:
     - Requested Service Type.
     - Preferred Contact Method (Phone / Email).
     - Property Address.
     - Homeowner Project Description & Urgency Notes.
  5. **Follow-Up Notes & Activity History Panel**:
     - Chronological list of all user-attributed notes with author name, timestamp, and text.
     - *Add Note Form*: Textarea with character count, client-side validation (disallows empty/whitespace-only notes), and "Save Follow-Up Note" button.
     - Dispatches `POST /api/v1/leads/:id/notes` with CSRF token. Appends new note instantly upon success and clears the textarea.
- **States**:
  - *Loading*: Skeleton detail layout.
  - *404 Not Found*: "Inquiry Not Found — The lead you requested does not exist or may have been deleted" with button returning to leads list.
  - *Error*: General failure alert.

---

## 5. Audited Feature Realities: Implemented vs. Unimplemented Settings

The codebase was strictly audited to reconcile planning documents (`Overview.md`, `REQUIREMENTS.md`) with the actual code:

### 5.1. Business Settings Reality
- **Database Table**: Exists (`business_settings` in PostgreSQL). Populated with initial client details during `npm run db:seed`.
- **Public API Endpoint**: Exists (`GET /api/v1/business/public-info`), returning public branding, phone numbers, service areas, and business hours.
- **Dashboard UI / Screen**: **DOES NOT EXIST**. There is no `/dashboard/settings` route, no settings navigation item in `DashboardLayout.tsx`, and no form to edit business details in the frontend.
- **Administrative Modification**: Settings are managed at deployment time via environment variables (`COMPANY_*`, `VITE_*`) and database seeds.

### 5.2. User Management Reality
- **Database Table**: Exists (`users` in PostgreSQL) storing `email`, `password_hash` (bcrypt), `full_name`, `role`, and `is_active`.
- **Initial Account**: Seeded via CLI using `npm run db:seed` from `INITIAL_OWNER_*` environment variables.
- **Dashboard UI / Screen**: **DOES NOT EXIST**. There is no user management screen, invite team member form, or password reset GUI for administrators.
- **Administrative Modification**: Managed via CLI database seed or direct SQL administration.

---

## 6. Fallback & Error Screens

### 6.1. Not Found Screen (`*`)
- **Source File**: [`src/pages/NotFoundPage.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/pages/NotFoundPage.tsx)
- **Route**: `*` (matches any undefined route).
- **Elements**:
  - Prominent "404" badge in amber styling.
  - "Page Not Found" heading.
  - Explanatory copy: "The roofing page you are looking for does not exist or may have been relocated."
  - Action buttons: "Return Home" (`/`) and "View Roofing Services" (`/services`).

---

## 7. Shared & Floating UI Components

### 7.1. Sticky Header Navigation Bar (`Navbar`)
- **Source File**: [`src/components/layout/Navbar.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/layout/Navbar.tsx)
- **Features**:
  - Emergency banner top bar (rendered only if `emergencyPhone` is non-empty).
  - Company logo icon and title.
  - Desktop navigation items (`Home`, `Services`, `About Us`, `Service Areas`, `Contact / Quote`).
  - Active route indicator (sky-600 underline).
  - Quick-call phone link.
  - Primary CTA button: "Get Free Quote" (`/contact`).
  - Mobile hamburger drawer with full accessible navigation and telephone link.

### 7.2. Site Footer (`Footer`)
- **Source File**: [`src/components/layout/Footer.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/layout/Footer.tsx)
- **Features**:
  - 4-column responsive grid: Company Profile (license, tagline), Navigation Links, Service Coverage list, and Contact Details & Operating Hours.
  - Bottom bar with dynamic copyright year and link to Privacy Policy.
  - Note: Owner login is intentionally unlinked from public footer navigation to protect administrative privacy.

### 7.3. Floating Decision-Tree Chatbot (`ChatbotWidget`)
- **Source File**: [`src/components/chat/ChatbotWidget.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/chat/ChatbotWidget.tsx)
- **Logic File**: [`src/config/chatbotTree.ts`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/config/chatbotTree.ts)
- **Mechanism**:
  - A fixed floating circular button in bottom-right corner (`z-40`).
  - Opens an accessible chat modal dialog (`role="dialog"`, `aria-label="Roofing assistant chatbot"`).
  - Operates on a **deterministic, client-side decision tree** (`ChatbotTree`).
  - **Not an AI / LLM**. It does not call an external OpenAI/Anthropic API or invent unverified pricing.
  - Supports vanity phone number translation (e.g. `(555) 999-HELP` -> `(555) 999-4357`) for dialable `tel:` links.
  - Provides quick options for Roof Repair, Roof Replacement, Inspection, Emergency Storm Damage, Commercial, Service Areas, and Request an Estimate.
  - Supports "Return to Main Menu" and "Restart Chat" actions.
  - Supports keyboard accessibility (`Escape` key closes dialog).

### 7.4. 24/7 Emergency Storm Banner (`EmergencyBanner`)
- **Source File**: [`src/components/common/EmergencyBanner.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/common/EmergencyBanner.tsx)
- **Behavior**:
  - Renders a prominent amber alert banner with flashing beacon icon and direct call button.
  - **Clean Suppression**: If `emergencyPhone` is empty, whitespace-only, or invalid (<7 digits), the component returns `null` and renders nothing.
  - Supports optional user dismissal via close button.

### 7.5. Public Quote Form Component (`QuoteForm`)
- **Source File**: [`src/components/forms/QuoteForm.tsx`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/components/forms/QuoteForm.tsx)
- **Fields**:
  - `customerName` (Text, required, min 2 chars).
  - `phone` (Tel, required, validated format >= 7 digits).
  - `email` (Email, optional unless email contact preferred).
  - `serviceType` (Select dropdown, required).
  - `propertyLocation` (Text, required, address/city).
  - `projectDescription` (Textarea, optional, max 2000 chars).
  - `preferredContactMethod` (Radio pills: Phone / Email).
  - `_hp` (Honeypot, hidden anti-spam field).
- **Validation**:
  - Client-side preflight via [`validateQuoteForm`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/src/services/leads.service.ts).
  - Automatically focuses the first invalid field for screen-reader accessibility.
  - Debounces submission; disables submit button while in flight.
- **Submission & Success**:
  - Dispatches `POST /api/v1/leads`.
  - On success: Replaces form with a confirmation panel displaying submitted customer name, primary phone, reference ID, and estimated turnaround time.
