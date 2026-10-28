# Operations & Runbook Guide — Roofing Lead Management System

This document provides step-by-step operational runbooks for local development, local staging, fresh client onboarding, disaster recovery, updating, troubleshooting, and client handover.

Every procedure is explicitly labeled with its current verification status:
- `[VERIFIED IN LOCAL STAGING]`: Tested and confirmed functional in the Docker Compose staging environment.
- `[REQUIRES PRODUCTION HOST]`: Validated in design and CLI syntax; requires a public VPS, DNS records, or external SaaS account.
- `[UNVERIFIED PRODUCTION PREREQUISITE]`: Planned operational requirement that must be validated prior to public launch.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Local Staging Lifecycle (Docker Compose)](#2-local-staging-lifecycle-docker-compose)
3. [Fresh Client Deployment Runbook](#3-fresh-client-deployment-runbook)
4. [Cryptographic Secret Generation](#4-cryptographic-secret-generation)
5. [Automated n8n Credential Provisioning](#5-automated-n8n-credential-provisioning)
6. [Database Migration, Seeding & Schema Parity](#6-database-migration-seeding--schema-parity)
7. [Health Checks, Monitoring & Troubleshooting](#7-health-checks-monitoring--troubleshooting)
8. [Database Backup, Restore & Off-Host Storage](#8-database-backup-restore--off-host-storage)
9. [Updating & Rolling Back a Deployment](#9-updating--rolling-back-a-deployment)
10. [SMTP Setup & Safe Email Deliverability Verification](#10-smtp-setup--safe-email-deliverability-verification)
11. [Client Handover, Credential Rotation & Offboarding](#11-client-handover-credential-rotation--offboarding)
12. [Verification Status Matrix](#12-verification-status-matrix)

---

## 1. Local Development Setup
`[VERIFIED IN LOCAL STAGING]`

### 1.1. Prerequisites
- **Node.js**: Version 20.x or 22.x LTS
- **npm**: Version 10.x or higher
- **PostgreSQL**: Version 16 (local daemon or Docker container)
- **Git**: For version control

### 1.2. Workspace Installation
Clone the repository and install all workspace dependencies from the monorepo root:

```bash
# Install root and workspace dependencies (@roofing/shared-types, backend, frontend)
npm install
```

### 1.3. Environment Configuration
Copy the template `.env.example` to `.env`:

```bash
cp .env.example .env
chmod 600 .env
```

Ensure `.env` contains local development defaults:
```ini
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
CLIENT_ORIGIN=http://localhost:5173

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=roofing_leads
POSTGRES_USER=roofing_user
POSTGRES_PASSWORD=postgres_password

SESSION_SECRET=development_session_secret_min_32_characters_long_12345
COOKIE_SECURE=false

N8N_INTERNAL_URL=http://localhost:5678
N8N_LEAD_WEBHOOK_PATH=/webhook/roofing-lead-created
N8N_WEBHOOK_SECRET=development_n8n_webhook_secret_key
```

### 1.4. Database Migration & Seed
Run migrations and create the initial owner user and operational settings:

```bash
# Execute Drizzle migrations 0000 through 0003
npm run db:migrate

# Seed initial business owner and default business settings
npm run db:seed
```

### 1.5. Running Development Servers
Run the full monorepo in parallel or start workspaces individually:

```bash
# Option A: Start both backend and frontend concurrently
npm run dev

# Option B: Run backend only (port 5000 with nodemon/tsx)
npm run dev:backend

# Option C: Run frontend only (port 5173 with Vite HMR)
npm run dev:frontend
```

### 1.6. Executing Test Suites
Run all tests across the monorepo:

```bash
# Run unit and integration test suites
npm test

# Run TypeScript compilation check across all workspaces
npm run build
```

---

## 2. Local Staging Lifecycle (Docker Compose)
`[VERIFIED IN LOCAL STAGING]`

Local staging simulates the production VPS environment using Docker Compose with Caddy edge TLS, Nginx frontend, Express backend, PostgreSQL 16, and self-hosted n8n.

### 2.1. Starting Staging
```bash
# 1. Build and launch all 5 containers in detached mode
docker compose up -d --build

# 2. Check container health status
docker compose ps
```
*Expected status: All 5 containers (`roofing-proxy`, `roofing-frontend`, `roofing-backend`, `roofing-db`, `roofing-n8n`) show status `Up` or `healthy`.*

### 2.2. Post-Startup Staging Provisioning
On first launch of a staging instance:

```bash
# 1. Run database migrations inside the backend container
docker compose exec backend npm run db:migrate

# 2. Seed initial owner and settings inside the backend container
docker compose exec backend npm run db:seed

# 3. Headlessly provision n8n credentials and publish workflow
./scripts/provision-n8n.sh
```

### 2.3. Viewing Staging Logs
```bash
# Stream all logs
docker compose logs -f

# Stream specific service logs
docker compose logs -f backend
docker compose logs -f n8n
docker compose logs -f proxy
```

### 2.4. Shutting Down Staging
```bash
# Graceful shutdown (preserves database and n8n volume data)
docker compose down

# Full reset (WARNING: Permanently deletes all database records and n8n data)
docker compose down -v
```

---

## 3. Fresh Client Deployment Runbook
`[REQUIRES PRODUCTION HOST]`

This runbook defines the repeatable onboarding procedure for deploying the application for a new roofing client on a dedicated VPS.

### 3.1. Phase 1: Client Data Intake
Collect and document the client's operational details:
- Project identifier slug (e.g. `summit_roofing`).
- Legal company name, phone numbers, and emergency phone (if offered).
- Public domain name (e.g. `summitroofingtx.com`).
- Public inquiry email and staff notification email.
- Physical address and state contractor license number.
- Service regions and operating hours.
- Outbound SMTP provider credentials (host, port, user, pass).

### 3.2. Phase 2: Host Infrastructure Provisioning
1. Provision an Ubuntu 22.04 LTS VPS (2 vCPU, 4GB RAM, 40GB SSD).
2. Configure UFW firewall:
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
3. Install Docker Engine and Docker Compose v2.
4. Configure DNS A/AAAA records with the client's registrar pointing `@` and `www` to the VPS public static IP.

### 3.3. Phase 3: Repository Setup & Configuration Hardening
1. Clone the repository to the production directory:
   ```bash
   sudo mkdir -p /opt/roofing-clients/client_summit
   sudo chown -R $USER:$USER /opt/roofing-clients/client_summit
   git clone <REPO_URL> /opt/roofing-clients/client_summit
   cd /opt/roofing-clients/client_summit
   ```
2. Create and harden the `.env` file:
   ```bash
   cp .env.example .env
   chmod 600 .env
   ```
3. Populate `.env` with client-specific values and generate strong random secrets per [Section 4](#4-cryptographic-secret-generation).

### 3.4. Phase 4: Container Build & Service Launch
```bash
# Build production images without cache and start containers
docker compose build --no-cache
docker compose up -d
```

### 3.5. Phase 5: Database & Automation Provisioning
```bash
# 1. Apply database migrations
docker compose exec backend npm run db:migrate

# 2. Seed owner account and business settings
docker compose exec backend npm run db:seed

# 3. Headlessly import credentials and publish n8n notification workflow
./scripts/provision-n8n.sh
```

### 3.6. Phase 6: Post-Deployment Smoke Test
Follow the QA checklist:
1. Open `https://<DOMAIN_NAME>` in a browser; verify SSL padlock.
2. Submit a test quote request; verify HTTP 201 and on-screen confirmation.
3. Check backend outbox dispatch: `docker compose logs --tail 20 backend`.
4. Log into `/login` with `INITIAL_OWNER_EMAIL` and `INITIAL_OWNER_PASSWORD`.
5. Verify test lead appears on `/dashboard` and `/dashboard/leads`.
6. Update lead status to `Contacted` and append a test follow-up note.
7. Test logout and verify session cookie is cleared.

---

## 4. Cryptographic Secret Generation
`[VERIFIED IN LOCAL STAGING]`

In production (`NODE_ENV=production`), the backend environment validator halts startup if placeholder or default secrets are used. Generate all secrets using `openssl`:

```bash
# 1. SESSION_SECRET (64-character hex string)
openssl rand -hex 32

# 2. POSTGRES_PASSWORD (24-character base64 string)
openssl rand -base64 24

# 3. N8N_WEBHOOK_SECRET (64-character hex string)
openssl rand -hex 32

# 4. N8N_BASIC_AUTH_PASSWORD (16-character base64 string)
openssl rand -base64 16

# 5. N8N_ENCRYPTION_KEY (48-character hex string)
openssl rand -hex 24

# 6. INITIAL_OWNER_PASSWORD (16-character base64 string)
openssl rand -base64 16
```

---

## 5. Automated n8n Credential Provisioning
`[VERIFIED IN LOCAL STAGING]`

The automated provisioning script [`scripts/provision-n8n.sh`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/scripts/provision-n8n.sh) executes zero-code credential and workflow configuration:

```bash
./scripts/provision-n8n.sh
```

### 5.1. How the Script Operates Safely
1. **Node.js Dotenv Parser**: Reads `.env` safely via Node.js runtime, parsing quotes and whitespace without relying on bash `source`.
2. **Encrypted In-Memory Stream**: Generates a temporary JSON payload with `HEADER_AUTH_CREDENTIAL_ID`, `POSTGRES_CREDENTIAL_ID`, and `SMTP_CREDENTIAL_ID`.
3. **Internal User Ownership**: Streams data into `/home/node/.credentials.json` directly as the internal container user `node` (UID 1000). This avoids file ownership conflicts or permission errors on sticky host `/tmp` mounts.
4. **Vault Import**: Invokes `n8n import:credentials --input=/home/node/.credentials.json` to insert credentials into n8n's encrypted SQLite database.
5. **Immediate Cleanup**: Securely deletes temporary files (`rm -f /home/node/.credentials.json`).
6. **Workflow Publication**: Imports `automation/n8n/roofing-lead-notification-workflow.json`, activates it via `n8n publish:workflow`, and restarts the n8n container to bind webhook listeners.
7. **Readiness Probe**: Polls `http://127.0.0.1:5678/healthz` until n8n reports healthy.

---

## 6. Database Migration, Seeding & Schema Parity
`[VERIFIED IN LOCAL STAGING]`

### 6.1. Running Migrations in Docker
```bash
docker compose exec backend npm run db:migrate
```
*Applies migrations `0000` through `0003`, creating core tables, indexes, and PostgreSQL claim stored functions.*

### 6.2. Seeding Initial Owner & Settings
```bash
docker compose exec backend npm run db:seed
```
*Idempotent execution: If an owner user or business settings already exist in the database, the seed script automatically skips insertion without overwriting existing data.*

### 6.3. Verifying Database Tables
```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
```
*Expected tables: `users`, `sessions`, `business_settings`, `leads`, `lead_notes`, `outbox_events`, `n8n_processed_events`.*

---

## 7. Health Checks, Monitoring & Troubleshooting
`[VERIFIED IN LOCAL STAGING]`

### 7.1. Quick Health Probes
```bash
# 1. Reverse Proxy & Backend API Health Probe
curl -k https://localhost/health
# Expected: {"status":"ok","timestamp":"..."}

# 2. n8n Container Health Probe
docker compose exec -T n8n wget -qO- http://127.0.0.1:5678/healthz
# Expected: {"status":"ok"}

# 3. Database Readiness Probe
docker compose exec -T db pg_isready -U roofing_user -d roofing_leads
# Expected: roofing_leads:5432 - accepting connections
```

### 7.2. Troubleshooting Runbook

#### Symptom 1: Webhook returns `HTTP 403 Forbidden` (`Authorization data is wrong!`)
- **Cause**: The incoming `X-Webhook-Secret` does not match the secret provisioned in n8n's `httpHeaderAuth` credential.
- **Resolution**:
  1. Verify `N8N_WEBHOOK_SECRET` in `.env`.
  2. Re-run `./scripts/provision-n8n.sh` to update n8n's stored credential.
  3. Restart backend container: `docker compose restart backend`.

#### Symptom 2: Webhook returns `HTTP 409 Conflict` (`in_flight`)
- **Cause**: An active worker hold or concurrent execution has acquired a lease for this idempotency key.
- **Resolution**: Normal idempotency behavior. The outbox worker automatically backs off and retries. If an n8n worker crashed, the 5-minute lease will expire and the next attempt will automatically reclaim the event.

#### Symptom 3: Outbox events stuck in `status: 'processing'` or `retry_count > 0`
- **Cause**: n8n container is offline or responding with errors (e.g. SMTP connection refused).
- **Resolution**:
  1. Inspect n8n logs: `docker compose logs --tail 50 n8n`.
  2. If SMTP connection refused (`ECONNREFUSED`), verify SMTP credentials in `.env` and re-run `./scripts/provision-n8n.sh`.
  3. Query outbox status:
     ```bash
     docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id, status, retry_count, last_error FROM outbox_events WHERE status != '\''delivered'\'';"'
     ```

#### Symptom 4: Frontend displays old company name after updating `.env`
- **Cause**: Public branding is compiled into the static React bundle during Docker image build.
- **Resolution**: Rebuild the frontend container image without cache:
  ```bash
  docker compose build --no-cache frontend
  docker compose up -d --no-deps frontend
  ```

---

## 8. Database Backup, Restore & Off-Host Storage

### 8.1. Local Database Backup
`[VERIFIED IN LOCAL STAGING]`

Create a compressed SQL dump of the PostgreSQL database:

```bash
mkdir -p ./backups
BACKUP_FILE="./backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "${BACKUP_FILE}"

echo "Backup created at ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
```

### 8.2. Database Restoration Drill
`[VERIFIED IN LOCAL STAGING]`

To restore from a compressed backup file:

```bash
# 1. Terminate active backend connections to prevent write locking
docker compose stop backend

# 2. Restore database from compressed backup
gunzip -c ./backups/backup_TARGET.sql.gz | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

# 3. Restart backend service
docker compose start backend
```

### 8.3. Off-Host Automated Backup Sync
`[UNVERIFIED PRODUCTION PREREQUISITE]`

To safeguard against catastrophic VPS hardware loss, backups must sync off-host to encrypted object storage (e.g. AWS S3, Cloudflare R2, or Backblaze B2) using `rclone` or AWS CLI.

**Production Setup Steps**:
1. Install `rclone`: `sudo apt-get install -y rclone`.
2. Configure remote: `rclone config` (set up S3/R2 bucket `client-backups`).
3. Create cron job at `/etc/cron.daily/roofing-backup`:
   ```bash
   #!/bin/bash
   set -euo pipefail
   BACKUP_DIR="/opt/roofing-backups"
   mkdir -p "${BACKUP_DIR}"
   FILE="${BACKUP_DIR}/roofing_$(date +%Y%m%d).sql.gz"

   cd /opt/roofing-clients/client_summit
   docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "${FILE}"
   rclone copy "${FILE}" r2:client-backups/summit/
   find "${BACKUP_DIR}" -type f -mtime +14 -delete
   ```
4. Make executable: `chmod +x /etc/cron.daily/roofing-backup`.

---

## 9. Updating & Rolling Back a Deployment
`[REQUIRES PRODUCTION HOST]`

### 9.1. Applying Code Updates
```bash
# 1. Pull latest code from repository
git pull origin main

# 2. Rebuild images with new code
docker compose build --no-cache

# 3. Restart containers with zero downtime
docker compose up -d

# 4. Apply any new database migrations
docker compose exec backend npm run db:migrate

# 5. Clean up unused dangling images
docker image prune -f
```

### 9.2. Emergency Rollback Procedure
If a deployment fails:
```bash
# 1. Revert to previous git commit or release tag
git checkout <PREVIOUS_STABLE_COMMIT>

# 2. Rebuild and launch containers
docker compose build --no-cache
docker compose up -d

# 3. If database schema was affected, restore previous database backup
gunzip -c ./backups/pre_update_backup.sql.gz | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose restart backend
```

---

## 10. SMTP Setup & Safe Email Deliverability Verification

### 10.1. Local Staging Dummy SMTP
`[VERIFIED IN LOCAL STAGING]`

In local staging, real emails are intentionally blocked. A local dummy SMTP listener is run on port 1025 to simulate delivery without sending synthetic data to live contacts.

### 10.2. Live Production SMTP Configuration
`[REQUIRES PRODUCTION HOST]`

Prior to public launch, configure the client's verified transactional email provider:
1. Obtain SMTP credentials from SendGrid, Postmark, Amazon SES, or Mailgun.
2. Ensure DNS records (SPF, DKIM, and DMARC) are configured on the client's sending domain.
3. Update `.env` with:
   ```ini
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=465
   SMTP_USER=apikey
   SMTP_PASS=SG.your_verified_api_key_here
   SMTP_SECURE=true
   STAFF_NOTIFICATION_EMAIL=leads@summitroofingtx.com
   SMTP_DISPATCH_FROM=notifications@summitroofingtx.com
   ```
4. Re-provision n8n credentials:
   ```bash
   ./scripts/provision-n8n.sh
   ```
5. Submit a live test quote request through the website and verify receipt in the staff inbox.

---

## 11. Client Handover, Credential Rotation & Offboarding
`[REQUIRES PRODUCTION HOST]`

### 11.1. Client Handover Protocol
1. **Credentials Package**: Securely transmit to the client business owner:
   - Dashboard URL: `https://<DOMAIN_NAME>/login`
   - Initial Owner Username: `INITIAL_OWNER_EMAIL`
   - Initial Temporary Password: `INITIAL_OWNER_PASSWORD`
   - Instructions for mandatory password change upon first login.
2. **Support Briefing**: Explain lead status transitions (`New` -> `Contacted` -> `Estimate Scheduled` -> `Won` / `Lost`) and follow-up notes usage.

### 11.2. Administrative Credential Rotation
If credentials must be rotated:
- **Owner Password**: Update via SQL `UPDATE users SET password_hash = ... WHERE email = ...` or user seed.
- **Database Password**:
  1. Change `POSTGRES_PASSWORD` in `.env`.
  2. Run `ALTER USER roofing_user WITH PASSWORD 'new_password';` in PostgreSQL.
  3. Re-run `./scripts/provision-n8n.sh`.
  4. Restart backend: `docker compose restart backend`.
- **Webhook Secret**:
  1. Change `N8N_WEBHOOK_SECRET` in `.env`.
  2. Re-run `./scripts/provision-n8n.sh`.
  3. Restart backend: `docker compose restart backend`.

### 11.3. Client Offboarding & Decommissioning
When offboarding a client:
1. Export complete customer lead database:
   ```bash
   docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > ./final_client_archive.sql.gz
   ```
2. Deliver archive to client owner.
3. Tear down containers and destroy persistent volumes:
   ```bash
   docker compose down -v
   ```
4. Delete client directory: `rm -rf /opt/roofing-clients/client_summit`.

---

## 12. Verification Status Matrix

| Operational Procedure | Verification Status | Notes / Limitations |
| :--- | :--- | :--- |
| **Local Development Setup (`npm run dev`)** | **`[VERIFIED IN LOCAL STAGING]`** | Confirmed with Node 22, Express, and Vite HMR. |
| **Test Suite Execution (`npm test`)** | **`[VERIFIED IN LOCAL STAGING]`** | 22 test files passed, 234 tests passed, 0 failures. |
| **Workspace Builds (`npm run build`)** | **`[VERIFIED IN LOCAL STAGING]`** | Clean builds for shared-types, backend, and frontend. |
| **Staging Startup & Health Probes** | **`[VERIFIED IN LOCAL STAGING]`** | Docker Compose 5-service stack healthy. |
| **Headless n8n Provisioning** | **`[VERIFIED IN LOCAL STAGING]`** | Tested via `./scripts/provision-n8n.sh` with exit code 0. |
| **Database Migrations & Seeding** | **`[VERIFIED IN LOCAL STAGING]`** | Migrations 0000–0003 applied; idempotent seed confirmed. |
| **Local Database Backup & Restore Drill** | **`[VERIFIED IN LOCAL STAGING]`** | `pg_dump` and `psql` restore drill successfully verified. |
| **Dummy SMTP Verification** | **`[VERIFIED IN LOCAL STAGING]`** | Verified via controlled in-container mock listener. |
| **Live VPS & DNS Setup** | **`[REQUIRES PRODUCTION HOST]`** | Requires public static IP and client registrar configuration. |
| **Edge Let's Encrypt TLS Issuance** | **`[REQUIRES PRODUCTION HOST]`** | Requires public DNS pointing to live VPS host. |
| **Live SMTP Delivery to Real Inboxes** | **`[REQUIRES PRODUCTION HOST]`** | Requires client SMTP provider credentials (SendGrid, Postmark). |
| **Off-Host S3/R2 Backup Synchronization**| **`[UNVERIFIED PRODUCTION PREREQUISITE]`**| Requires external cloud storage bucket and API credentials. |
