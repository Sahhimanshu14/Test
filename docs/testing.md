# Testing Strategy & Quality Assurance Framework — CDSPrep

**Document:** Quality Assurance & Testing Specification  
**Toolchain:** Vitest, Jest, Supertest, Playwright, Prisma Test Environment  
**Platform:** CDSPrep

---

## 1. Testing Pyramid & Coverage Targets

```
           / \
          /   \     E2E Tests (Playwright)
         / E2E \    Target: 100% Critical User Paths
        /-------\
       /  Integ  \   Integration Tests (Supertest + Real DB)
      /   ration  \  Target: > 85% API Endpoint Coverage
     /-------------\
    /     Unit      \ Unit Tests (Vitest / Jest)
   /      Tests      \ Target: > 90% Pure Domain Logic Coverage
  /-------------------\
```

| Tier                  | Tooling                    | Focus Areas                                                                                                  | Minimum Threshold        |
| :-------------------- | :------------------------- | :----------------------------------------------------------------------------------------------------------- | :----------------------- |
| **Unit Tests**        | Vitest / Jest              | Scoring logic, negative marking calculation, timer bounds, Zod/DTO validation, mathematical formula verifier | 90% Statement / Branch   |
| **Integration Tests** | Supertest + Prisma Test DB | Auth flows, question queries, attempt lifecycle, atomic submission transaction, Mistake notebook recording   | 85% Controller / Service |
| **E2E Tests**         | Playwright                 | Full exam simulation, palette state sync, mobile responsiveness, Admin bulk CSV import, Result review        | 100% Core Scenarios      |

---

## 2. Unit Testing Specification: Domain Logic

### 2.1 Exam Scoring & Negative Marking Engine

```typescript
describe('Authoritative Scoring Engine', () => {
  it('correctly calculates net score for CDS English Paper (0.83 mark per question, 0.28 penalty)', () => {
    const questionMarks = new Decimal(0.8333);
    const negativeMarks = new Decimal(0.2777);
    const results = gradeAttempt([
      { isCorrect: true, marks: questionMarks, negativeMarks },
      { isCorrect: true, marks: questionMarks, negativeMarks },
      { isCorrect: false, marks: questionMarks, negativeMarks }, // -0.2777
      { isCorrect: null, marks: questionMarks, negativeMarks }, // skipped = 0
    ]);

    expect(results.correctCount).toBe(2);
    expect(results.incorrectCount).toBe(1);
    expect(results.skippedCount).toBe(1);
    expect(results.netScore.toNumber()).toBeCloseTo(1.3889, 3);
  });

  it('guarantees net score does not drop below zero if negative deductions exceed gross score', () => {
    const results = gradeAttempt([
      { isCorrect: false, marks: new Decimal(1.0), negativeMarks: new Decimal(0.33) },
    ]);
    expect(results.netScore.toNumber()).toBe(0);
  });
});
```

### 2.2 Server Timer Calculations

- Verification that `getRemainingSeconds(startedAt, duration, now)` returns 0 when expired.
- Verification that requests submitted past deadline trigger `AUTO_SUBMITTED_TIMEOUT`.

---

## 3. Test Engine Edge Cases Matrix

Rule 46 mandates explicit test coverage for exam engine failure modes:

