# =========================================================
# Stage 1: Build & Standalone Tracing
# =========================================================
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN npm install -g pnpm@12.3.4 turbo

# Copy monorepo workspace files
COPY . .

# Install dependencies and produce standalone build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cdsprep/database run db:generate
ENV STANDALONE=true
RUN pnpm --filter @cdsprep/web run build

# =========================================================
# Stage 2: Minimal Production Web Runtime
# =========================================================
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat wget curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root unprivileged web user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and traced standalone output
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/public ./apps/web/public
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

# Next.js production web healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/api/health || exit 1

CMD ["node", "apps/web/server.js"]
