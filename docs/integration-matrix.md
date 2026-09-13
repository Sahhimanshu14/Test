# CDSPrep External Services & Integrations Architecture Matrix

This document provides the definitive operational matrix of all external third-party services, APIs, and credentials integrated into the CDSPrep platform.

---

## 1. Integrations Summary Matrix

| Service Area | Primary Provider | Supported Alternates | Required In Prod? | Env Variables | Fallback Strategy | Secret Location |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Relational Database** | PostgreSQL 16+ | AWS RDS, Supabase, Neon | **YES** | `DATABASE_URL`, `DATABASE_DIRECT_URL` | None (Fail fast at startup) | Server-side only |
| **Cache & Queue Broker** | Redis 7+ | Upstash, Aiven, ElastiCache | **YES** | `REDIS_URL`, `REDIS_PASSWORD` | In-memory cache fallback | Server-side only |
| **AI Conceptual Tutor** | OpenAI (`gpt-4o-mini`) | Google Gemini, Mock | Optional (Feature flagged) | `ENABLE_AI`, `AI_PROVIDER`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY` | `MockAIProvider` / Graceful error | Server-side only |
| **Transactional Email** | Resend | SendGrid, Mock | Optional (Feature flagged) | `ENABLE_EMAIL`, `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | `MockEmailProvider` (memory logs) | Server-side only |
| **Cloud Object Storage** | Cloudflare R2 | AWS S3, MinIO, Supabase | Optional (Feature flagged) | `ENABLE_STORAGE`, `STORAGE_PROVIDER`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Local disk (`/uploads`) | Server-side only |
| **Payment Gateway** | Razorpay | Stripe, Mock | Optional (Feature flagged) | `ENABLE_PAYMENTS`, `PAYMENT_PROVIDER`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | `MockPaymentProvider` | Server-side only |
| **Search Engine** | PostgreSQL FTS | OpenSearch, Mock | **YES** | `SEARCH_PROVIDER`, `SEARCH_PAGE_SIZE` | PostgreSQL Trigram FTS | Server-side only |
| **Error Monitoring** | Sentry | None (Console logger) | Recommended | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | Standard Winston/NestJS logger | Server & Client |
| **Bot Protection** | Cloudflare Turnstile | Google reCAPTCHA, None | Optional | `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET_KEY` | Bypassed when `none` | Server-side only |
| **Social Authentication**| Google OAuth 2.0 | None (Email/Argon2id) | Optional | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Standard email/password login | Server-side only |

---

## 2. Service-Specific Architecture & Security Design

### 2.1 Relational Database (PostgreSQL)
* **Protocol:** PostgreSQL wire protocol with TLS enforced (`sslmode=require` in production).
* **Connection Pooling:** Pool size managed via `DATABASE_POOL_SIZE` (default: 25-30). Transaction mode poolers (PgBouncer) utilize `DATABASE_URL`, while schema migrations utilize `DATABASE_DIRECT_URL`.
* **Sanitization:** Password and user credentials in connection URIs are automatically redacted by `sanitizeDatabaseUrl()` before logging or health reporting.

### 2.2 In-Memory Cache & Message Queues (Redis)
* **Security:** Support for Redis AUTH (`REDIS_PASSWORD`) and TLS (`rediss://` protocol).
* **Resilience:** If Redis becomes temporarily unreachable, `CacheService` degrades gracefully to high-performance local memory cache with zero downtime.

### 2.3 AI Conceptual Tutor (`@cdsprep/ai`)
* **Security:** API keys are never bundled into client assets or logged in database interactions.
* **Cost Controls:** `AICostTracker` enforces daily quotas (`AI_DAILY_USER_LIMIT=50`) and monthly limits (`AI_MONTHLY_USER_LIMIT=500`) to prevent denial-of-wallet attacks.
* **Transient Resilience:** Automated exponential backoff with jitter on HTTP 429 and 5xx responses up to 2 retries.

### 2.4 Transactional Email Service (`@cdsprep/email`)
* **Templates:** 8 responsive, accessible, CDSPrep-branded email templates:
  1. `createEmailVerificationTemplate`: 6-digit OTP and secure one-click link.
  2. `createPasswordResetTemplate`: 1-hour expiration link with IP logging.
  3. `createPasswordChangedTemplate`: Immediate security alert.
  4. `createWelcomeCadetTemplate`: Target academy mission debrief.
  5. `createTestResultTemplate`: Net score, accuracy, AIR rank summary.
  6. `createStudyReminderTemplate`: Daily streak protection reminder.
  7. `createWeeklySummaryTemplate`: 7-day study intelligence digest.
  8. `createSecurityAlertTemplate`: Suspicious login notifications.
* **Hermetic Testing:** `MockEmailProvider` stores sent messages in memory for test verification without external network requests.

### 2.5 Cloud Object Storage (`@cdsprep/storage`)
* **Architecture:** Presigned PUT URLs for client uploads directly to object storage; presigned GET URLs or CDN URLs for downloads.
* **Signature Algorithm:** Standard AWS Signature Version 4 (SigV4) implemented using native Node.js crypto (zero heavy SDK runtime overhead).
* **Storage Providers:** AWS S3, Cloudflare R2 (zero egress fees), MinIO (local dev), Supabase Storage.

### 2.6 Payment Gateway & Webhooks (`@cdsprep/payments`)
* **Providers:** Razorpay (primary for INR / UPI / NetBanking), Stripe (international credit cards), Mock (testing).
* **Signature Verification:** Cryptographic HMAC-SHA256 signature verification using `crypto.timingSafeEqual` against timing side-channel attacks.
* **Replay Protection:** Stripe webhooks enforce a strict 300-second (5 minute) timestamp tolerance window.
* **Idempotency:** Webhook ingestion maintains an in-memory event deduplication store (`isEventProcessed`) preventing duplicate fulfillment.

### 2.7 Search Engine (`@cdsprep/search`)
* **PostgreSQL Full-Text Search:** Built-in `tsvector` and `tsquery` search with rank normalization and GIN indexing.
* **OpenSearch / Elasticsearch:** REST API provider supporting multi-match queries with field boosting (`title^2`) and fuzziness.

---

## 3. Environment Variable Security Matrix

| Variable | Scope | Safe for Client? | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend | ❌ NEVER | Database connection URI with password |
| `REDIS_PASSWORD` | Backend | ❌ NEVER | Redis authentication token |
| `JWT_ACCESS_SECRET` | Backend | ❌ NEVER | 64-byte secret for signing user tokens |
| `JWT_REFRESH_SECRET` | Backend | ❌ NEVER | 64-byte secret for refresh tokens |
| `OPENAI_API_KEY` | Backend | ❌ NEVER | OpenAI platform secret API key |
| `EMAIL_API_KEY` | Backend | ❌ NEVER | Resend / SendGrid delivery key |
| `S3_SECRET_ACCESS_KEY` | Backend | ❌ NEVER | Object storage private access key |
| `RAZORPAY_KEY_SECRET` | Backend | ❌ NEVER | Razorpay private webhook / API secret |
| `STRIPE_SECRET_KEY` | Backend | ❌ NEVER | Stripe private API key |
| `NEXT_PUBLIC_APP_URL` | Frontend | ✅ Safe | Public web app domain (e.g. `https://cdsprep.com`) |
| `NEXT_PUBLIC_API_URL` | Frontend | ✅ Safe | Public backend API URL |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | Frontend | ✅ Safe | Cloudflare Turnstile public site key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Frontend | ✅ Safe | Analytics public client ingestion key |
