Project Overview — Roofing Lead Management & Automation System

1. Project Purpose

Build a reusable, professional website and lead-management system for roofing companies.

The system allows potential customers to explore roofing services, ask predefined chatbot questions, and submit quote requests. Business owners can securely log in to manage leads and view statistics. n8n automates notifications and follow-up workflows.

The project should be designed so each roofing company can receive its own customized deployment using the same core codebase.

2. Primary Objectives

Generate leads through a responsive roofing website.

Provide a secure login and private business dashboard.

Store and manage leads in PostgreSQL.

Automate notifications and follow-ups through n8n.

Make business branding and content configurable.

Deploy the application using Docker on a VPS.

Keep the architecture extensible for future AI chatbot and CRM integrations.

3. Target Users

Public visitors

Browse the website and services.

Review company information and service areas.

Ask predefined chatbot questions.

Submit roofing quote requests.

Contact the business directly.

Business owners and authorized staff

Log in securely.

View dashboard statistics.

Search, filter, and manage leads.

Update lead statuses.

Add follow-up notes.

Review lead details and submission dates.

Configure supported business information.

System administrator

Initially, system administration can be handled by the project owner through deployment and server configuration. A separate platform-wide administration dashboard is not required for the MVP.

4. Public Website Pages

Home

Services

About

Service Areas

Contact / Request a Quote

Privacy Policy

The public website will also contain shared navigation, footer, reusable service cards, testimonials, calls to action, and a floating chatbot.

5. Private Dashboard Pages

Login

Dashboard Overview

Leads List

Lead Details

Business Settings

The dashboard must not be accessible to unauthenticated users. Hiding navigation links is not sufficient; the backend must enforce authentication and authorization.

6. Lead Lifecycle

Each lead should contain, as applicable:

Unique lead ID

Submission timestamp

Customer name

Email and/or phone number

Requested roofing service

Property location

Project description

Lead source

Status

Follow-up notes

Last-updated timestamp

Initial statuses:

New

Contacted

Estimate Scheduled

Won

Lost

The dashboard should support updating statuses and adding notes. Statistics should be derived from actual stored data rather than hardcoded demo numbers.

7. Proposed Technology Stack

These are the recommended defaults for approval before implementation.

Frontend

React

TypeScript

Vite

Tailwind CSS

React Router

Backend

Node.js

TypeScript

Express or Fastify, to be selected before coding

REST API

Server-side input validation

Database

PostgreSQL

Database migrations

Proper foreign keys, indexes, and constraints

Authentication

Secure server-managed sessions

HttpOnly, Secure, SameSite cookies in production

Password hashing using a reputable password-hashing algorithm

Login rate limiting and protected API endpoints

Automation

Self-hosted n8n Community edition, subject to its license terms

Webhook-based integration between the backend and n8n

Email notifications and follow-up workflows

Retry and error-handling procedures

Deployment

Docker

Docker Compose

One VPS for the initial deployment

Reverse proxy with HTTPS

Automated or scheduled database backups

8. High-Level Architecture

The system will have four main parts:

React frontend: public pages and the private dashboard.

Backend API: validates submissions, handles authentication, enforces access controls, and manages business data.

PostgreSQL: the authoritative storage for users, business settings, leads, and notes.

n8n: handles asynchronous business workflows such as notifications and follow-up reminders.

The quote form submits to the backend. The backend validates and saves the lead before triggering an automation workflow. The dashboard retrieves lead data through authenticated API requests.

PostgreSQL is the source of truth. Google Sheets is optional and is not required for the initial version.

9. Reusable Business Configuration

Business-specific values should be kept separate from shared UI and business logic.

Configurable values include:

Company name and logo

Brand colors and typography

Contact details and business hours

Roofing services

Service areas

Website copy and images

Verified testimonials and credentials

Chatbot questions and answers

Each client should have a separate production deployment and separate database or database instance. Client data must never be exposed to another business.

10. Initial Chatbot

The MVP will use a predefined decision-tree chatbot rather than a generative AI chatbot.

Initial questions:

What roofing services do you offer?

Do you serve my area?

How do I request a quote?

How can I contact the business?

What should I do if my roof is leaking?

Answers must use configured business information. The chatbot should offer a clear path to the quote form or direct contact details.

An AI-powered chatbot can be added in a later phase.

