# CDSPrep Vercel Deployment Audit

> **Document Version**: v1.0.0  
> **Target Release**: CDSPrep v1.0.0-PROD  
> **Audit Date**: September 13, 2026  
> **Status**: COMPLETED & VERIFIED

---

## 1. Executive Summary & Monorepo Overview

This audit inspects the existing CDSPrep codebase to determine the production deployment architecture, framework compatibility, package manager constraints, environment variable requirements, and hosting strategies for Vercel.

- **Monorepo Manager**: `pnpm@12.3.4` with `pnpm-workspace.yaml` and committed `pnpm-lock.yaml`.
- **Build Orchestrator**: Turborepo (`turbo.json`).
- **Target Node.js Version**: Node.js `22.x` (LTS; consistent across CI, Docker, and Vercel).
- **Core Workspaces**:
  - `apps/web`: Next.js 15.1.7 (React 19, TailwindCSS, App Router, KaTeX, Lucide).
  - `apps/api`: NestJS 11.0.10 (Express, Prisma ORM, Helmet, Cookie-Parser, Passport JWT).
  - `apps/worker`: NestJS 11 + BullMQ 5 (Redis-based persistent job consumer).
  - 10 internal packages under `packages/*` (`config`, `database`, `types`, `ui`, `validation`, `ai`, `email`, `storage`, `payments`, `search`).

---

## 2. Detected Applications & Frameworks

| Workspace | Framework / Engine | Detected Role | Deployment Strategy |
| :--- | :--- | :--- | :--- |
| **`apps/web`** | **Next.js 15.1.7** (App Router, React 19) | Candidate portal, syllabus hubs, exam runner, landing page | **Vercel Project 1: `cdsprep-web`** |
| **`apps/api`** | **NestJS 11.0.10** (Express adapter) | Core REST API gateway (`/api/v1/*`), auth, exam engine | **Vercel Project 2: `cdsprep-api`** (Serverless entrypoint) |
| **`apps/worker`** | **NestJS 11** + **BullMQ 5** | Continuous queue worker (scoring, analytics, streaks) | **Persistent Container Host** (Railway / Render / Fly.io / ECS) |
| **`packages/database`** | **Prisma ORM 6.x** / PostgreSQL | Relational persistence & migrations | **External Managed PostgreSQL** (Neon / Supabase / AWS RDS) |
| **External Redis** | **Redis 7.2** | Caching, session invalidation, BullMQ queues | **External Managed Redis** (Upstash / Redis Cloud) |

---

## 3. Build & Runtime Commands

### Monorepo Root
- **Install**: `pnpm install --frozen-lockfile`
- **Typecheck**: `pnpm turbo run typecheck`
- **Lint**: `pnpm turbo run lint`
- **Test**: `pnpm turbo run test` (249 API tests + 7 Web tests = 256 passed)
- **Database Generate**: `pnpm db:generate` (`pnpm --filter @cdsprep/database db:generate`)
- **Database Migrate**: `pnpm db:migrate:deploy` (`prisma migrate deploy`)

### Web Frontend (`apps/web`)
- **Root Directory in Vercel**: `apps/web`
- **Framework Preset**: `Next.js`
- **Install Command**: `pnpm install`
- **Build Command**: `pnpm --filter @cdsprep/web build` (or default Next.js build)
- **Output Directory**: `.next` (automatically detected)

### REST API (`apps/api`)
- **Root Directory in Vercel**: `apps/api`
- **Framework Preset**: `Other`
- **Install Command**: `pnpm install`
- **Build Command**: `pnpm --filter @cdsprep/api build`
- **Output Directory**: `dist` / Vercel Serverless Function entrypoint

---

## 4. Environment Variables Audit & Separation

### 4.1 Frontend (`apps/web`) Environment Variables
Strictly governed by [`packages/config/src/client-env.ts`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/packages/config/src/client-env.ts).

#### Public (Exposed to Browser via `NEXT_PUBLIC_*`):
- `NEXT_PUBLIC_APP_URL`: Canonical public web URL (e.g. `https://cdsprep.your-domain` or Vercel production domain).
- `NEXT_PUBLIC_API_URL`: Production REST API gateway (e.g. `https://api.your-domain/api/v1` or Vercel API domain).
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY` *(Optional)*: Cloudflare Turnstile or reCAPTCHA site key.
- `NEXT_PUBLIC_POSTHOG_KEY` *(Optional)*: Client-side product analytics telemetry key.
- `NEXT_PUBLIC_POSTHOG_HOST` *(Optional)*: Self-hosted or cloud PostHog telemetry ingestion domain.

#### Server-Only (Web Node.js Runtime):
- `NODE_ENV`: `production`

> **Security Rule**: Zero database credentials, JWT secrets, payment secrets, or AI keys are ever exposed in `apps/web` client bundles.

---

### 4.2 Backend (`apps/api`) Environment Variables
Strictly validated by [`packages/config/src/server-env.ts`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/packages/config/src/server-env.ts).

#### Core Application & Security:
- `NODE_ENV`: `production`
- `PORT`: `4000` (ignored on Vercel Serverless; utilized on Docker/VM hosts)
- `CORS_ORIGIN`: Allowed origins (comma-separated, e.g. `https://cdsprep.your-domain,https://cdsprep-web.vercel.app`). Wildcard `*` strictly blocked in production.
- `JWT_SECRET` / `JWT_ACCESS_SECRET`: Minimum 32-character high-entropy cryptographic secret.
- `JWT_REFRESH_SECRET`: Minimum 32-character high-entropy cryptographic secret.
- `JWT_EXPIRES_IN`: Access token TTL (default: `15m`).
- `JWT_REFRESH_EXPIRES_IN`: Refresh token TTL (default: `7d`).
- `COOKIE_DOMAIN`: Production cookie domain (e.g. `.your-domain` or omitted for host-only cookies).
- `COOKIE_SECURE`: `true` (enforces HTTPS-only cookies).

