#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# provision-n8n.sh — Clean Client Deployment Credential & Workflow Provisioning
# ==============================================================================
# This script provisions n8n credentials and registers the lead notification
# workflow on a client deployment without manual web UI interaction.
#
# Requirements:
# - Valid .env file in the project root with database, webhook, and SMTP secrets.
# - Running Docker Compose services (specifically 'db' and 'n8n').
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if [ ! -f ".env" ]; then
  echo "Error: .env file not found in ${PROJECT_ROOT}." >&2
  exit 1
fi

echo "==> Reading deployment configuration and generating credentials bundle..."
TMP_CREDS="$(mktemp /tmp/n8n-creds.XXXXXX.json)"
chmod 600 "${TMP_CREDS}"

# Secure cleanup on exit
trap 'rm -f "${TMP_CREDS}"' EXIT

node -e '
const fs = require("fs");

// Robust dotenv parser (handles comments, unquoted values, spaces)
const env = {};
const lines = fs.readFileSync(".env", "utf8").split("\n");
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("\x27") && val.endsWith("\x27"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

if (!env.N8N_WEBHOOK_SECRET) {
  console.error("Error: N8N_WEBHOOK_SECRET is missing from .env");
  process.exit(1);
}
if (!env.POSTGRES_DB || !env.POSTGRES_USER || !env.POSTGRES_PASSWORD) {
  console.error("Error: Database credentials (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD) missing from .env");
  process.exit(1);
}

const creds = [
  {
    id: "HEADER_AUTH_CREDENTIAL_ID",
    name: "Roofing Webhook Auth",
    type: "httpHeaderAuth",
    data: {
      name: "X-Webhook-Secret",
      value: env.N8N_WEBHOOK_SECRET
    }
  },
  {
    id: "POSTGRES_CREDENTIAL_ID",
    name: "Production Roofing PostgreSQL",
    type: "postgres",
    data: {
      host: env.POSTGRES_HOST || "db",
      database: env.POSTGRES_DB,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      port: parseInt(env.POSTGRES_PORT || "5432", 10),
      ssl: "disable"
    }
  },
  {
    id: "SMTP_CREDENTIAL_ID",
    name: "Roofing Company SMTP",
    type: "smtp",
    data: {
      host: env.SMTP_HOST || "localhost",
      port: parseInt(env.SMTP_PORT || "1025", 10),
      user: env.SMTP_USER || "",
      password: env.SMTP_PASS || "",
      secure: env.SMTP_SECURE === "true"
    }
  }
];

fs.writeFileSync(process.argv[1], JSON.stringify(creds, null, 2), "utf8");
console.log("==> Successfully generated credentials bundle (3 credentials).");
' "${TMP_CREDS}"

echo "==> Importing credentials into n8n container via secure stream..."
docker compose exec -T n8n sh -c 'cat > /home/node/.credentials.json && chmod 600 /home/node/.credentials.json && n8n import:credentials --input=/home/node/.credentials.json && rm -f /home/node/.credentials.json' < "${TMP_CREDS}"

echo "==> Importing workflow template into n8n..."
WORKFLOW_PATH="automation/n8n/roofing-lead-notification-workflow.json"
if [ ! -f "${WORKFLOW_PATH}" ]; then
  echo "Error: Workflow file ${WORKFLOW_PATH} not found!" >&2
  exit 1
fi

cat "${WORKFLOW_PATH}" | docker compose exec -T n8n sh -c 'cat > /home/node/.workflow.json'
docker compose exec -T n8n n8n import:workflow --input=/home/node/.workflow.json
docker compose exec -T n8n rm -f /home/node/.workflow.json

echo "==> Publishing workflow..."
WORKFLOW_ID=$(docker compose exec -T n8n n8n list:workflow | grep "Roofing" | head -n 1 | awk -F'|' '{print $1}' | tr -d '[:space:]')

if [ -z "${WORKFLOW_ID}" ]; then
  echo "Error: Failed to locate imported workflow ID in n8n." >&2
  exit 1
fi

docker compose exec -T n8n n8n publish:workflow --id="${WORKFLOW_ID}"

echo "==> Restarting n8n container to bind webhook listeners..."
docker compose restart n8n

echo "==> Waiting for n8n to become ready..."
for i in {1..30}; do
  if docker compose exec -T n8n node -e "
    const http = require('http');
    http.get('http://127.0.0.1:5678/healthz', (res) => {
      process.exit(res.statusCode === 200 ? 0 : 1);
    }).on('error', () => process.exit(1));
  " 2>/dev/null; then
    echo "==> n8n is healthy and listening on port 5678."
    break
  fi
  sleep 1
done

echo "==> n8n provisioning completed successfully."
