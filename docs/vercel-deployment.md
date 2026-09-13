# CDSPrep Vercel Production Deployment Guide

> **Document Version**: v1.0.0  
> **Platform Target**: Vercel Serverless & Edge Platform  
> **Applicable Release**: CDSPrep v1.0.0-PROD  
> **Audited & Approved**: September 13, 2026

---

## 1. Monorepo Architecture on Vercel

CDSPrep is engineered as a Turborepo monorepo powered by `pnpm@12.3.4`. Due to architectural requirements (ephemeral serverless web/API vs. persistent queue workers), deployment is structured into two focused Vercel projects and one dedicated persistent worker host:

```text
                               GitHub Repository
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   ↓                                       ↓
           Vercel Project 1                        Vercel Project 2
           [cdsprep-web]                           [cdsprep-api]
         (apps/web - Next.js)                   (apps/api - NestJS)
                   |                                       |
                   +-------------------+-------------------+
                                       |
                                       ↓
                               External Services
                   +-------------------+-------------------+
                   |                   |                   |
                   ↓                   ↓                   ↓
            Managed Postgres     Managed Redis       Cloudflare R2 / S3
             (Neon / RDS)          (Upstash)          (Object Storage)
                                       |
                                       ↓
                             Persistent Worker Host
                        (Railway / Render / Fly.io / ECS)
                             [cdsprep-worker]
                               (BullMQ Queue)
```

---

## 2. Vercel Project Configurations

### Project 1: `cdsprep-web` (Candidate Frontend & Public Hubs)
- **Project Name**: `cdsprep-web`
- **Root Directory**: `apps/web`
- **Framework Preset**: `Next.js`
- **Node.js Version**: `22.x` (or `20.x` LTS)
- **Monorepo / Include External Files**: Enabled (`true`)
- **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
- **Build Command**: `cd ../.. && pnpm db:generate && pnpm --filter @cdsprep/web build`
- **Output Directory**: `.next` (automatically resolved)

### Project 2: `cdsprep-api` (REST API & Examination Engine)
- **Project Name**: `cdsprep-api`
- **Root Directory**: `apps/api`
- **Framework Preset**: `Other`
- **Node.js Version**: `22.x` (or `20.x` LTS)
- **Monorepo / Include External Files**: Enabled (`true`)
- **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
- **Build Command**: `cd ../.. && pnpm db:generate && pnpm --filter @cdsprep/api build`
- **Output Directory**: `dist`
- **Serverless Function Configuration**: Governed by [`apps/api/vercel.json`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/apps/api/vercel.json) routing all incoming traffic `/(.*)` to the cached serverless NestJS adapter in [`apps/api/api/index.ts`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/apps/api/api/index.ts).

---

## 3. Persistent Worker Hosting Strategy (`apps/worker`)

> [!IMPORTANT]
> **Vercel Functions are serverless and ephemeral**. BullMQ requires a persistent, long-running daemon process holding open Redis TCP connections (`BRPOPLPUSH` / `BLMOVE`) to dispatch and execute async background jobs (scorecard generation, streak calculation, mistake ledger updates).  
> **Do NOT deploy `apps/worker` to Vercel**.

### Recommended Hosting Providers:
1. **Railway**: Deploy using the Dockerfile [`apps/worker/Dockerfile`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/apps/worker/Dockerfile) with continuous restart policy.
2. **Render**: Background Worker service type.
3. **Fly.io**: Dedicated lightweight microVM running `fly deploy --dockerfile apps/worker/Dockerfile`.
4. **AWS ECS / Fargate**: Standalone task definition.

---

## 4. Production Environment Variables Inventory

> [!CAUTION]
> Never commit actual secret values into Git or markdown documentation. Configure these securely in the Vercel Dashboard under **Settings > Environment Variables**.

### 4.1 Frontend Variables (`cdsprep-web`)

| Variable | Scope | Description | Example / Allowed Values |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Public (Browser) | Public canonical domain of frontend | `https://cdsprep.your-domain` |
| `NEXT_PUBLIC_API_URL` | Public (Browser) | REST API endpoint URL | `https://api.your-domain/api/v1` |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | Public (Browser) | Optional bot defense site key | Cloudflare Turnstile Site Key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public (Browser) | Optional product analytics key | Public token string |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public (Browser) | Optional telemetry host | `https://app.posthog.com` |
| `NODE_ENV` | Server-Only | Node runtime mode | `production` |

### 4.2 Backend Variables (`cdsprep-api`)

