# Technical Requirements Document (TRD) — CDSPrep

**System Name:** CDSPrep Platform Core Architecture  
**Engineering Standard:** Production-Grade TypeScript-First Monorepo  
**Target Version:** 1.0.0

---

## 1. System Technology Stack & Version Matrix

| Tier                    | Technology / Library             | Version                           | Role / Justification                                                                               |
| :---------------------- | :------------------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Monorepo Manager**    | pnpm + Turborepo                 | pnpm v12+, Turbo v2+              | Strict dependency hoisting, lightning-fast workspace linking, distributed cache                    |
| **Frontend Framework**  | Next.js (App Router)             | 15.x / 16.x (React 19)            | Server Components for zero-bundle SEO pages; Client components for interactive exam UI             |
| **Language**            | TypeScript                       | 5.6+                              | Strict mode enabled throughout (`noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`) |
| **UI Components**       | Tailwind CSS + Radix UI + Lucide | Tailwind v3.4+, Radix Primitives  | High accessibility (WCAG 2.2 AA), restrained defence-aesthetic design system                       |
| **Data Fetching**       | TanStack Query                   | v5.x                              | Optimistic updates, cache invalidation, debounced mutations for test autosave                      |
| **Mathematical Engine** | KaTeX                            | 0.16+                             | Fast client/server mathematical typesetting for Arithmetic, Algebra, and Geometry                  |
| **Visual Analytics**    | Recharts                         | 2.13+                             | SVG-based responsive scorecards, performance trendlines, topic radar charts                        |
| **Backend Framework**   | NestJS                           | 11.x                              | Modular architecture, native dependency injection, decorators, class-validator DTOs                |
| **Database ORM**        | PostgreSQL + Prisma ORM          | Postgres 16+, Prisma 6+           | Fully typed relational queries, atomic transactions, schema migrations                             |
| **Caching & Queues**    | Redis + BullMQ                   | Redis 7+, BullMQ 5+               | Fast session state, rate limiting, async workers for notifications, email, and imports             |
| **Authentication**      | Passport.js + Argon2 + JWT       | JWT, Argon2id                     | Cryptographic password hashing, short-lived access JWT, HTTP-only refresh tokens                   |
| **Validation**          | Zod + class-validator            | Zod 3.x / class-validator 0.14+   | End-to-end schema validation shared across frontend forms and backend DTOs                         |
| **AI Abstraction**      | Custom Provider (`packages/ai`)  | OpenAI SDK / Google GenAI SDK     | Decoupled adapter interface for LLM explanations and question synthesis                            |
| **Documentation**       | Swagger / OpenAPI                | OpenAPI 3.0 via `@nestjs/swagger` | Auto-generated interactive API explorer and client SDK generation                                  |

---

## 2. Monorepo Architecture (`cdsprep`)

The monorepo uses `pnpm-workspace.yaml` and Turborepo pipeline caching:

```text
cdsprep/
├── apps/
│   ├── web/                     # Next.js 15 App Router (Student app, Public portal, Admin)
│   ├── api/                     # NestJS 11 REST API server
│   └── worker/                  # BullMQ Background Job Processor
├── packages/
│   ├── ui/                      # Shared design system components & KaTeX renderers
│   ├── database/                # Prisma schema, migrations, seeders, and client wrapper
│   ├── types/                   # Shared TypeScript interfaces, enums, API contracts
│   ├── validation/              # Shared Zod validation schemas for forms & DTOs
│   ├── config/                  # Shared ESLint, Prettier, TypeScript base configs
│   └── ai/                      # AI provider abstraction, prompts, schema validation
├── docs/                        # Architectural documentation
├── docker/                      # Multi-stage production & dev Docker configurations
├── .github/workflows/           # Automated CI/CD pipelines
├── docker-compose.yml           # Multi-service local composition
└── pnpm-workspace.yaml          # Workspace mapping configuration
```

---

## 3. Authoritative Test Engine Technical Specification

