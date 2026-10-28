# Configuration Reference — Roofing Lead Management System

This document is the authoritative configuration reference for the single-tenant Roofing Lead Management and Automation System. It catalogs every environment variable, build argument, and runtime configuration setting used across the frontend, backend, database, reverse proxy, and n8n automation engine.

---

## Table of Contents

1. [Configuration Model & Precedence](#1-configuration-model--precedence)
2. [Master Configuration Table](#2-master-configuration-table)
   - [2.1. Deployment & Network Edge (Caddy Proxy)](#21-deployment--network-edge-caddy-proxy)
   - [2.2. Client Operational Identity & Public Branding](#22-client-operational-identity--public-branding)
   - [2.3. Frontend Build Arguments (Nginx Static Bundle)](#23-frontend-build-arguments-nginx-static-bundle)
   - [2.4. PostgreSQL Database Connection](#24-postgresql-database-connection)
   - [2.5. Session Security & Rate Limiting](#25-session-security--rate-limiting)
   - [2.6. Initial Owner Seed (Private Provisioning)](#26-initial-owner-seed-private-provisioning)
   - [2.7. n8n Automation Engine Integration & Webhooks](#27-n8n-automation-engine-integration--webhooks)
   - [2.8. n8n Container Internal Configuration](#28-n8n-container-internal-configuration)
   - [2.9. Client SMTP & Notification Provider](#29-client-smtp--notification-provider)
3. [Safe Modification Procedures](#3-safe-modification-procedures)
   - [3.1. Changing Runtime Environment Variables](#31-changing-runtime-environment-variables)
   - [3.2. Changing Branding & Rebuilding Frontend](#32-changing-branding--rebuilding-frontend)
   - [3.3. Re-provisioning n8n Credentials](#33-re-provisioning-n8n-credentials)
   - [3.4. Production Secret Generation Commands](#34-production-secret-generation-commands)

---

## 1. Configuration Model & Precedence

The application follows the **12-factor configuration pattern** with dynamic runtime database precedence:
- **Host `.env` File**: The single source of truth for deployment secrets, credentials, and initial deployment defaults (permission `chmod 600 .env`).
- **Build Arguments (`args`)**: Passed to Docker during `docker compose build` to bake initial fallback client branding into the static React bundle.
- **Container Environment (`environment`)**: Injected into runtime containers (`backend`, `db`, `n8n`, `proxy`) via `docker-compose.yml`.
- **Database Source of Truth (`business_settings`)**: Initialized during `npm run db:seed` from `COMPANY_*` variables. Business contact details, service areas, and availability states saved via `/dashboard/settings` take immediate dynamic precedence at runtime without requiring `.env` modification or frontend rebuilds.
- **n8n SQLite Vault**: Headlessly provisioned via [`scripts/provision-n8n.sh`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/scripts/provision-n8n.sh) from `.env`.

> [!CAUTION]
> Never commit real secret values, passwords, or production API keys to git. `.env` is ignored by `.gitignore`. Only placeholder values belong in [`.env.example`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/.env.example).

---

## 2. Master Configuration Table

### 2.1. Deployment & Network Edge (Caddy Proxy)

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `COMPOSE_PROJECT_NAME` | Docker Compose | Prefixes container names, volumes, and networks to prevent collisions. | Required | `roofing` | Alphanumeric slug only (e.g. `summit_roofing`). | `docker compose down && docker compose up -d` | No |
| `DOMAIN_NAME` | Caddy (`proxy`) | Public FQDN for edge HTTPS and automatic Let's Encrypt certificates. | Required in prod | `localhost` | Valid public domain pointing to VPS IP. | `docker compose restart proxy` | No |
| `HTTP_PORT` | Caddy (`proxy`) | Host port for edge HTTP (redirects 308 to HTTPS). | Optional | `80` | Must be 80 on production VPS. | `docker compose up -d proxy` | No |
| `HTTPS_PORT` | Caddy (`proxy`) | Host port for edge HTTPS traffic. | Optional | `443` | Must be 443 on production VPS. | `docker compose up -d proxy` | No |
| `CLIENT_ORIGIN` | Backend Express | Allowed CORS origin and cookie matching (`https://<DOMAIN_NAME>`). | Required | `http://localhost` | Must exactly match public frontend origin. | `docker compose restart backend` | No |

---

### 2.2. Client Operational Identity & Public Branding

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `COMPANY_NAME` | Frontend & Backend | Legal/brand name shown on site, quotes, and emails. | Required | `Apex Roofing Solutions` | Client business name. | Frontend rebuild + backend restart | No |
| `COMPANY_TAGLINE` | Frontend | Subtitle for hero sections and SEO meta descriptions. | Optional | `Professional Roofing & Storm Damage Restoration` | Non-empty string. | Rebuild frontend (`docker compose build frontend`) | No |
| `COMPANY_PHONE` | Frontend & Backend | Primary telephone number for homeowner inquiries. | Required | `(555) 123-4567` | Valid telephone with >= 7 digits. | Frontend rebuild + backend restart | No |
| `COMPANY_EMERGENCY_PHONE` | Frontend & Backend | 24/7 emergency dispatch line. **Leave empty (`""`) to cleanly suppress emergency banners and calling links.** | Optional | `(555) 999-HELP` (template default) | Valid phone or empty string `""`. | Frontend rebuild + backend restart | No |
| `COMPANY_EMAIL` | Frontend | General inquiry address shown on contact page and footer. | Required | `contact@apexroofingexample.com` | Valid RFC 5322 email. | Rebuild frontend | No |
| `COMPANY_DISPATCH_EMAIL` | Backend Outbox | Fallback internal dispatch inbox if `STAFF_NOTIFICATION_EMAIL` unset. | Optional | Falls back to `INITIAL_OWNER_EMAIL` | Valid email. | Restart backend | No |
| `COMPANY_ADDRESS` | Frontend & Backend | Physical shop or headquarters address. | Optional | `100 Commercial Pkwy, Suite 200, Metro Area` | Street address. | Frontend rebuild + backend restart | No |
| `COMPANY_LICENSE` | Frontend & Backend | Contractor license number displayed in header/footer. | Required | `ROOF-LIC-10928` | State/county license string. | Frontend rebuild + backend restart | No |
| `COMPANY_SERVICE_AREAS` | Frontend & Backend | Comma-separated list of service cities/townships. | Required | `Metro Area, North County, South County, East Suburbs, West Suburbs` | Comma-delimited strings. | Frontend rebuild + backend restart | No |
| `VITE_HOURS_WEEKDAYS` | Frontend | Monday–Friday operating hours. | Optional | `7:00 AM - 6:00 PM` | Display string. | Rebuild frontend | No |
| `VITE_HOURS_SATURDAY` | Frontend | Saturday operating hours. | Optional | `8:00 AM - 2:00 PM` | Display string. | Rebuild frontend | No |
| `VITE_HOURS_SUNDAY` | Frontend | Sunday operating hours. | Optional | `Emergency Storm Response Only` | Display string. | Rebuild frontend | No |

---

### 2.3. Frontend Build Arguments (Nginx Static Bundle)

These variables are defined in [`frontend/Dockerfile`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/frontend/Dockerfile) and mapped from the corresponding `COMPANY_*` environment variables in `docker-compose.yml`:

| Build Argument | Source Environment Variable | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `VITE_API_BASE_URL` (default: `/api/v1`) | Relative base path for API requests behind Caddy reverse proxy. |
| `VITE_COMPANY_NAME` | `COMPANY_NAME` | Company name compiled into HTML title and navbar. |
| `VITE_COMPANY_TAGLINE` | `COMPANY_TAGLINE` | Subtitle compiled into hero and footer. |
| `VITE_DEFAULT_PHONE` | `COMPANY_PHONE` | Primary telephone compiled into call buttons. |
| `VITE_EMERGENCY_PHONE` | `COMPANY_EMERGENCY_PHONE` | Emergency line compiled into emergency banners. |
| `VITE_DEFAULT_EMAIL` | `COMPANY_EMAIL` | Public email compiled into contact section. |
| `VITE_COMPANY_ADDRESS` | `COMPANY_ADDRESS` | Physical address compiled into footer. |
| `VITE_COMPANY_LICENSE` | `COMPANY_LICENSE` | License number compiled into trust headers. |
| `VITE_SERVICE_AREAS` | `COMPANY_SERVICE_AREAS` | Comma-separated areas parsed into service area cards. |

---

### 2.4. PostgreSQL Database Connection

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POSTGRES_HOST` | Backend & Drizzle | Database container service name. | Required | `db` (in Compose), `localhost` (dev) | Set to `db` in Docker Compose. | Restart backend | No |
| `POSTGRES_PORT` | Backend & DB | Database listening port. | Optional | `5432` | Internal Docker port 5432. | Restart backend & db | No |
| `POSTGRES_DB` | Backend & DB | PostgreSQL database name. | Required | `roofing_leads` | Lowercase identifier. | Re-provision DB | No |
| `POSTGRES_USER` | Backend & DB | PostgreSQL master role name. | Required | `roofing_user` | Non-superuser account. | Re-provision DB | No |
| `POSTGRES_PASSWORD` | Backend, DB, n8n | PostgreSQL master password. | Required | `replace_with_strong_database_password_here` | Must be a strong random password (`>= 24 chars`). | Restart DB & re-provision n8n credentials | **YES** |
| `DATABASE_URL` | Drizzle Migrations | Full connection URI for Drizzle CLI. | Optional | Synthesized automatically from components if omitted. | `postgresql://user:pass@host:5432/db` | Rerun migration script | **YES** |

---

### 2.5. Session Security & Rate Limiting

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SESSION_SECRET` | Backend Express | Secret key for encrypting session cookies. | Required | `development_session_secret_...` | **Startup fails in production if default or < 32 chars.** | Restart backend | **YES** |
| `SESSION_NAME` | Backend Express | Name of the session cookie. | Optional | `roofing_sid` | Generic non-descriptive cookie name. | Restart backend | No |
| `SESSION_MAX_AGE_HOURS` | Backend Express | Lifetime of user session before timeout. | Optional | `24` | Numeric hours (default 24h). | Restart backend | No |
| `COOKIE_SECURE` | Backend Express | Sets `Secure` flag on session cookies (requires HTTPS). | Required | `false` in dev; **forced `true` in production.** | Must be `true` in production behind TLS proxy. | Restart backend | No |
| `RATE_LIMIT_WINDOW_MS` | Backend Express | Time window for IP rate limiter. | Optional | `900000` (15 minutes) | Milliseconds. | Restart backend | No |
| `RATE_LIMIT_MAX_REQUESTS` | Backend Express | Max general API calls per IP per window. | Optional | `100` | Integer requests. | Restart backend | No |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | Backend Express | Max failed login attempts per IP per window. | Optional | `10` | Max 10 attempts before lockout. | Restart backend | No |

---

### 2.6. Initial Owner Seed (Private Provisioning)

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `INITIAL_OWNER_EMAIL` | Backend Seed | Email address for initial owner account. | Required | `owner@example-roofing.com` | Valid business email for the owner. | `docker compose exec backend npm run db:seed` | No |
| `INITIAL_OWNER_PASSWORD` | Backend Seed | Initial temporary password for owner account. | Required | `TemporaryPassword123!` | **Startup fails in production if default or < 12 chars.** | `docker compose exec backend npm run db:seed` | **YES** |
| `INITIAL_OWNER_FULL_NAME` | Backend Seed | Full legal name of the owner. | Optional | `Business Owner` | Name string. | `docker compose exec backend npm run db:seed` | No |

---

### 2.7. n8n Automation Engine Integration & Webhooks

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `N8N_INTERNAL_URL` | Backend Outbox | Internal Docker endpoint for n8n webhooks. | Required | `http://n8n:5678` (in Compose), `http://localhost:5678` (dev) | Must point to `http://n8n:5678` in Compose. | Restart backend | No |
| `N8N_LEAD_WEBHOOK_PATH` | Backend Outbox | Inbound webhook route registered in n8n. | Optional | `/webhook/roofing-lead-created` | Must match Webhook node path in workflow. | Restart backend | No |
| `N8N_WEBHOOK_SECRET` | Backend Outbox & n8n | Shared secret sent via `X-Webhook-Secret` header. | Required | `development_n8n_webhook_secret_key` | **Startup fails in production if default.** Must be `>= 32 chars`. | Restart backend & run `./scripts/provision-n8n.sh` | **YES** |
| `STAFF_NOTIFICATION_EMAIL` | Backend Outbox & n8n | Internal recipient inbox for new lead notifications. | Required | Falls back to `INITIAL_OWNER_EMAIL` | Valid company inbox. | Restart backend | No |
| `SMTP_DISPATCH_FROM` | Backend Outbox & n8n | Outbound sender address (From header) in email alerts. | Optional | `notifications@clientdomain.com` | Verified sending domain. | Restart backend | No |

---

### 2.8. n8n Container Internal Configuration

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `N8N_PORT` | n8n Container | Internal listening port inside n8n container. | Optional | `5678` | Fixed at 5678. | Restart n8n | No |
| `N8N_HOST_PORT` | `docker-compose.yml` | Loopback binding port on the host (`127.0.0.1:${N8N_HOST_PORT}`). | Optional | `5678` | Bound exclusively to `127.0.0.1`. Never expose to `0.0.0.0`. | `docker compose up -d n8n` | No |
| `N8N_BASIC_AUTH_ACTIVE` | n8n Container | Enforces HTTP Basic Auth on n8n web editor. | Required | `true` | Must always be `true`. | Restart n8n | No |
| `N8N_BASIC_AUTH_USER` | n8n Container | Administrative username for n8n editor. | Required | `n8n_admin` | Administrative login. | Restart n8n | No |
| `N8N_BASIC_AUTH_PASSWORD` | n8n Container | Administrative password for n8n editor. | Required | `replace_with_strong_n8n_admin_password` | Must be a strong random password (`>= 16 chars`). | Restart n8n | **YES** |
| `N8N_ENCRYPTION_KEY` | n8n Container | Master key encrypting credentials in n8n SQLite. | Required | `replace_with_random_n8n_encryption_key` | Must be random hex string (`>= 32 chars`). **Do not change after initial import or stored credentials will corrupt.** | Re-provision n8n | **YES** |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | `docker-compose.yml` | Blocks workflow Code nodes from reading process env vars. | Enforced | `"true"` | **Must remain `"true"`** to protect encryption key & secrets. | Restart n8n | No |

---

### 2.9. Client SMTP & Notification Provider

These variables are read by [`scripts/provision-n8n.sh`](file:///Users/aljonfernando/Documents/roofing-lead-management-&-automation-system/scripts/provision-n8n.sh) to provision the `SMTP_CREDENTIAL_ID` credential inside n8n:

| Setting Name | Consumed By | Purpose | Required? | Default / Fallback | Production Restrictions | Action Needed After Change | Sensitive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SMTP_HOST` | `provision-n8n.sh` | SMTP server hostname (SendGrid, Postmark, AWS SES). | Required in prod | `localhost` (triggers dummy SMTP in dev) | Real SMTP provider hostname. | `./scripts/provision-n8n.sh` | No |
| `SMTP_PORT` | `provision-n8n.sh` | SMTP server port. | Optional | `465` (SSL) or `587` (TLS) | Standard SMTP ports. | `./scripts/provision-n8n.sh` | No |
| `SMTP_USER` | `provision-n8n.sh` | SMTP username or API key identifier. | Required in prod | `""` | SMTP provider username. | `./scripts/provision-n8n.sh` | **YES** |
| `SMTP_PASS` | `provision-n8n.sh` | SMTP password or API token. | Required in prod | `""` | SMTP provider password or secret key. | `./scripts/provision-n8n.sh` | **YES** |
| `SMTP_SECURE` | `provision-n8n.sh` | Whether connection uses implicit SSL (`true` for 465, `false` for 587). | Optional | `true` | Boolean string (`true` or `false`). | `./scripts/provision-n8n.sh` | No |

---

## 3. Safe Modification Procedures

### 3.1. Changing Runtime Environment Variables
To update runtime settings (such as `SESSION_MAX_AGE_HOURS`, `RATE_LIMIT_*`, or `COMPANY_DISPATCH_EMAIL`):
1. Open `.env` with secure permissions: `nano .env`.
2. Edit the target variable.
3. Restart the backend container to apply:
   ```bash
   docker compose restart backend
   ```

### 3.2. Changing Branding & Rebuilding Frontend
Because public branding (`COMPANY_NAME`, `COMPANY_PHONE`, `COMPANY_EMERGENCY_PHONE`, `COMPANY_LICENSE`, etc.) is compiled directly into the static React bundle during Docker image build:
1. Update `.env` with the new branding values.
2. Rebuild the frontend container image without cache:
   ```bash
   docker compose build --no-cache frontend
   docker compose up -d --no-deps frontend
   ```
3. To also update the backend database fallback settings:
   ```bash
   docker compose restart backend
   ```

### 3.3. Re-provisioning n8n Credentials
If `N8N_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`, or SMTP credentials change:
1. Update the corresponding keys in `.env`.
2. Run the verified automated provisioning script:
   ```bash
   ./scripts/provision-n8n.sh
   ```
   *This script securely streams credentials into n8n as the internal `node` user, updates the credentials in the SQLite vault, re-publishes the workflow, and restarts n8n.*

### 3.4. Production Secret Generation Commands
Always generate cryptographically secure secrets prior to production deployment:

```bash
# 1. Session secret (64-char hex string)
openssl rand -hex 32

# 2. Database password (24-char base64 string)
openssl rand -base64 24

# 3. Webhook shared secret (64-char hex string)
openssl rand -hex 32

# 4. n8n administrative basic-auth password (16-char base64 string)
openssl rand -base64 16

# 5. n8n encryption key (48-char hex string)
openssl rand -hex 24

# 6. Initial owner temporary password (16-char base64 string)
openssl rand -base64 16
```
