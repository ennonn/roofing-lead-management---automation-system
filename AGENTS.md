# Project Rules — Roofing Lead Management System

## 1. Project Purpose
Build a reusable website and lead-management system for roofing businesses. Each client will have a separate deployment and isolated data.

## 2. Working Rules
- Read this file and the project documentation before making changes.
- Inspect the existing codebase before creating or modifying files.
- Work in small, verifiable stages. Do not build the entire application in one step.
- Explain the planned changes before starting each major milestone.
- Do not replace working code or introduce dependencies without a clear reason.
- Ask before making major architectural changes or decisions that affect cost, security, or maintainability.
- Never claim a feature works without testing it.

## 3. Proposed Technology Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
- Backend: Node.js, TypeScript, and Express (subject to final confirmation).
- Database: PostgreSQL with version-controlled migrations.
- Authentication: Server-managed sessions using secure cookies and properly hashed passwords.
- Automation: Self-hosted n8n triggered by the backend.
- Deployment: Docker Compose on a VPS, with HTTPS and backups.

Do not silently change the approved stack. If a change is necessary, explain the trade-offs and ask first.

## 4. Architecture
- Keep the public website separate from the authenticated dashboard.
- Use the backend API for database access and business logic.
- Never connect the browser directly to PostgreSQL.
- Never expose database credentials, API keys, session secrets, or n8n credentials in frontend code.
- Keep n8n administration private.
- Make lead creation reliable even when an automation workflow fails.
- Keep each roofing client's data isolated from other clients.

## 5. Security
- Enforce authentication and authorization on the server.
- Validate and normalize all incoming data.
- Use parameterized database queries.
- Apply rate limiting to login and public lead-submission endpoints.
- Protect authenticated requests against relevant session and CSRF risks.
- Use environment variables for secrets and provide only placeholder values in `.env.example`.
- Never commit real secrets or customer data.

## 6. Lead Management
- Store leads persistently in PostgreSQL.
- Support lead statuses: New, Contacted, Estimate Scheduled, Won, Lost.
- Record timestamps and relevant follow-up notes.
- Calculate dashboard statistics from real database records.
- Handle duplicate submissions and automation failures deliberately.

## 7. Quality Standards
- Use the installed skills when relevant to the task.
- Follow consistent TypeScript, naming, formatting, and component conventions.
- Add appropriate tests for business logic, API endpoints, authorization, and failure cases.
- Provide loading, empty, success, and error states in the interface.
- Make the public website and dashboard responsive and accessible.
- Update documentation when architecture, API contracts, database schema, or deployment changes.

## 8. Implementation Process
For each milestone:
1. Inspect the existing project and relevant instructions.
2. State the planned work and files likely to change.
3. Implement only the agreed scope.
4. Run relevant checks and tests.
5. Report what changed, what passed, what failed, and any remaining issues.
6. Wait for approval before moving to the next major milestone.

## 9. Initial Instruction
Do not start building the full application immediately. First inspect the workspace, report the existing files and installed skills, identify missing project documentation, and propose the first implementation milestone. Do not overwrite existing work.
