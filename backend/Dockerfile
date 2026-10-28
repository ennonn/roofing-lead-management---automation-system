# ==============================================================================
# Production Dockerfile for Roofing Backend (Node.js 22 Alpine)
# ==============================================================================

# --- Stage 1: Build & Compile TypeScript ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY backend/package*.json ./backend/

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy source code
COPY packages/shared-types ./packages/shared-types
COPY backend ./backend

# Build shared types and backend
RUN npm run build --workspace=@roofing/shared-types
RUN npm run build --workspace=roofing-backend

# --- Stage 2: Hardened Production Runtime ---
FROM node:22-alpine AS runner

# Create non-root application user and group (least privilege)
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy manifests for production dependency installation
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY backend/package*.json ./backend/

# Install production-only dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled TypeScript outputs, migration SQL files, and runtime scripts
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/drizzle ./backend/drizzle
COPY --from=builder --chown=nodejs:nodejs /app/backend/scripts ./backend/scripts

WORKDIR /app/backend

# Switch to non-root user
USER nodejs

EXPOSE 5000

# Container health probe
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