To satisfy Rule 1 and prevent client-side manipulation, test attempts operate under a **Strict Server-Authoritative State Machine**:

```
[Candidate Starts Test]
       │
       ▼
POST /api/test-attempts
  ├── Verify test eligibility & prerequisites
  ├── Create TestAttempt record with:
  │     startedAt = NOW()
  │     expiresAt = NOW() + (test.durationMinutes * 60)
  │     status = IN_PROGRESS
  ├── Initialize AttemptQuestionState for all questions (state: UNVISITED)
  └── Return Attempt session (excludes correct answers and explanations)
       │
       ▼
[Active Examination Cycle]
  ├── Candidate navigates questions (Client renders state from AttemptQuestionState)
  ├── Candidate selects option:
  │     PUT /api/test-attempts/:id/answer (Debounced 300ms)
  │     Body: { questionId, selectedOptionId, state: ANSWERED, timeSpentSeconds }
  │     Backend:
  │       1. Check NOW() <= attempt.expiresAt (reject with 403 if expired)
  │       2. Upsert AttemptAnswer record in PostgreSQL
  │       3. Update AttemptQuestionState
  ├── Candidate toggles Review:
  │     PUT /api/test-attempts/:id/state
  │     Body: { questionId, state: MARKED_FOR_REVIEW }
  └── Client heartbeat checks remaining time against server clock every 30 seconds
       │
       ▼
[Attempt Finalization (User Action or Server Auto-Submit)]
  POST /api/test-attempts/:id/submit
  Backend Atomic Transaction:
    1. Lock TestAttempt row (SELECT FOR UPDATE)
    2. Mark status = SUBMITTED, submittedAt = NOW()
    3. Query all candidate AttemptAnswers vs official QuestionOptions
    4. Compute:
         - totalQuestions, attemptedCount, correctCount, incorrectCount, skippedCount
         - grossMarks = sum(correct * question.marks)
         - negativeMarks = sum(incorrect * question.negativeMarks)
         - netScore = max(0, grossMarks - negativeMarks)
         - accuracy = (correctCount / attemptedCount) * 100
    5. Generate Result, ResultSubject, ResultTopic records
    6. Populate Mistake table for every incorrect answer
    7. Dispatch BullMQ job: 'aggregate-student-analytics' & 'update-leaderboard'
    8. Return completed Result payload with detailed solutions
```

### 3.1 Timer Synchronization & Recovery

- The server timestamp is the single source of truth.
- When an exam session loads or recovers after a network disconnect, the client fetches:
  $$\text{remainingSeconds} = \max\left(0, \frac{\text{expiresAt} - \text{NOW()}}{1000}\right)$$
- If $\text{NOW()} > \text{expiresAt} + 10\text{ seconds}$, the server automatically triggers the submission transaction upon the next request or via a BullMQ delayed job scheduled at $\text{expiresAt}$.

---

## 4. Backend Modular Design (NestJS)

The NestJS backend (`apps/api/src`) is partitioned into independent domain modules:

```text
apps/api/src/
├── app.module.ts
├── common/
│   ├── decorators/          # @CurrentUser(), @Roles(), @Public()
│   ├── filters/             # Centralized AllExceptionsFilter, PrismaClientExceptionFilter
│   ├── guards/              # JwtAuthGuard, RolesGuard, RateLimitGuard
│   ├── interceptors/        # ResponseTransformInterceptor, LoggingInterceptor
│   └── pipes/               # ZodValidationPipe, ParseUUIDPipe
├── modules/
│   ├── auth/                # Login, Register, Refresh, Forgot Password, Reset
│   ├── users/               # Profile, User management, Academy preferences
│   ├── subjects/            # English, GK, Mathematics metadata
│   ├── chapters/            # Chapter hierarchy within subjects
│   ├── topics/              # Topic hierarchy within chapters
│   ├── questions/           # Question Bank CRUD, KaTeX support, difficulty
│   ├── pyqs/                # 20-Year PYQ catalog, papers, year/session filters
│   ├── tests/               # Test configuration, section builder, instructions
│   ├── test-attempts/       # Authoritative test execution, autosave, submission
│   ├── answers/             # Real-time answer persistence & state transitions
│   ├── results/             # Score calculation, subject/topic scorecards
│   ├── analytics/           # Longitudinal accuracy, speed, weak topic detection
│   ├── bookmarks/           # Question bookmarking & revision filters
│   ├── mistakes/            # Mistake notebook, careless vs conceptual tracking
│   ├── notifications/       # In-app notifications & email dispatch
│   ├── leaderboard/         # Weekly/Monthly ranking calculations
│   ├── ai/                  # Question explanation, study planner, question generation
│   ├── admin/               # Platform oversight, bulk import, system metrics
│   ├── audit/               # Non-tamperable audit log recorder
│   ├── search/              # Global full-text search across questions and tests
│   └── files/               # Secure S3-compatible file asset uploads
```