| Category | Variable | Required | Description |
| :--- | :--- | :---: | :--- |
| **Application** | `NODE_ENV` | Yes | `production` |
| | `CORS_ORIGIN` | Yes | Allowed origins (e.g. `https://cdsprep.your-domain,https://cdsprep-web.vercel.app`) |
| **Database** | `DATABASE_URL` | Yes | PostgreSQL connection pool URI (PgBouncer / Neon pooler) |
| | `DIRECT_URL` | Yes | Direct unpooled PostgreSQL URI (for Prisma migrations) |
| **Redis** | `REDIS_URL` | Yes | TLS-secured Redis URI (`rediss://...`) |
| **Auth** | `JWT_SECRET` | Yes | High-entropy secret $\ge 32$ characters |
| | `JWT_REFRESH_SECRET` | Yes | High-entropy refresh secret $\ge 32$ characters |
| | `COOKIE_SECURE` | Yes | `true` (enforces HTTPS-only cookies) |
| | `COOKIE_DOMAIN` | No | Domain for cross-subdomain cookies (e.g. `.your-domain`) |
| **AI (Optional)** | `ENABLE_AI` | No | `true` or `false` |
| | `AI_PROVIDER` | No | `openai`, `google`, `anthropic`, or `mock` |
| | `AI_API_KEY` | No | Provider secret key |
| **Email (Optional)**| `ENABLE_EMAIL` | No | `true` or `false` |
| | `EMAIL_PROVIDER` | No | `resend`, `sendgrid`, `smtp`, or `mock` |
| | `EMAIL_API_KEY` | No | Provider secret key |
| | `EMAIL_FROM` | No | `CDSPrep <noreply@your-domain>` |
| **Storage (Opt.)** | `ENABLE_STORAGE` | No | `true` or `false` |
| | `STORAGE_PROVIDER` | No | `s3`, `r2`, or `local` |
| | `S3_ENDPOINT` | No | S3 / R2 endpoint URL |
| | `S3_BUCKET` | No | Object storage bucket name |
| | `S3_ACCESS_KEY_ID` | No | S3 access key ID |
| | `S3_SECRET_ACCESS_KEY` | No | S3 secret access key |
| **Monitoring** | `SENTRY_DSN` | No | Error tracking DSN |
| | `SENTRY_ENVIRONMENT` | No | `production` |

---

## 5. Environment Separation (Dev, Preview, Prod)

Vercel provides 3 distinct deployment environments:
- **Development**: Local developers running `pnpm dev` with local PostgreSQL and in-memory cache.
- **Preview**: Pull Requests and feature branches. Connected to Staging PostgreSQL (`cdsprep_staging`) and Staging Redis.
- **Production**: Merges to `main`. Connected to Production PostgreSQL (`cdsprep_prod`) and Production Redis.

> **Rule**: Never point Preview deployments to the Production database.

---

## 6. Step-by-Step Vercel Deployment Process

### Step 1: Push Repository to GitHub
Ensure the latest committed branch has all quality gates passing:
```bash
git push origin main
```

### Step 2: Import Web Project in Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select the repository and name the project `cdsprep-web`.
3. Set **Root Directory** to `apps/web`.
4. In **Build and Output Settings**:
   - Build Command: `cd ../.. && pnpm db:generate && pnpm --filter @cdsprep/web build`
   - Install Command: `cd ../.. && pnpm install --frozen-lockfile`
5. Configure Environment Variables for `cdsprep-web` as detailed in Section 4.1.
6. Click **Deploy**.

### Step 3: Import API Project in Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select the repository and name the project `cdsprep-api`.
3. Set **Root Directory** to `apps/api`.
4. In **Build and Output Settings**:
   - Build Command: `cd ../.. && pnpm db:generate && pnpm --filter @cdsprep/api build`
   - Install Command: `cd ../.. && pnpm install --frozen-lockfile`
5. Configure Environment Variables for `cdsprep-api` as detailed in Section 4.2.
6. Click **Deploy**.

### Step 4: Run Safe Database Migrations
Before directing user traffic, execute Prisma migrations against the production database using direct connection:
```bash
pnpm --filter @cdsprep/database db:migrate:deploy
```

### Step 5: Deploy Worker to Persistent Host
Deploy the worker process to Railway / Render / Fly.io pointing to the production Redis and PostgreSQL instances.

---

## 7. Verification & Smoke Test Checklist

Once preview or production URLs are generated:

1. **API Health Probe**:
   ```bash
   curl -I https://api.your-domain/api/health
   # Expected: HTTP/1.1 200 OK
   ```
2. **Frontend Page Load**:
   - Verify `/` loads with original high-stakes military UI.
   - Verify `/cds`, `/cds-maths`, `/cds-english`, `/cds-gk`, `/cds-pyq`, `/cds-mock-tests`, `/cds-preparation`.
   - Verify legal pages: `/privacy`, `/terms`, `/cookie-policy`, `/refund-policy`, `/about`, `/contact`.
3. **Authentication & Session**:
   - Register a new cadet account $\to$ Verify redirection to `/onboarding`.
   - Log out $\to$ Log back in $\to$ Confirm JWT cookie persistence and HttpOnly flag.
4. **Examination & Test Engine**:
   - Start practice drill or mock test.
   - Answer questions, mark for review, reload browser $\to$ confirm answer state persists.
   - Submit test $\to$ Verify instantaneous scorecard generation and zero broken analytics.

---

## 8. Rollback Procedure

If an unexpected regression occurs in production:

1. **Instant Vercel Instant Rollback**:
   - Go to Vercel Dashboard $\to$ `cdsprep-web` (or `cdsprep-api`) $\to$ **Deployments**.
   - Locate the previous successful deployment.
   - Click the three dots $\dots$ and select **Promote to Production**. Rollback completes in $< 2$ seconds.
2. **Database Rollback Considerations**:
   - All migrations in `packages/database/prisma/migrations` are additive.
   - If a schema rollback is required, apply the safe down-migration script as documented in `docs/production-database-runbook.md`.
