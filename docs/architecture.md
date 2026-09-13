# System Architecture & Monorepo Design — CDSPrep

**Document:** System Architecture & Monorepo Design  
**Framework:** C4 Architectural Model + Monorepo Layout  
**Platform:** CDSPrep

---

## 1. High-Level Architecture Overview (C4 Context Diagram)

```mermaid
C4Context
    title System Context Diagram — CDSPrep Examination Platform

    Person(aspirant, "CDS Aspirant", "Studies syllabus, drills PYQs, takes timed mock tests, reviews mistakes")
    Person(admin, "Content Admin / Faculty", "Curates question bank, imports PYQs, reviews AI questions, creates tests")

    Enterprise_Boundary(cdsprep_boundary, "CDSPrep System") {
        System(webApp, "Next.js Web Application", "Delivers student experience, interactive exam UI, and admin panel")
        System(apiServer, "NestJS REST API Server", "Enforces business logic, RBAC, authoritative scoring, and state machine")
        System(backgroundWorker, "BullMQ Background Worker", "Processes email dispatch, batch analytics, and bulk question imports")
        SystemDb(postgres, "PostgreSQL Database", "Relational persistence for users, questions, PYQs, tests, and results")
        SystemDb(redis, "Redis In-Memory Store", "Session caching, rate limiting, and BullMQ queue management")
    }

    System_Ext(mailService, "SMTP / Email Provider", "Transactional email delivery (Verification, Passwords)")
    System_Ext(s3Storage, "S3 Object Storage", "Stores uploaded question diagrams, answer sheets, and PDFs")
    System_Ext(aiProvider, "LLM AI Provider (OpenAI / Gemini)", "Provides contextual question explanations and draft generation")

    Rel(aspirant, webApp, "Uses", "HTTPS / WSS")
    Rel(admin, webApp, "Manages content through", "HTTPS")
    Rel(webApp, apiServer, "Fetches data & submits tests", "JSON / REST")
    Rel(apiServer, postgres, "Reads/Writes relational data", "Prisma ORM")
    Rel(apiServer, redis, "Caches & manages jobs", "ioredis")
    Rel(backgroundWorker, redis, "Pulls queue jobs", "BullMQ")
    Rel(backgroundWorker, postgres, "Updates analytics & bulk data", "Prisma ORM")
    Rel(backgroundWorker, mailService, "Dispatches emails", "SMTP")
    Rel(apiServer, s3Storage, "Uploads/serves media", "AWS S3 SDK")
    Rel(apiServer, aiProvider, "Requests explanations & generation", "REST API")
```

---

## 2. Container Diagram (C4 Containers)

```mermaid
graph TD
    subgraph Client Tier
        Browser["Modern Web Browser (Desktop / Mobile / Tablet)"]
    end

    subgraph Edge & Routing Tier
        ReverseProxy["Nginx / Cloudflare Edge (SSL Termination, DDoS, Compression)"]
    end

    subgraph Application Tier
        NextWeb["apps/web (Next.js 15 App Router)<br/>- Public Landing & SEO<br/>- Student Dashboard & Practice<br/>- Exam Engine & Analytics<br/>- Admin Studio"]
        NestAPI["apps/api (NestJS 11 Core API)<br/>- 20+ Domain Modules<br/>- JWT & RBAC Guards<br/>- Authoritative Test Engine<br/>- Zod/class-validator DTOs"]
        Worker["apps/worker (Node.js BullMQ Worker)<br/>- Bulk CSV/JSON Ingestion<br/>- Spaced Repetition Scheduling<br/>- Email & Notifications Dispatch<br/>- Leaderboard Aggregations"]
    end

    subgraph Data & Storage Tier
        PG[(PostgreSQL 16 Primary)]
        RedisCache[(Redis 7 Cache & Queues)]
        S3Bucket[("Object Storage (S3 / MinIO)")]
    end

    Browser -->|HTTPS / Port 443| ReverseProxy
    ReverseProxy -->|Proxy / | NextWeb
    ReverseProxy -->|Proxy /api| NestAPI
    NextWeb -->|Server-to-Server REST| NestAPI
    NestAPI -->|Prisma Connection Pool| PG
    NestAPI -->|Cache & Enqueue Jobs| RedisCache
    Worker -->|Consume Queue| RedisCache
    Worker -->|Read/Write Batch Jobs| PG
    NestAPI -->|Presigned Uploads| S3Bucket
```

---

## 3. Monorepo Structural Specification