11. Initial n8n Workflows

Workflow A: New lead notification

Receive a trusted backend-triggered event.

Validate the incoming payload.

Notify the designated business contact.

Record workflow success or failure.

Workflow B: Customer acknowledgement

Send an acknowledgement after a lead is successfully recorded.

Use an approved message template.

Handle delivery errors without losing the lead.

Workflow C: Follow-up reminder

Identify leads requiring follow-up.

Notify authorized staff.

Avoid duplicate notifications.

The backend must save the lead before relying on automation. Automation failure must not erase or prevent the initial lead record.

12. Proposed Repository Structure

roofing-lead-system/
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── REQUIREMENTS.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   └── IMPLEMENTATION_PLAN.md
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── assets/
│       ├── components/
│       ├── config/
│       ├── features/
│       ├── layouts/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── hooks/
│       ├── types/
│       └── styles/
│
├── backend/
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── modules/
│       │   ├── auth/
│       │   ├── businesses/
│       │   ├── leads/
│       │   └── dashboard/
│       ├── database/
│       ├── integrations/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       └── app.ts
│
├── automation/
│   ├── workflows/
│   └── README.md
│
├── infra/
│   ├── docker/
│   ├── proxy/
│   ├── database/
│   └── scripts/
│
└── tests/
    ├── integration/
    └── end-to-end/

This is a proposed logical structure, not a requirement to create every directory immediately. The coding agent should initialize the project incrementally and avoid empty placeholder files that serve no purpose.

13. Security Requirements

Never expose database credentials, n8n credentials, or API secrets in frontend code.

Validate and sanitize all user input on the backend.

Protect authenticated routes and all sensitive API operations.

Enforce business-level data isolation.

Add rate limiting and spam protection to public forms and login.

Protect against common web vulnerabilities.

Store secrets in environment variables or an appropriate secret-management system.

Keep n8n's editor private and securely authenticated.

Use HTTPS in production.

Back up the database and test restoration.

Avoid storing unnecessary customer information.

Never claim a lead was saved unless the backend confirms success.

14. Explicitly Out of Scope for the MVP

Online payments

Full roofing job/project management

Employee payroll and scheduling

Customer accounts

Native mobile applications

Generative AI chatbot

Complex CRM integrations

Multi-tenant SaaS administration

Advanced revenue forecasting

These may be considered after the core system is reliable.

15. Implementation Phases

Phase 1 — Planning

Finalize requirements, architecture, repository structure, and coding-agent instructions.

Phase 2 — Frontend foundation

Initialize React, TypeScript, routing, styling, shared components, and configurable business branding.

Phase 3 — Public website

Build the public pages, responsive layouts, and predefined chatbot.

Phase 4 — Backend and database

Implement the API, PostgreSQL schema, lead submission, and persistence.

Phase 5 — Authentication and dashboard

Implement secure login, lead management, dashboard statistics, and business settings.

Phase 6 — n8n automation

Implement notifications, acknowledgements, and follow-up workflows.

Phase 7 — Testing and security

Test the complete lead lifecycle, permissions, validation, failures, responsive design, and recovery procedures.

Phase 8 — Deployment

Deploy using Docker Compose, configure HTTPS, secure secrets, enable backups, and document operations.

Phase 9 — Reusable client deployment

Document how to customize branding, configure integrations, provision a new client environment, and deploy a separate instance.

16. Development Rules for the Coding Agent

Do not begin implementation until the architecture and MVP requirements have been approved.

Inspect the existing repository before making changes.

Do not introduce unnecessary frameworks or dependencies.

Keep frontend, backend, automation, and infrastructure concerns separate.

Use TypeScript consistently in the application.

Prefer small, verifiable implementation tasks.

Do not fabricate data or display fake production statistics.

Write tests for important business logic and access controls.

Document environment variables and setup instructions.

Never commit secrets or production credentials.

Report completed changes, files modified, tests executed, and outstanding issues after each task.

Do not silently make major architecture decisions; explain trade-offs and request approval when a decision materially changes scope.

Definition of MVP Completion

The MVP is complete when a visitor can submit a roofing quote request, the backend safely stores the lead, authorized business staff can log in and manage it, dashboard statistics reflect real records, and n8n can execute the configured notification workflow reliably.

The system must also be deployable, documented, tested, and safe to customize for another roofing company.