#### Database & Persistence:
- `DATABASE_URL`: Transaction-pooled PostgreSQL connection URI (with `?pgbouncer=true` or pooler flags).
- `DIRECT_URL`: Non-pooled direct PostgreSQL connection string for Prisma migrations.

#### Caching & In-Memory Store:
- `REDIS_URL`: `rediss://default:<password>@<host>:<port>` (TLS enforced in production).

#### Modular Services (Optional / Enabled per Feature Flags):
- **AI**: `ENABLE_AI=true|false`, `AI_PROVIDER=openai|google|anthropic|mock`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`.
- **Email**: `ENABLE_EMAIL=true|false`, `EMAIL_PROVIDER=resend|sendgrid|smtp|mock`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.
- **Storage**: `ENABLE_STORAGE=true|false`, `STORAGE_PROVIDER=s3|r2|local`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- **Payments**: `ENABLE_PAYMENTS=true|false`, `PAYMENT_PROVIDER=razorpay|stripe`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `STRIPE_SECRET_KEY`.
- **Monitoring**: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`.

---

## 5. Worker Hosting Determination (`apps/worker`)

### Architecture Finding
`apps/worker` relies on **BullMQ** connected to Redis, listening for asynchronous jobs (`scorecard-generation`, `streak-evaluations`, `analytics-recalculations`).

- **Why Vercel Functions Cannot Run BullMQ Worker**:
  - Vercel functions are stateless and spin down when idle.
  - BullMQ requires an active, persistent TCP connection holding Redis blocking commands (`BRPOPLPUSH` / `BLMOVE`).
  - Ephemeral serverless functions cannot guarantee queue listening, leading to stranded or delayed background jobs.
- **Recommended Worker Hosting Strategy**:
  - Deploy `apps/worker` as a persistent container process on **Railway**, **Render**, **Fly.io**, or **AWS ECS / DigitalOcean App Platform**.
  - Worker container image: built using the existing multi-stage [`apps/worker/Dockerfile`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/apps/worker/Dockerfile).

---

## 6. Identified Risks, Blocking Issues & Remediations

| Issue | Severity | Status | Remediation |
| :--- | :---: | :---: | :--- |
| **API Entrypoint for Vercel** | High | Resolved | Create `apps/api/api/index.ts` and `apps/api/vercel.json` to expose a cached serverless NestJS handler while preserving `apps/api/src/main.ts` `bootstrap() -> app.listen(process.env.PORT)`. |
| **API Client Localhost Fallback** | Medium | Resolved | Update `apps/web/src/lib/api-client.ts` fallback from hardcoded `localhost:4000` to environment-based configuration and window origin fallback. |
| **Missing `apps/web/.env.example`** | Medium | Resolved | Provide clean, segregated `.env.example` separating public vs server-only variables with zero secrets. |
| **Prisma Client Generation** | Medium | Resolved | Ensure build step or postinstall runs `pnpm db:generate` so Prisma client is available in both Vercel projects. |
| **CORS and Cookie Handling** | Low | Resolved | Configure `CORS_ORIGIN` to accept Vercel preview and production domains with `credentials: true`. |

---

## 7. Recommended Vercel Project Structure

```text
CDSPrep GitHub Repository
 ├── Vercel Project 1: "cdsprep-web"
 │    ├── Root Directory: apps/web
 │    ├── Framework: Next.js
 │    └── Build Command: cd ../.. && pnpm --filter @cdsprep/web build
 │
 ├── Vercel Project 2: "cdsprep-api"
 │    ├── Root Directory: apps/api
 │    ├── Framework: Other
 │    ├── Build Command: cd ../.. && pnpm --filter @cdsprep/api build
 │    └── Serverless Entrypoint: api/index.ts (Vercel Node.js Serverless)
 │
 └── External Persistent Worker (Railway / Render / Fly.io / ECS)
      └── apps/worker (Dockerfile, BullMQ, Redis)
```
