# External Services & Production Integrations Audit — CDSPrep

**Document:** Complete External Integrations & Secrets Audit  
**Phase:** 19 — External Services & Production Integrations  
**Auditor:** Antigravity Engineering  
**Scope:** `apps/web`, `apps/api`, `apps/worker`, `packages/*`, `docker/`, `.github/workflows/`, and `.env.*`  
**Date:** September 13, 2026  

---

## 1. Executive Summary

This comprehensive audit inspects all external dependencies, third-party integrations, credential management patterns, and security boundaries across the CDSPrep monorepo.

### Monorepo Search Sweep Results
- **Secrets in Source Code:** Verified clean. Zero plaintext production keys, API tokens, or hardcoded passwords exist in version-controlled source files.
- **`NEXT_PUBLIC_*` Variables:** Verified clean. Only client-safe public URLs (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`) are exposed to Next.js bundles.
- **Error Masks:** Verified active. Production error filters mask database exceptions, stack traces, and internal service credentials from API responses.
- **Required vs Optional Integrations:** Core persistence (PostgreSQL, Redis) is required; AI, email, cloud storage, payment gateway, OAuth, and external monitoring are abstracted with graceful degradation when unconfigured.

---

## 2. Comprehensive Integrations Audit Matrix

| Integration | Purpose | Current Implementation | Required / Optional | Environment Variables | Service Usage | Dev Requirements | Prod Requirements | Security Considerations | Fallback Behavior | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | Primary relational datastore (Users, Questions, Tests, Attempts, Results, Analytics) | Prisma ORM with connection pooling & composite indexes | **Required** | `DATABASE_URL`, `DATABASE_DIRECT_URL` | API, Worker | Docker container (`postgres:16-alpine`) | Managed RDS / Aurora / Supabase / Neon with SSL & connection pooling | Parameterized queries, password encryption, non-root user, private VPC subnet | Fail-fast at startup; API boots in degraded mode with 503 on `/api/ready` | `READY` |
| **Redis** | BullMQ task queues, distributed caching, session invalidation, and rate limiting | `ioredis` client with prefix scoping and TTL management | **Required** | `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS` | API, Worker | Docker container (`redis:7-alpine`) | Redis Cloud / Upstash / AWS ElastiCache with TLS and auth | Dedicated Redis password, prohibited sensitive key substrings (`password`, `secret`, `token`) | Graceful in-memory cache fallback; test runner functions without local Redis | `READY` |
| **AI Providers** | Question conceptual explanations, study recommendations, formula derivation | Provider interface (`MockAIProvider`, prompt builders, math verification) | **Feature-Dependent** | `AI_PROVIDER`, `AI_MODEL`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY` | API, Worker | `MockAIProvider` with deterministic test responses | Paid API keys from OpenAI / Google AI / Anthropic | Outbound timeouts, rate limits, token cost caps, deterministic math verification, no exam score modification | Falls back to pre-authored expert explanations stored in question bank | `NEEDS PROVIDERS` |
| **Email Service** | Account verification, password reset, test results, security notifications | Stubbed token generation with audit logging | **Required in Prod** | `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | API, Worker | Local mock transport or Mailpit/MailHog container | SendGrid / Resend / Amazon SES via API key or authenticated SMTP | Mask email addresses in logs, no secret leakage in templates, constant-time reset tokens | Fails gracefully with user notification without exposing provider errors | `NEEDS ABSTRACTION` |
| **Object Storage** | Mathematical diagrams, question figures, cadet avatars, syllabus documents | Metadata tracking in PostgreSQL (`FileAsset`), local endpoint stub | **Conditional** | `STORAGE_PROVIDER`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | API | MinIO Docker container or local filesystem | AWS S3 / Cloudflare R2 / Supabase Storage with signed URLs | Strict MIME/magic-byte validation, extension whitelist, private-by-default, path traversal prevention | Local disk storage or disabled uploads | `NEEDS S3 CLIENT` |
| **Search Engine** | Fast multi-criteria question, PYQ, and syllabus topic search | PostgreSQL full-text search and ILIKE index | **Required** | None (uses PostgreSQL datastore) | API | PostgreSQL full-text search | PostgreSQL FTS or OpenSearch / Meilisearch cluster | Input sanitization, rate limiting on search endpoint | Falls back to standard database query | `READY` |
| **Payment Gateway** | Subscription purchases, PRO tier access, exam series payments | Schema model (`Payment`, `Subscription`) with mock seed | **Feature-Dependent** | `PAYMENT_PROVIDER`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | API | Test mode credentials (`rzp_test_...`) | Verified Razorpay / Stripe merchant account with webhook signature verification | Server-side signature validation, idempotency key checking, never trust client-side success | Do not mark subscriptions active if payment verification fails | `NEEDS RAZORPAY ADAPTER` |
| **Monitoring & Sentry** | Error tracking, exception tracing, unhandled rejection alerts | Custom `AllExceptionsFilter` with structured logging | **Recommended** | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | Web, API, Worker | Local structured JSON logging | Sentry SaaS / self-hosted Sentry instance | Scrub PII, passwords, authorization headers, and credit card data prior to dispatch | Normal application operation continues without monitoring | `NEEDS SENTRY SDK` |
| **Product Analytics** | Cadet engagement tracking, test completion funnels, question drop-off | In-house `AnalyticsService` rollup | **Optional** | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Web | In-house database metrics | PostHog Cloud or Google Analytics 4 | Anonymized user identifiers, no PII, respect Do Not Track (DNT) headers | Zero impact on app operation if disabled | `OPTIONAL` |
| **Google OAuth** | One-click cadet sign-in and account registration | Email + Password credentials with Argon2id | **Optional** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | API, Web | Disabled by default; dev credentials | Google Cloud Console OAuth 2.0 Web Client | State parameter verification, redirect URI whitelisting, account linking protection | Standard email/password registration remains primary | `OPTIONAL` |
| **Bot / CAPTCHA** | Protection against credential stuffing and registration spam | IP rate limiting (5 req/min on auth) | **Prod Recommended**| `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | API, Web | Disabled in test & local development | Cloudflare Turnstile / Google reCAPTCHA v3 | Server-side token validation; never trust client-side status | Permissive bypass in development & CI | `NEEDS ADAPTER` |

---

## 3. Required Architectural Deliverables for Phase 19

Based on the audit findings, the following concrete implementations must be built:

1. **Central Configuration System (`packages/config`)**:
   - Create modular TypeScript configuration schemas with Zod validation.
   - Separate server-only secrets from client-safe variables.
   - Implement fail-fast startup verification (`validateServerEnv`).
2. **AI Provider Implementations (`packages/ai`)**:
   - Implement `OpenAIProvider` using official fetch/SDK.
   - Implement `GoogleAIProvider` (Gemini API).
   - Implement token cost tracking, timeout handling, exponential backoff with jitter, and user token limits.
3. **Transactional Email Service (`packages/email` & API Module)**:
   - Create provider abstraction (`EmailProvider`) with implementations: `SendGridProvider`, `ResendProvider`, `SmtpProvider`, `MockEmailProvider`.
   - Implement 8 responsive templates: Verification, Reset, Password Changed, Welcome, Test Result, Study Reminder, Weekly Summary, Security Alert.
4. **Cloud Object Storage (`packages/storage` or API Module)**:
   - Implement S3-compatible client (AWS S3 / Cloudflare R2 / MinIO) for presigned upload URLs, download URLs, and asset deletion.
5. **Search Abstraction (`packages/search`)**:
   - Package existing `PostgresSearchProvider` and provide interface for future OpenSearch integration.
6. **Payment System (Razorpay / Stripe)**:
   - Implement order creation, server-side signature verification (`HMAC-SHA256`), and idempotent webhook processing.
7. **Webhook Ingestion System (`apps/api/src/modules/webhooks`)**:
   - Dedicated webhook controller with cryptographic signature verification, replay protection, and idempotency tracking.
8. **Production Health Checks & Verification**:
   - Extend `/api/health` and `/api/ready` to report provider configuration status safely.
   - Create `pnpm validate:env` and `pnpm verify:integrations` CLI scripts.
9. **Operational Documentation**:
   - `docs/integration-matrix.md`
   - `docs/api-keys-setup.md`
   - `docs/secrets-management.md`
   - `docs/database-production.md`
   - `docs/phase-19-report.md`