---

## 5. Standardized API Protocol & Error Taxonomy

### 5.1 Success Envelope

Every successful response is wrapped uniformly:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### 5.2 Failure Envelope

Every error response emits a structured, machine-readable format:

```json
{
  "success": false,
  "error": {
    "code": "TEST_TIME_EXPIRED",
    "message": "The allotted duration for this examination has concluded.",
    "details": [
      {
        "field": "expiresAt",
        "issue": "Attempt expired at 2026-09-09T08:00:00Z"
      }
    ],
    "timestamp": "2026-09-09T08:00:15.120Z",
    "path": "/api/test-attempts/a1b2c3d4/answer"
  }
}
```

### 5.3 Error Code Constants

- `UNAUTHORIZED` (401) — Missing or expired JWT.
- `FORBIDDEN` (403) — Insufficient RBAC permission.
- `VALIDATION_ERROR` (400) — Input failed schema constraints.
- `ENTITY_NOT_FOUND` (404) — Requested resource does not exist.
- `ATTEMPT_ALREADY_SUBMITTED` (409) — Cannot mutate finished exam.
- `RATE_LIMIT_EXCEEDED` (429) — Sliding window threshold breached.
- `INTERNAL_SERVER_ERROR` (500) — Unhandled failure; logged with unique Trace ID.

---

## 6. Asynchronous Processing & Queue Architecture

BullMQ manages asynchronous workloads backed by Redis:

| Queue Name            | Job Identifier              | Purpose                           | Concurrency |
| :-------------------- | :-------------------------- | :-------------------------------- | :---------- |
| `notifications-queue` | `send-welcome-email`        | Transactional email dispatch      | 5           |
| `notifications-queue` | `send-password-reset`       | Time-sensitive token delivery     | 10          |
| `analytics-queue`     | `aggregate-attempt-metrics` | Post-exam performance calculation | 10          |
| `analytics-queue`     | `refresh-leaderboard`       | Periodic recalculation of ranks   | 2           |
| `imports-queue`       | `process-bulk-questions`    | CSV/JSON parsing, row validation  | 2           |
| `ai-queue`            | `verify-math-generation`    | Deterministic equation checking   | 3           |

---

## 7. Performance Budgets & Bundling Strategy

1. **Client Bundle Budget**:
   - Initial JS bundle for student routes $< 160\text{ KB}$ gzipped.
   - Heavy math (KaTeX) and charting (Recharts) dynamically imported (`next/dynamic` with `ssr: false` where appropriate).
2. **Caching Strategy**:
   - Static syllabus and subject taxonomy cached in Redis with a 24-hour TTL (`CACHE_SYLLABUS_KEY`).
   - Leaderboard cached with a 5-minute TTL.
   - User profile and active test state cached in Redis with immediate eviction upon write.
3. **Database Indexing**:
   - Multi-column composite index on `Question(subjectId, chapterId, topicId, difficulty)`.
   - Index on `TestAttempt(userId, status, createdAt)`.
   - Index on `AttemptAnswer(testAttemptId, questionId)`.
