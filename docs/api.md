# API Specification & Module Map — CDSPrep

**API Style:** RESTful JSON  
**Base URL:** `/api/v1`  
**Standard Documentation:** OpenAPI 3.0 (Swagger UI at `/api/docs`)  
**Platform:** CDSPrep

---

## 1. Global API Conventions

### 1.1 Response Envelope

All API endpoints return a standardized envelope.

#### Success Response

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

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more request parameters failed validation.",
    "details": [{ "field": "email", "issue": "Invalid email address format" }],
    "timestamp": "2026-09-09T08:00:00.000Z",
    "path": "/api/v1/auth/register"
  }
}
```

### 1.2 Rate Limiting Policies

- **Public & Auth Endpoints**: 5 requests per minute per IP (protects login and register against brute-force).
- **Exam State & Autosave Endpoints**: 120 requests per minute per authenticated user session.
- **General Practice & Browsing Endpoints**: 60 requests per minute per authenticated user session.
- **Admin & AI Endpoints**: 20 requests per minute per authenticated admin/faculty account.

---

## 2. Comprehensive Module Route Map

### 2.1 Authentication (`/auth`)

| Method | Endpoint                | Access          | Description                                                           |
| :----- | :---------------------- | :-------------- | :-------------------------------------------------------------------- |
| `POST` | `/auth/register`        | Public          | Register new aspirant with email, password, target academy            |
| `POST` | `/auth/login`           | Public          | Authenticate user, return short-lived access JWT + set refresh cookie |
| `POST` | `/auth/refresh`         | Public (Cookie) | Exchange valid refresh token for a new access JWT                     |
| `POST` | `/auth/logout`          | Authenticated   | Revoke refresh token cookie and invalidate session                    |
| `POST` | `/auth/verify-email`    | Public          | Confirm account with token sent via email                             |
| `POST` | `/auth/forgot-password` | Public          | Initiate password reset email dispatch                                |
| `POST` | `/auth/reset-password`  | Public          | Apply new password using cryptographic reset token                    |

### 2.2 User Profile (`/users`)

| Method  | Endpoint          | Access        | Description                                                      |
| :------ | :---------------- | :------------ | :--------------------------------------------------------------- |
| `GET`   | `/users/me`       | Authenticated | Get active user profile, streaks, target academy                 |
| `PATCH` | `/users/me`       | Authenticated | Update full name, avatar, target academy preference              |
| `GET`   | `/users/me/stats` | Authenticated | Get lifetime questions solved, tests completed, overall accuracy |

### 2.3 Syllabus & Hierarchy (`/subjects`, `/chapters`, `/topics`)

| Method | Endpoint               | Access         | Description                                                |
| :----- | :--------------------- | :------------- | :--------------------------------------------------------- |
| `GET`  | `/subjects`            | Public / Cache | List CDS subjects (English, GK, Maths) with chapter counts |
| `GET`  | `/subjects/:slug`      | Public / Cache | Get subject details with complete chapter & topic tree     |
| `GET`  | `/chapters/:id/topics` | Public / Cache | Get topics for a specific chapter                          |

### 2.4 Question Bank (`/questions`)

| Method | Endpoint                | Access        | Description                                                         |
| :----- | :---------------------- | :------------ | :------------------------------------------------------------------ |
| `GET`  | `/questions`            | Authenticated | Browse questions with filters (subject, topic, difficulty, PYQ)     |
| `GET`  | `/questions/:id`        | Authenticated | Get question detail with options (excludes explanation during test) |
| `POST` | `/questions/:id/report` | Authenticated | Submit an error report / flag for a question                        |

### 2.5 Previous Year Questions (`/pyqs`)

| Method | Endpoint                     | Access        | Description                                                      |
| :----- | :--------------------------- | :------------ | :--------------------------------------------------------------- |
| `GET`  | `/pyqs/years`                | Authenticated | Get list of available PYQ years (2006 to 2026) and sessions      |
| `GET`  | `/pyqs/papers`               | Authenticated | Query papers filtered by year, session (CDS I / II), and subject |
| `GET`  | `/pyqs/papers/:id`           | Authenticated | Get paper overview, questions count, official duration           |
| `GET`  | `/pyqs/papers/:id/questions` | Authenticated | Get questions for untimed study mode                             |

### 2.6 Practice Engine (`/practice`)

| Method | Endpoint              | Access        | Description                                                      |
| :----- | :-------------------- | :------------ | :--------------------------------------------------------------- |
| `POST` | `/practice/session`   | Authenticated | Initialize adaptive practice drill (by topic, difficulty, count) |
| `POST` | `/practice/evaluate`  | Authenticated | Submit practice answer, return immediate KaTeX explanation       |
| `GET`  | `/practice/mistakes`  | Authenticated | Get active incorrect questions from Mistake Notebook             |
| `GET`  | `/practice/bookmarks` | Authenticated | Get bookmarked questions for drill practice                      |

### 2.7 Mock Test Engine (`/tests`, `/test-attempts`)

| Method | Endpoint                       | Access        | Description                                                     |
| :----- | :----------------------------- | :------------ | :-------------------------------------------------------------- |
| `GET`  | `/tests`                       | Authenticated | List published mock tests (Full mocks, subject-specific)        |
| `GET`  | `/tests/:id/instructions`      | Authenticated | Pre-exam instructions, rules, section markings                  |
| `POST` | `/test-attempts`               | Authenticated | Start exam: initializes server timer (`startedAt`, `expiresAt`) |
| `GET`  | `/test-attempts/:id`           | Authenticated | Resume active test attempt with question palette states         |
| `PUT`  | `/test-attempts/:id/answer`    | Authenticated | Autosave answer selection (debounced from frontend)             |
| `PUT`  | `/test-attempts/:id/state`     | Authenticated | Update question state (e.g. MARKED_FOR_REVIEW)                  |
| `POST` | `/test-attempts/:id/telemetry` | Authenticated | Log browser integrity events (tab_switch, fullscreen_exit)      |
| `POST` | `/test-attempts/:id/submit`    | Authenticated | Finalize test attempt, perform server grading transaction       |

### 2.8 Results & Analytics (`/results`, `/analytics`)

| Method | Endpoint                        | Access        | Description                                               |
| :----- | :------------------------------ | :------------ | :-------------------------------------------------------- |
| `GET`  | `/results/:attemptId`           | Authenticated | Full scorecard, net score, accuracy, time analysis        |
| `GET`  | `/results/:attemptId/solutions` | Authenticated | Complete question-by-question review with KaTeX solutions |
| `GET`  | `/analytics/overview`           | Authenticated | Overall accuracy, score trend, total study time           |
| `GET`  | `/analytics/weaknesses`         | Authenticated | Top weak topics (accuracy < 60%) across attempts          |
| `GET`  | `/analytics/speed`              | Authenticated | Average time spent per question by subject                |

### 2.9 Bookmarks & Mistake Notebook (`/bookmarks`, `/mistakes`)

| Method   | Endpoint                 | Access        | Description                                     |
| :------- | :----------------------- | :------------ | :---------------------------------------------- |
| `POST`   | `/bookmarks`             | Authenticated | Bookmark question with optional candidate notes |
| `DELETE` | `/bookmarks/:questionId` | Authenticated | Remove bookmark                                 |
| `GET`    | `/mistakes`              | Authenticated | Retrieve list of questions answered incorrectly |
| `PATCH`  | `/mistakes/:id/master`   | Authenticated | Mark mistake as mastered after successful drill |

### 2.10 AI Assistant & Explainers (`/ai`)

| Method | Endpoint               | Access        | Description                                                     |
| :----- | :--------------------- | :------------ | :-------------------------------------------------------------- |
| `POST` | `/ai/explain-question` | Authenticated | Generate contextual explanation / simplification for a question |
| `POST` | `/ai/study-assistant`  | Authenticated | Chat with CDS preparation assistant grounded in user stats      |
| `GET`  | `/ai/recommendations`  | Authenticated | Fetch personalized revision recommendations                     |

### 2.11 Admin Control Panel (`/admin`)

| Method   | Endpoint                  | Access          | Description                                             |
| :------- | :------------------------ | :-------------- | :------------------------------------------------------ |
| `GET`    | `/admin/stats`            | Admin           | Overall user count, test attempts, question bank volume |
| `POST`   | `/admin/questions`        | Content Editor+ | Create new question with options and KaTeX explanation  |
| `PUT`    | `/admin/questions/:id`    | Content Editor+ | Update question content, options, or difficulty         |
| `DELETE` | `/admin/questions/:id`    | Admin           | Soft-delete / archive question                          |
| `POST`   | `/admin/questions/import` | Admin           | Bulk upload CSV/JSON with validation report             |
| `POST`   | `/admin/tests`            | Admin           | Create test with sections, marks, and duration          |
| `POST`   | `/admin/ai/generate`      | Admin           | Generate candidate draft questions using LLM pipeline   |
| `PATCH`  | `/admin/ai/approve/:id`   | Admin           | Approve AI-generated question into production bank      |
| `GET`    | `/admin/audit-logs`       | Admin           | View immutable system administrative logs               |
| `GET`    | `/admin/reports`          | Moderator+      | View and resolve student-reported questions             |

---

## 3. Sample DTO Payloads

### 3.1 Start Test Attempt DTO (`POST /api/v1/test-attempts`)

**Request Body:**

```json
{
  "testId": "d3b07384-d113-469b-8d82-c5180f1ff71e"
}
```

**Response Data (`201 Created`):**

```json
{
  "success": true,
  "data": {
    "attemptId": "e4f18395-e224-470c-9e93-d6291f2ff82f",
    "testTitle": "CDS I 2026 — Full Length Mock 1",
    "startedAt": "2026-09-09T08:00:00.000Z",
    "expiresAt": "2026-09-09T10:00:00.000Z",
    "durationMinutes": 120,
    "totalQuestions": 120,
    "sections": [
      {
        "id": "sec-1",
        "name": "General English",
        "questionCount": 120
      }
    ],
    "questions": [
      {
        "id": "q-101",
        "orderIndex": 1,
        "questionText": "Select the word that is opposite in meaning to **OBDURATE**.",
        "marks": "0.83",
        "negativeMarks": "0.28",
        "options": [
          { "id": "opt-1", "identifier": "A", "optionText": "Stubborn" },
          { "id": "opt-2", "identifier": "B", "optionText": "Flexible" },
          { "id": "opt-3", "identifier": "C", "optionText": "Callous" },
          { "id": "opt-4", "identifier": "D", "optionText": "Unyielding" }
        ],
        "state": "UNVISITED"
      }
    ]
  }
}
```

### 3.2 Autosave Answer DTO (`PUT /api/v1/test-attempts/:id/answer`)

**Request Body:**

```json
{
  "questionId": "q-101",
  "selectedOptionId": "opt-2",
  "timeSpentSeconds": 24,
  "state": "ANSWERED"
}
```

**Response Data (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "saved": true,
    "questionId": "q-101",
    "currentState": "ANSWERED",
    "serverRemainingSeconds": 7176
  }
}
```
