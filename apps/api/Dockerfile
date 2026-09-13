# =========================================================
# Stage 1: Build & Package Dependency Resolution
# =========================================================
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install pnpm and turbo globally
RUN npm install -g pnpm@12.3.4 turbo

# Copy monorepo manifests and source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build API + all upstream packages
RUN pnpm --filter @cdsprep/database run db:generate
RUN pnpm --filter @cdsprep/api... run build

# =========================================================
# Stage 2: Production Container Runtime
# =========================================================
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat wget curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create dedicated non-root unprivileged service account
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy complete built workspace from builder
COPY --chown=nestjs:nodejs --from=builder /app ./

USER nestjs
EXPOSE 4000

# Container healthcheck against active port
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-4000}/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
