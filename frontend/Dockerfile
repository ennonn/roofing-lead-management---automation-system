# ==============================================================================
# Production Dockerfile for Roofing Frontend (Vite + React SPA on Nginx Alpine)
# ==============================================================================

# --- Stage 1: Build & Bundle SPA ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY frontend/package*.json ./frontend/

# Install all dependencies for build
RUN npm ci

# Copy source code
COPY packages/shared-types ./packages/shared-types
COPY frontend ./frontend

# Build arguments for client-specific branding and routing
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_COMPANY_NAME
ARG VITE_COMPANY_TAGLINE
ARG VITE_DEFAULT_PHONE
ARG VITE_EMERGENCY_PHONE
ARG VITE_DEFAULT_EMAIL
ARG VITE_COMPANY_ADDRESS
ARG VITE_COMPANY_LICENSE
ARG VITE_SERVICE_AREAS
ARG VITE_HOURS_WEEKDAYS
ARG VITE_HOURS_SATURDAY
ARG VITE_HOURS_SUNDAY

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_COMPANY_NAME=${VITE_COMPANY_NAME}
ENV VITE_COMPANY_TAGLINE=${VITE_COMPANY_TAGLINE}
ENV VITE_DEFAULT_PHONE=${VITE_DEFAULT_PHONE}
ENV VITE_EMERGENCY_PHONE=${VITE_EMERGENCY_PHONE}
ENV VITE_DEFAULT_EMAIL=${VITE_DEFAULT_EMAIL}
ENV VITE_COMPANY_ADDRESS=${VITE_COMPANY_ADDRESS}
ENV VITE_COMPANY_LICENSE=${VITE_COMPANY_LICENSE}
ENV VITE_SERVICE_AREAS=${VITE_SERVICE_AREAS}
ENV VITE_HOURS_WEEKDAYS=${VITE_HOURS_WEEKDAYS}
ENV VITE_HOURS_SATURDAY=${VITE_HOURS_SATURDAY}
ENV VITE_HOURS_SUNDAY=${VITE_HOURS_SUNDAY}

# Build shared types and frontend production bundle
RUN npm run build --workspace=@roofing/shared-types
RUN npm run build --workspace=roofing-frontend

# --- Stage 2: Hardened Nginx Runtime ---
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

# Health check probe
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