```text
cdsprep/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (public)/                 # Landing, About, Pricing, Contact, FAQ, Terms
│   │   │   ├── (auth)/                   # Login, Register, Forgot Password, Reset Password
│   │   │   ├── (student)/                # Authenticated Aspirant Shell
│   │   │   │   ├── dashboard/            # Performance cards, quick actions, streaks
│   │   │   │   ├── practice/             # All, Subject, Chapter, Topic drills
│   │   │   │   ├── pyq/                  # 20-Year PYQ browser, Year/Session/Paper
│   │   │   │   ├── tests/                # Full mocks, Subject tests, Custom tests
│   │   │   │   ├── test/[testId]/        # Instructions, Live Exam Interface, Review
│   │   │   │   ├── result/[attemptId]/   # Granular scorecards, KaTeX solution view
│   │   │   │   ├── analytics/            # Longitudinal charts, weakness matrix
│   │   │   │   ├── mistakes/             # Automatic mistake notebook & retry mode
│   │   │   │   ├── bookmarks/            # Saved questions & custom drills
│   │   │   │   ├── leaderboard/          # Academy-wise & overall rankings
│   │   │   │   ├── study-plan/           # AI & deterministic daily revision plans
│   │   │   │   ├── ai-assistant/         # Contextual CDS study assistant
│   │   │   │   └── profile/              # User settings, Academy target (IMA/OTA)
│   │   │   └── (admin)/                  # Dedicated Admin & Faculty Portal
│   │   │       ├── admin/dashboard/      # System statistics & active tests
│   │   │       ├── admin/questions/      # CRUD question bank, KaTeX editor, filters
│   │   │       ├── admin/questions/import# CSV/JSON bulk ingestion & report download
│   │   │       ├── admin/pyq/            # PYQ Paper management & session linking
│   │   │       ├── admin/tests/          # Test creation, sections, marks & duration
│   │   │       ├── admin/subjects/       # Syllabus taxonomy manager (Subject->Chapter->Topic)
│   │   │       ├── admin/ai/             # AI question generator & approval queue
│   │   │       ├── admin/reports/        # Student question flag moderation
│   │   │       └── admin/audit-logs/     # Immutable administrative action log
│   │   ├── components/                   # Web-specific UI components
│   │   ├── hooks/                        # Custom React hooks (e.g., useExamTimer, useAutosave)
│   │   ├── lib/                          # Web utilities, API client, KaTeX wrapper
│   │   └── package.json
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts                   # Fastify/Express bootstrap, Swagger setup
│   │   │   ├── app.module.ts             # Root module aggregating all feature modules
│   │   │   ├── common/                   # Shared guards, interceptors, filters, pipes
│   │   │   └── modules/                  # 20+ cleanly separated domain modules
│   │   ├── test/                         # E2E & integration test suites
│   │   └── package.json
│   └── worker/
│       ├── src/
│       │   ├── main.ts                   # BullMQ worker runtime bootstrap
│       │   └── processors/               # Email, Analytics, Import, AI validation processors
│       └── package.json
├── packages/
│   ├── ui/                               # Shared React component primitives (Radix + Tailwind)
│   ├── database/                         # Prisma schema, migrations, seeders, client singleton
│   ├── types/                            # Cross-cutting TypeScript definitions & Enums
│   ├── validation/                       # Zod validation schemas shared between client and server
│   ├── config/                           # Prettier, ESLint, TypeScript base configurations
│   └── ai/                               # LLM provider abstraction, prompt templates, math validator
├── docs/                                 # Complete technical & product documentation
├── docker/                               # Production Dockerfiles for web, api, and worker
├── docker-compose.yml                    # Local multi-container development environment
├── package.json                          # Root workspace configuration
└── pnpm-workspace.yaml                   # Monorepo directory map
```

---

## 4. Key Architectural Data Flows

### 4.1 Test Attempt Lifecycle (Authoritative Execution)