| Test Scenario                        | Injection / Simulation Method                                                          | Expected Authoritative Behavior                                                                                                                   | Assertion Criteria                                                                 |
| :----------------------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------- |
| **Page Refresh During Exam**         | Client reloads page at $T=45\text{m}$.                                                 | Client calls `GET /api/test-attempts/:id`; server returns current question states and exact remaining duration derived from server `expiresAt`.   | Active answers preserved; timer continues seamlessly without resetting.            |
| **Browser Close / Crash**            | Browser process killed; reopens 10 minutes later.                                      | Client authenticates and requests active attempt. Server calculates delta from original `expiresAt`.                                              | Saved answers intact; remaining time accurately reflects elapsed real-world time.  |
| **Network Disconnect & Reconnect**   | Network offline simulated via browser emulation while user continues answering.        | Client queues failed autosaves in IndexedDB; upon reconnect, flushes pending answers sequentially.                                                | Server accepts answers if still within `expiresAt`; returns sync confirmation.     |
| **Double Submit Race Condition**     | Client fires two concurrent `POST /api/test-attempts/:id/submit` requests within 10ms. | PostgreSQL row lock (`SELECT FOR UPDATE`) locks the attempt; first request marks `SUBMITTED`, second receives `409 Conflict` (Already Submitted). | Only one Result record generated; no duplicate scoring or double counting.         |
| **Late Submit (Expired Timer)**      | Client submits after `expiresAt + 15 seconds`.                                         | Server evaluates `NOW() > expiresAt`; forces `AUTO_SUBMITTED_TIMEOUT` status.                                                                     | Attempt is graded; answers modified post-expiry are rejected.                      |
| **Multiple Tabs Open**               | Candidate opens the same active attempt across two browser tabs.                       | Server persists state based on latest timestamp; rejects contradictory answers.                                                                   | Both tabs sync to the canonical server state on next poll.                         |
| **Rapid Answer Changes**             | User clicks Option A, B, C, D in under 200ms.                                          | Client debounces request by 300ms; only the final selected option is transmitted to the server.                                                   | Database records only the final intended answer; no DB connection pool exhaustion. |
| **Client Tampering: Modified Score** | Malicious client posts `{ score: 100 }` in submit payload.                             | Backend ignores all client score fields; reads only `selectedOptionId` from DB and compares against official keys.                                | Server calculates genuine score; forged payload attributes discarded.              |
| **IDOR Result Access**               | User B attempts to access `GET /api/results/{userA_attemptId}`.                        | NestJS `AttemptOwnershipGuard` checks `attempt.userId === user.id`.                                                                               | Returns `403 Forbidden`.                                                           |

---

## 4. Integration Test Suites (API & Database)

Integration tests execute against an isolated test database (PostgreSQL in Docker):

1. **Auth Suite (`test/auth.e2e-spec.ts`)**:
   - Aspirant registration -> email verification token generation -> login -> refresh token rotation -> logout.
2. **Question Bank Suite (`test/questions.e2e-spec.ts`)**:
   - Admin creates question with KaTeX formula -> options inserted with unique identifiers -> explanation linked -> student fetches without `isCorrect` -> admin fetches with all metadata.
3. **Attempt & Scoring Suite (`test/test-engine.e2e-spec.ts`)**:
   - Start full CDS Mock -> answer 10 questions -> mark 2 for review -> submit -> verify Result, ResultSubject, ResultTopic, and Mistake records.

---

## 5. End-to-End Test Matrix (Playwright)

1. **Student Complete Journey (`tests/e2e/student-journey.spec.ts`)**:
   - Visit Landing Page (`/`) -> Click "Start Free Practice" -> Register as IMA Aspirant -> Visit Dashboard -> Launch "Arithmetic Practice Drill" -> Answer 5 questions with KaTeX formulas -> View instant explanation -> Bookmark Question 3 -> Open Mistake Notebook -> Verify mistakes recorded.
2. **Authoritative Timed Mock Test (`tests/e2e/mock-test.spec.ts`)**:
   - Navigate to `/tests` -> Open "CDS I 2026 Full Length Mock" -> Read instructions -> Click "Start Examination" -> Fullscreen prompt -> Navigate through Question Palette (verify color transitions: Gray -> Red -> Green -> Purple) -> Simulate timer tick -> Click Submit Exam -> Verify confirmation modal -> View Result page with score, percentile, and solution review.
3. **Admin Content Management (`tests/e2e/admin-studio.spec.ts`)**:
   - Login as Admin -> Navigate to `/admin/questions/create` -> Input question with mathematical formula ($\sin^2 \theta + \cos^2 \theta = 1$) -> Set Options -> Save -> Verify question appears in active question bank.

---

## 6. Continuous Integration (CI) Validation Gates

Every Pull Request and commit must pass automated CI checks in GitHub Actions:

```bash
# Gate 1: Code Consistency
pnpm lint
pnpm format:check

# Gate 2: Static Type Safety
pnpm typecheck

# Gate 3: Unit & Integration Tests
pnpm test:unit
pnpm test:integration

# Gate 4: Production Build Validation
pnpm build
```

Failure in any single gate halts deployment immediately.
