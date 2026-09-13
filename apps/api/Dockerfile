# =========================================================
# Stage 1: Build & Package Dependency Resolution
# =========================================================
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install specific pnpm version matching repository configuration
RUN npm install -g pnpm@12.3.4

# Copy monorepo manifest and package manifests for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install workspace dependencies and build all shared packages before API
RUN pnpm install --frozen-lockfile

# Generate Prisma client for database package
RUN pnpm --filter @cdsprep/database run db:generate

# Build all shared workspace packages in dependency order
RUN pnpm --filter @cdsprep/types run build
RUN pnpm --filter @cdsprep/validation run build
RUN pnpm --filter @cdsprep/config run build
RUN pnpm --filter @cdsprep/email run build
RUN pnpm --filter @cdsprep/storage run build
RUN pnpm --filter @cdsprep/payments run build
RUN pnpm --filter @cdsprep/ai run build
RUN pnpm --filter @cdsprep/database run build

# Now build the API after all dependencies are compiled
RUN pnpm --filter @cdsprep/api run build
RUN pnpm prune --prod

# =========================================================
# Stage 2: Minimal Production Container Runtime
# =========================================================
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat wget curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create dedicated non-root unprivileged service account
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy runtime manifests, compiled modules, and artifacts
COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nestjs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=builder /app/packages ./packages
COPY --chown=nestjs:nodejs --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=nestjs:nodejs --from=builder /app/apps/api/package.json ./apps/api/package.json

USER nestjs
EXPOSE 4000

# Integrated production container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "apps/api/dist/main.js"]

