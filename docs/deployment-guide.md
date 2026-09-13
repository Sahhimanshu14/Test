# CDS Prep Platform — Cloud Deployment Guide
**Target Architecture**: **Vercel** (Frontend) + **Railway** (NestJS REST API) + **Supabase** (PostgreSQL Database)

This guide walks you step-by-step through deploying your repository ([https://github.com/Sahhimanshu14/Test](https://github.com/Sahhimanshu14/Test)) to production with free-tier friendly services.

---

## Architecture Topology

```
┌────────────────────────────────────────┐
│           Vercel Edge Network          │
│        (Next.js 15 Web Frontend)       │
│        https://your-app.vercel.app     │
└───────────────────┬────────────────────┘
                    │
           HTTPS /api/v1/* (Proxy)
                    │
                    ▼
┌────────────────────────────────────────┐
│              Railway App               │
│        (NestJS 11 REST API Engine)     │
│      https://api-xxx.up.railway.app    │
└───────────────┬────────────┬───────────┘
                │            │
          Prisma Pool    Redis Cache
                │            │
                ▼            ▼
┌─────────────────────┐  ┌───────────────┐
│      Supabase       │  │ Railway Redis │
│ (PostgreSQL 16 DB)  │  │  (Optional)   │
└─────────────────────┘  └───────────────┘
```

---

## Step 1: Create Database on Supabase (2 Minutes)

1. Go to [https://supabase.com](https://supabase.com) and click **Start your project** (Free).
2. Create a new project:
   - **Name**: `cdsprep-db`
   - **Database Password**: Choose a strong password (save this securely).
   - **Region**: Choose a region closest to your users (e.g., `South Asia (Mumbai)` or `East US`).
3. Once the database is provisioned, go to **Project Settings** -> **Database**.
4. Under **Connection string**, select **URI**:
   - **Transaction Pooler (Port 6543)**:
     ```
     postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
     *(This is your `DATABASE_URL`)*
   - **Direct Session (Port 5432)**:
     ```
     postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
     *(This is your `DIRECT_URL`)*

---

## Step 2: Push Schema and Seed Questions to Supabase

From your local machine, apply the Prisma schema and seed the CDS taxonomy and curated questions to Supabase:

```powershell
# Set temporary environment variables in your terminal
$env:DATABASE_URL="postgres://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgres://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
$env:ALLOW_PROD_SEED="true"

# Push the schema and create tables in Supabase
pnpm db:push

# Seed roles, permissions, subjects, chapters, topics, and all 25 curated questions
pnpm db:seed
```

---

## Step 3: Deploy Backend REST API on Railway (3 Minutes)

1. Go to [https://railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository: **`Sahhimanshu14/Test`**.
4. Railway will automatically detect the root [`railway.json`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/railway.json) and use [`apps/api/Dockerfile`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/apps/api/Dockerfile).
5. Click on the newly created service -> **Variables** tab, and add:

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `DATABASE_URL` | `postgresql://postgres.qwykkylfvvpqrbwbptol:Himanshu2003%40@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase Transaction Pooler URL |
| `DIRECT_URL` | `postgresql://postgres.qwykkylfvvpqrbwbptol:Himanshu2003%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` | Supabase Direct Session URL |
| `JWT_ACCESS_SECRET` | `cdsprep_super_secret_access_jwt_key_at_least_32_chars_2026` | Access token secret (>= 32 chars) |
| `JWT_REFRESH_SECRET` | `cdsprep_super_secret_refresh_jwt_key_at_least_32_chars_2026` | Refresh token secret (>= 32 chars) |
| `CORS_ORIGIN` | `https://*.vercel.app` | Allowed frontend origin (supports wildcards) |
| `STORAGE_PROVIDER` | `local` | Upload storage provider |
| `AI_PROVIDER` | `mock` | AI assistant fallback |

6. Go to the **Settings** tab -> **Networking** -> Click **Generate Domain**.
   - Your API will be accessible at: `https://api-xxxx.up.railway.app`.
   - Verify health: `https://api-xxxx.up.railway.app/api/v1/health`.

---

## Step 4: Deploy Next.js Frontend on Vercel (2 Minutes)

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** -> **Project**.
3. Select **`Sahhimanshu14/Test`** from your repository list.
4. Vercel automatically detects Next.js via [`vercel.json`](file:///c:/Users/sahhi/Desktop/New%20folder%20%282%29/vercel.json):
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `pnpm --filter @cdsprep/web build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install`
5. Expand **Environment Variables** and add:

| Environment Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api-xxxx.up.railway.app/api/v1` *(Your Railway API URL)* |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` *(Your Vercel URL)* |

6. Click **Deploy**!
   - In ~60 seconds, your site will be live at: `https://your-project.vercel.app`.

---

## Step 5: Post-Deployment Verification

1. **API Health**: Visit `https://api-xxxx.up.railway.app/api/v1/health` (Should return `{ "status": "ok" }`).
2. **Swagger Docs**: Visit `https://api-xxxx.up.railway.app/api/docs`.
3. **Practice Portal**: Visit `https://your-project.vercel.app/practice` to solve live CDS questions.
4. **Login Verification**:
   - **Admin**: `admin@cdsprep.com` / `Cdsprep@2026` at `/login`
   - **Student**: `student@cdsprep.com` / `Cdsprep@2026` at `/login`
