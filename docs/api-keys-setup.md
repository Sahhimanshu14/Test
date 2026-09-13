# CDSPrep Third-Party Integrations & API Keys Setup Runbook

This comprehensive guide details the exact operational steps, official developer portals, permission scopes, and configuration requirements for provisioning all 11 external services integrated into CDSPrep.

---

## Table of Contents
1. [PostgreSQL Database (Managed / Cloud)](#1-postgresql-database)
2. [Redis (Managed Cloud)](#2-redis-cache--queue-broker)
3. [OpenAI (AI Conceptual Tutor)](#3-openai-api-keys)
4. [Google Gemini (Alternative AI Provider)](#4-google-gemini-api)
5. [Resend (Primary Transactional Email)](#5-resend-transactional-email)
6. [SendGrid (Alternative Email Provider)](#6-sendgrid-email)
7. [Cloudflare R2 (Object Storage)](#7-cloudflare-r2-object-storage)
8. [AWS S3 (Alternative Object Storage)](#8-amazon-web-services-s3)
9. [Razorpay (Primary Payment Gateway - India/INR)](#9-razorpay-payments)
10. [Stripe (International Card Payments)](#10-stripe-payments)
11. [Cloudflare Turnstile (Bot & CAPTCHA Defense)](#11-cloudflare-turnstile)
12. [Sentry (Error & Performance Monitoring)](#12-sentry-application-monitoring)
13. [Google OAuth 2.0 (Social Sign-In)](#13-google-oauth-20)

---

## 1. PostgreSQL Database
CDSPrep requires PostgreSQL 16+ with extensions `pg_trgm`, `btree_gin`, and `uuid-ossp`.

### Recommended Cloud Providers
* **Supabase:** [supabase.com](https://supabase.com) (includes built-in PgBouncer pooler)
* **AWS RDS / Aurora:** [aws.amazon.com/rds/postgresql](https://aws.amazon.com/rds/postgresql)
* **Neon Serverless:** [neon.tech](https://neon.tech)

### Provisioning Steps
1. Create a new database named `cdsprep`.
2. Retrieve the pooled connection URI (Port 6543 for transaction pooling) and the direct connection URI (Port 5432).
3. Set environment variables:
   ```bash
   DATABASE_URL="postgresql://user:password@host:6543/cdsprep?pgbouncer=true&connection_limit=25&pool_timeout=10"
   DATABASE_DIRECT_URL="postgresql://user:password@host:5432/cdsprep"
   DATABASE_SSL=true
   ```
4. Deploy migrations: `pnpm db:migrate:deploy`.

---

## 2. Redis Cache & Queue Broker
Used for response caching, BullMQ background jobs, and rate limit tracking.

### Recommended Providers
* **Upstash Serverless Redis:** [upstash.com](https://upstash.com) (Native TLS, serverless pricing)
* **Aiven Redis:** [aiven.io/redis](https://aiven.io/redis)
* **AWS ElastiCache for Redis:** [aws.amazon.com/elasticache](https://aws.amazon.com/elasticache)

### Provisioning Steps
1. Create a Redis 7+ instance in the same cloud region as your backend (e.g. `ap-south-1` Mumbai).
2. Enable TLS/SSL connection requirement.
3. Retrieve connection details:
   ```bash
   REDIS_URL="rediss://default:YOUR_PASSWORD@your-instance.upstash.io:6379"
   REDIS_HOST="your-instance.upstash.io"
   REDIS_PORT=6379
   REDIS_PASSWORD="YOUR_PASSWORD"
   REDIS_TLS=true
   ```

---

## 3. OpenAI (AI Conceptual Tutor)
Powers mathematical step-by-step solutions, similar question generation, and study recommendations.

### Official Portal
* **URL:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Provisioning Steps
1. Sign in or register at `platform.openai.com`.
2. Under **Settings > Billing**, set up payment method and credit balance (minimum $5 recommended).
3. Navigate to **API Keys > Create new secret key**.
4. Choose key name: `cdsprep-production-tutor`.
5. Select Project Scope or Restricted Key with permissions:
   * `Model capabilities`: Write / Read (`gpt-4o-mini`, `gpt-4o`).
6. Copy the key (format: `sk-proj-...`). **It will only be shown once.**
7. Configure usage controls under **Usage Limits**:
   * Set Hard Monthly Limit (e.g. $100.00).
   * Set Soft Warning Limit (e.g. $75.00).
8. Set environment variables:
   ```bash
   ENABLE_AI=true
   AI_PROVIDER="openai"
   OPENAI_API_KEY="sk-proj-YOUR_KEY"
   AI_MODEL="gpt-4o-mini"
   AI_DAILY_USER_LIMIT=50
   ```

---

## 4. Google Gemini API
Cost-effective alternative AI provider.

### Official Portal
* **URL:** [aistudio.google.com](https://aistudio.google.com)

### Provisioning Steps
1. Sign in to Google AI Studio.
2. Click **Get API key > Create API key in new project**.
3. Copy the key (format: `AIzaSy...`).
4. Set environment variables:
   ```bash
   ENABLE_AI=true
   AI_PROVIDER="google"
   GOOGLE_AI_API_KEY="AIzaSyYOUR_KEY"
   AI_MODEL="gemini-1.5-flash"
   ```

---

## 5. Resend (Transactional Email)
High-deliverability email platform used for verification, password resets, and score alerts.

### Official Portal
* **URL:** [resend.com](https://resend.com)

### Provisioning Steps
1. Create an account at `resend.com`.
2. Under **Domains > Add Domain**, enter your sender domain (e.g. `mail.cdsprep.com` or `cdsprep.com`).
3. Add the required DNS records in your domain registrar (Cloudflare / Route 53):
   * `TXT`: SPF record (`v=spf1 include:amazonses.com ~all`)
   * `CNAME`: 3 DKIM keys provided by Resend
   * `TXT`: DMARC record (`v=DMARC1; p=quarantine; rua=mailto:dmarc@cdsprep.com`)
4. Wait for domain verification to display **Verified** status.
5. Under **API Keys > Create API Key**:
   * Name: `cdsprep-api-key`
   * Permissions: **Sending Access** (or Full Access)
   * Domain: select your verified sending domain
6. Copy the key (format: `re_...`).
7. Set environment variables:
   ```bash
   ENABLE_EMAIL=true
   EMAIL_PROVIDER="resend"
   EMAIL_API_KEY="re_YOUR_KEY"
   EMAIL_FROM="CDSPrep Admissions <notifications@cdsprep.com>"
   ```

---

## 6. SendGrid Email
Enterprise alternate transactional email provider.

### Official Portal
* **URL:** [app.sendgrid.com](https://app.sendgrid.com)

### Provisioning Steps
1. Register at SendGrid.
2. Complete Sender Identity Verification (Single Sender or Domain Authentication).
3. Navigate to **Settings > API Keys > Create API Key**.
4. Grant **Restricted Access > Mail Send (Full Access)**.
5. Copy API key (format: `SG....`).
6. Set environment variables:
   ```bash
   ENABLE_EMAIL=true
   EMAIL_PROVIDER="sendgrid"
   EMAIL_API_KEY="SG.YOUR_KEY"
   EMAIL_FROM="notifications@cdsprep.com"
   ```

---

## 7. Cloudflare R2 (Object Storage)
S3-compatible cloud object storage with **zero egress bandwidth fees**.

### Official Portal
* **URL:** [dash.cloudflare.com](https://dash.cloudflare.com) > R2 Object Storage

### Provisioning Steps
1. Navigate to **R2 > Overview > Create Bucket**.
2. Bucket Name: `cdsprep-production-assets`.
3. Under **Settings > Custom Domains**, connect a public subdomain (e.g. `assets.cdsprep.com`).
4. Under **Settings > CORS Policy**, apply the following rule:
   ```json
   [
     {
       "AllowedOrigins": ["https://cdsprep.com", "https://app.cdsprep.com"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. Navigate to **R2 > Manage R2 API Tokens > Create API Token**.
   * Permissions: **Object Read & Write**.
   * Apply to bucket: `cdsprep-production-assets`.
6. Retrieve:
   * **Endpoint:** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   * **Access Key ID**
   * **Secret Access Key**
7. Set environment variables:
   ```bash
   ENABLE_STORAGE=true
   STORAGE_PROVIDER="r2"
   S3_BUCKET="cdsprep-production-assets"
   S3_REGION="auto"
   S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
   S3_ACCESS_KEY_ID="YOUR_R2_ACCESS_KEY_ID"
   S3_SECRET_ACCESS_KEY="YOUR_R2_SECRET_ACCESS_KEY"
   S3_PUBLIC_CDN_URL="https://assets.cdsprep.com"
   ```

---

## 8. Amazon Web Services (S3)
Standard AWS S3 storage alternative.

### Official Portal
* **URL:** [console.aws.amazon.com/s3](https://console.aws.amazon.com/s3)

### Provisioning Steps
1. Create S3 Bucket `cdsprep-assets` in region `ap-south-1` (Mumbai).
2. Block public access (keep default enabled). Use CloudFront or presigned URLs.
3. In AWS IAM Console:
   * Create IAM User: `cdsprep-app-storage`.
   * Attach policy allowing `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::cdsprep-assets/*`.
   * Create Access Keys (Programmatic Access).
4. Set environment variables:
   ```bash
   ENABLE_STORAGE=true
   STORAGE_PROVIDER="s3"
   S3_BUCKET="cdsprep-assets"
   S3_REGION="ap-south-1"
   S3_ACCESS_KEY_ID="AKIA..."
   S3_SECRET_ACCESS_KEY="..."
   ```

---

## 9. Razorpay Payments
Primary payment gateway for Indian defense aspirants (UPI, NetBanking, RuPay/Visa/Mastercard).

### Official Portal
* **URL:** [dashboard.razorpay.com](https://dashboard.razorpay.com)

### Provisioning Steps
1. Sign in to Razorpay Dashboard.
2. Toggle between **Test Mode** (during staging) and **Live Mode** (production).
3. Navigate to **Account & Settings > API Keys > Generate Key**.
   * Copy **Key ID** (format: `rzp_test_...` or `rzp_live_...`).
   * Copy **Key Secret**.
4. Navigate to **Account & Settings > Webhooks > Add New Webhook**.
   * Webhook URL: `https://api.cdsprep.com/api/v1/webhooks/razorpay`
   * Secret: generate random 32-char string (`openssl rand -hex 16`).
   * Active Events:
     * `payment.captured`
     * `payment.failed`
     * `order.paid`
5. Set environment variables:
   ```bash
   ENABLE_PAYMENTS=true
   PAYMENT_PROVIDER="razorpay"
   PAYMENT_CURRENCY="INR"
   RAZORPAY_KEY_ID="rzp_live_..."
   RAZORPAY_KEY_SECRET="..."
   RAZORPAY_WEBHOOK_SECRET="..."
   ```

---

## 10. Stripe Payments
Used for international cadets or cards.

### Official Portal
* **URL:** [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

### Provisioning Steps
1. Sign in to Stripe Dashboard.
2. Copy **Publishable Key** (`pk_live_...` or `pk_test_...`) and **Secret Key** (`sk_live_...` or `sk_test_...`).
3. Under **Developers > Webhooks > Add Destination**:
   * Endpoint: `https://api.cdsprep.com/api/v1/webhooks/stripe`
   * Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Reveal the **Signing Secret** (`whsec_...`).
5. Set environment variables:
   ```bash
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

---

## 11. Cloudflare Turnstile
Non-intrusive CAPTCHA alternative protecting login, registration, and password reset endpoints.

### Official Portal
* **URL:** [dash.cloudflare.com](https://dash.cloudflare.com) > Turnstile

### Provisioning Steps
1. Click **Add Site**.
2. Site Name: `CDSPrep Web`.
3. Domains: `cdsprep.com`, `app.cdsprep.com`, `localhost` (for dev).
4. Widget Mode: **Managed** (or Non-interactive).
5. Retrieve:
   * **Site Key** (Public): `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
   * **Secret Key** (Private): `CAPTCHA_SECRET_KEY`
6. Set environment variables:
   ```bash
   CAPTCHA_PROVIDER="turnstile"
   CAPTCHA_SECRET_KEY="0x4AAAAAA..."
   NEXT_PUBLIC_CAPTCHA_SITE_KEY="0x4AAAAAA..."
   ```

---

## 12. Sentry Application Monitoring
Real-time exception capture, crash diagnostics, and performance tracing.

### Official Portal
* **URL:** [sentry.io](https://sentry.io)

### Provisioning Steps
1. Create a Project in Sentry: Platform **Node.js / Express / NestJS**.
2. Retrieve the Project DSN (`https://<key>@o<org>.ingest.sentry.io/<project>`).
3. Set environment variables:
   ```bash
   SENTRY_DSN="https://key@o0.ingest.sentry.io/0000000"
   SENTRY_ENVIRONMENT="production"
   SENTRY_RELEASE="cdsprep@1.0.0"
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

---

## 13. Google OAuth 2.0
Enables one-click social sign-in for candidates.

### Official Portal
* **URL:** [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

### Provisioning Steps
1. Create a GCP Project: `cdsprep-production`.
2. Configure **OAuth Consent Screen**:
   * User Type: External
   * App name: CDSPrep
   * Authorized domains: `cdsprep.com`
3. Under **Credentials > Create Credentials > OAuth client ID**:
   * Application type: Web application
   * Authorized JavaScript origins: `https://cdsprep.com`, `http://localhost:3000`
   * Authorized redirect URIs: `https://api.cdsprep.com/api/v1/auth/google/callback`
4. Copy **Client ID** and **Client Secret**.
5. Set environment variables:
   ```bash
   GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
   ```

---

## 14. Verification Command
Once all variables are configured in your target environment, run:

```bash
pnpm verify:integrations
```

This verifies that all schemas conform, no secrets leak into browser bundles, and prints a sanitized provider operational report.