```mermaid
sequenceDiagram
    autonumber
    actor Aspirant as Candidate (Client Browser)
    participant API as NestJS API (apps/api)
    participant DB as PostgreSQL Database
    participant Redis as Redis Cache / Queue

    Aspirant->>API: POST /api/test-attempts { testId }
    API->>DB: Fetch test rules, sections, duration
    API->>DB: Insert TestAttempt (startedAt=NOW, expiresAt=NOW + duration)
    API->>DB: Insert initial AttemptQuestionState (all UNVISITED)
    API-->>Aspirant: 201 Created (attemptId, questions sans answers, expiresAt)

    loop Exam Progression
        Aspirant->>API: PUT /api/test-attempts/:id/answer { questionId, optionId, timeSpent }
        API->>DB: Check NOW() <= attempt.expiresAt
        API->>DB: Upsert AttemptAnswer & set state=ANSWERED
        API-->>Aspirant: 200 OK { saved: true }
    end

    alt Candidate Clicks Submit OR Timer Reaches 0
        Aspirant->>API: POST /api/test-attempts/:id/submit
        API->>DB: BEGIN TRANSACTION (SELECT FOR UPDATE on TestAttempt)
        API->>DB: Mark status = SUBMITTED, submittedAt = NOW()
        API->>DB: Grade all answers vs QuestionOption(isCorrect)
        API->>DB: Compute gross marks, negative deductions, net score
        API->>DB: Insert Result, ResultSubject, ResultTopic records
        API->>DB: Insert Mistake records for incorrect answers
        API->>DB: COMMIT TRANSACTION
        API->>Redis: Enqueue 'aggregate-analytics' job
        API-->>Aspirant: 200 OK (Full Result Scorecard & Solutions)
    end
```

### 4.2 AI Question Generation & Human-in-the-Loop Validation

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Faculty / Content Admin
    participant API as NestJS API (Admin Module)
    participant AI as AI Engine (packages/ai)
    participant LLM as External LLM (OpenAI / Gemini)
    participant DB as PostgreSQL Database

    Admin->>API: POST /api/admin/ai/generate { subject, topic, difficulty, count }
    API->>AI: Invoke generateQuestionsBatch(spec)
    AI->>LLM: Send structured system prompt with JSON schema constraint
    LLM-->>AI: Raw JSON Candidate Questions
    AI->>AI: Zod Schema Validation
    AI->>AI: Deterministic Math Verification (evaluate math expressions)
    AI-->>API: Validated Candidate Questions
    API->>DB: Insert into Question table with status='DRAFT_AI'
    API-->>Admin: Return candidate list for review

    Admin->>API: PATCH /api/admin/questions/:id/approve
    API->>DB: Update status='PUBLISHED', recordedBy=AdminId
    API->>DB: Insert AuditLog entry
    API-->>Admin: 200 OK (Published to active question pool)
```

---

## 5. Technology Decision Records (TDRs)

### TDR-01: Next.js App Router for Frontend

- **Context**: The application requires both public-facing, highly indexable SEO pages (Landing, About, CDS Syllabus, PYQ overviews) and interactive client-driven exam applications.
- **Decision**: Adopt Next.js 15+ App Router.
- **Consequences**: Public pages use React Server Components (RSC) for zero-bundle HTML rendering; exam and dashboard views use client components (`"use client"`) backed by TanStack Query for reactive, stateful experiences.

### TDR-02: NestJS for Backend Services

- **Context**: The backend requires 20+ interconnected domain modules, strict DTO validation, role-based authorization guards, and clear separation of concerns.
- **Decision**: Use NestJS with TypeScript.
- **Consequences**: Provides structured enterprise design patterns (Modules, Controllers, Services, Guards, Interceptors) out of the box, standardizing development across team members and preventing architecture decay.

### TDR-03: PostgreSQL with Prisma ORM

- **Context**: Exam scoring, negative marking, attempt states, and student analytics demand strict relational integrity, foreign keys, and atomic transactions (`$transaction`).
- **Decision**: PostgreSQL 16 with Prisma ORM.
- **Consequences**: Guarantees acid compliance for submissions; provides end-to-end type safety between database models and API logic; simplifies database migrations.

### TDR-04: KaTeX for Mathematical Typesetting

- **Context**: CDS Elementary Mathematics involves fractions, square roots, geometry symbols, quadratic equations, and trigonometry identities ($0^\circ \le \theta \le 90^\circ$).
- **Decision**: Use KaTeX over MathJax.
- **Consequences**: KaTeX is up to 100x faster than MathJax, compiles synchronously, supports server-side rendering, and maintains a tiny client-side footprint.

### TDR-05: Server-Authoritative Exam Timing

- **Context**: Relying on browser `setInterval` causes exam desynchronization when tabs are backgrounded or when users alter system clocks.
- **Decision**: The backend calculates `expiresAt = startedAt + duration` upon attempt creation and independently evaluates expiry on every mutation.
- **Consequences**: Total immunity against client-side timer manipulation; seamless recovery across browser restarts and device switches.
