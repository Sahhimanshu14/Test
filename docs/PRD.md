# Product Requirements Document (PRD) — CDSPrep

**Product Name:** CDSPrep  
**Tagline:** Prepare Smarter. Practice Better. Crack CDS With Confidence.  
**Target Examination:** UPSC Combined Defence Services (CDS) Examination (IMA, INA, AFA, OTA)  
**Version:** 1.0.0  
**Status:** Approved Architectural Baseline

---

## 1. Executive Summary & Product Vision

CDSPrep is a modern, production-grade web platform engineered specifically for candidates preparing for the UPSC Combined Defence Services (CDS) examination. Aspiring officers preparing for the Indian Military Academy (IMA), Indian Naval Academy (INA), Air Force Academy (AFA), and Officers Training Academy (OTA) require an authoritative, reliable, and distraction-free preparation ecosystem.

Current commercial offerings are often cluttered with excessive ads, non-defence generic content, unreliable client-side timers, rigid test interfaces, and uninformative raw scores. CDSPrep solves this by delivering:

1. **Curated defence-focused pedagogy**: Built around the actual UPSC CDS syllabus across English, General Knowledge, and Elementary Mathematics.
2. **20-Year Structured PYQ Engine**: Enabling aspirants to drill official previous year questions segmented by year, session (CDS I & CDS II), subject, chapter, and topic with authoritative step-by-step solutions.
3. **Server-Authoritative Examination Engine**: Simulating exact UPSC conditions with accurate negative marking (-0.33 per mark), a 6-state question palette, server-calculated countdown timers, and browser integrity monitoring.
4. **Actionable Multi-Dimensional Analytics**: Transforming test attempts into granular performance diagnostics (topic accuracy, speed per question, careless vs conceptual mistake breakdown, and personalized study recommendations).
5. **Contextual AI Learning**: Providing on-demand conceptual clarifications, step-by-step mathematical reasoning, and assisted question generation with human-in-the-loop review.

---

## 2. Target Audience & User Personas

### 2.1 Persona 1: Vikram — Serious First-Time Aspirant (IMA/AFA)

- **Background**: Final-year Engineering student (21 years old), aiming for IMA / AFA.
- **Needs**: Needs to balance college studies with CDS prep. Strong in Mathematics, needs systematic practice in General Knowledge (Modern History, Defence Current Affairs, Polity) and English grammar rules.
- **Pain Points**: Lacks time to search for authentic PYQs; frustrated by mock tests that don't reflect UPSC's negative marking or topic weightage.
- **CDSPrep Value**: Subject-wise practice drills, 20-year PYQ repository with topic filters, and automatic mistake notebook that saves hours of revision time.

### 2.2 Persona 2: Priya — Working Professional Aspirant (OTA)

- **Background**: Corporate employee (23 years old) targeting OTA (Short Service Commission). Appears only for Paper 1 (English) and Paper 2 (General Knowledge).
- **Needs**: High-yield, timed practice sessions during commutes and evenings. Needs clear visibility into accuracy benchmarks.
- **Pain Points**: Many platforms force three-paper packages without customizable OTA configurations.
- **CDSPrep Value**: Modular exam configurations allowing OTA-specific mock tests (English + GK only, 200 marks, 4 hours total), mobile-first responsive test interface, and personalized daily recommendations.

### 2.3 Persona 3: Major Rajesh (Retd.) — Content Editor & Defence Faculty

- **Background**: Experienced CDS exam coach managing question quality.
- **Needs**: Intuitive admin dashboard to import verified PYQ papers, write rich-text/KaTeX explanations, review AI-generated practice questions, and verify mathematical derivations.
- **Pain Points**: Legacy CMS tools lack mathematical notation support, have clumsy bulk import tools, and lack audit logs.
- **CDSPrep Value**: Robust admin studio with schema validation, CSV/JSON bulk import with downloadable error reports, KaTeX live preview, and role-based publishing workflows.

---

## 3. CDS Examination Structure & Configuration Model

The platform accommodates both the standard UPSC CDS pattern and future structural adjustments through dynamic database-driven configuration.

### 3.1 Academy Patterns

| Academy                             | Papers Required               | Duration                      | Total Questions       | Maximum Marks         | Negative Marking             |
| :---------------------------------- | :---------------------------- | :---------------------------- | :-------------------- | :-------------------- | :--------------------------- |
| **Indian Military Academy (IMA)**   | English, GK, Elementary Maths | 2 hrs per paper (6 hrs total) | 120 + 120 + 100 = 340 | 100 + 100 + 100 = 300 | 1/3rd of question mark value |
| **Indian Naval Academy (INA)**      | English, GK, Elementary Maths | 2 hrs per paper (6 hrs total) | 120 + 120 + 100 = 340 | 100 + 100 + 100 = 300 | 1/3rd of question mark value |
| **Air Force Academy (AFA)**         | English, GK, Elementary Maths | 2 hrs per paper (6 hrs total) | 120 + 120 + 100 = 340 | 100 + 100 + 100 = 300 | 1/3rd of question mark value |
| **Officers Training Academy (OTA)** | English, General Knowledge    | 2 hrs per paper (4 hrs total) | 120 + 120 = 240       | 100 + 100 = 200       | 1/3rd of question mark value |

### 3.2 Subject Syllabus & Weightage Breakdown

#### Paper 1: English (120 Questions, 100 Marks)

- **Mark per question**: ~0.833 marks; **Negative mark**: ~0.277 marks.
- **Core Topics**: Reading Comprehension, Spotting Errors, Sentence Arrangement (Ordering of Words/Sentences), Synonyms & Antonyms, Idioms & Phrases, Fill in the Blanks, Cloze Composition, Prepositions & Conjunctions, Active/Passive Voice, Direct/Indirect Speech.

#### Paper 2: General Knowledge (120 Questions, 100 Marks)

- **Mark per question**: ~0.833 marks; **Negative mark**: ~0.277 marks.
- **Core Topics**:
  - **General Science**: Physics (Optics, Mechanics, Electricity), Chemistry (Acids/Bases, Periodic Table, Metals), Biology (Human Physiology, Genetics, Ecology).
  - **Indian Polity & Constitution**: Fundamental Rights/Duties, Parliament, Executive, Judiciary, Constitutional Amendments, Defence Governance.
  - **History of India**: Ancient India, Medieval India, Modern Freedom Movement, Indian National Congress sessions.
  - **Geography**: Physical Geography, Indian River Systems, Climate & Monsoons, Minerals, World Geography & Maps.
  - **Defence & Security**: Armed Forces commands, missiles, warships, aircraft, defence exercises, ranks, Gallantry awards.
  - **Current Affairs & Economics**: National & International events, Economic surveys, Monetary policy, Union budget.

#### Paper 3: Elementary Mathematics (100 Questions, 100 Marks)

- **Mark per question**: 1.00 mark; **Negative mark**: 0.33 marks.
- **Core Topics**:
  - **Arithmetic**: Number System, Divisibility, Unit Digits, LCM/HCF, Percentages, Profit & Loss, Simple & Compound Interest, Ratio & Proportion, Time & Work, Time & Distance.
  - **Algebra**: Basic Operations, Remainder Theorem, Quadratic Equations, Linear Equations with Two Variables, Set Theory.
  - **Trigonometry**: Sine, Cosine, Tangent values $(0^\circ \le \theta \le 90^\circ)$, Trigonometric Identities, Heights and Distances.
  - **Geometry**: Lines and Angles, Triangles (Congruence & Similarity), Circles (Tangents, Chords), Theorems on concurrency.
  - **Mensuration**: Perimeter and Area (Triangles, Quadrilaterals, Circles), Surface Area & Volume (Cubes, Cylinders, Cones, Spheres).
  - **Statistics**: Graphical representation (Histograms, Polygons), Measures of Central Tendency (Mean, Median, Mode).

---

## 4. Comprehensive Feature Specifications

### 4.1 Module 1: Public Website & Onboarding

- **FR-PUB-01 Landing Page**: Hero section with clear value proposition, live platform stats (Total Questions, Active Aspirants, Mock Tests Taken), CDS Subject breakdown, PYQ archive showcase, interactive feature tour, testimonials, FAQ, and footer.
- **FR-PUB-02 Authentication Flow**: Email + Password registration with strong password enforcement (min 8 characters, uppercase, lowercase, digit, special character). Email verification flow via secure one-time tokens. Secure password reset mechanism with time-limited tokens.
- **FR-PUB-03 Academy Target Selection**: During onboarding, aspirants choose their target academy (IMA, INA, AFA, OTA) and expected exam session (e.g., CDS I 2026). This customizes the default dashboard and test recommendations.

### 4.2 Module 2: Student Dashboard

- **FR-DSH-01 Key Performance Metrics**: Display Overall Accuracy (%), Total Solved, Mock Tests Completed, Average Score, Daily Streak (active days), Total Study Hours.
- **FR-DSH-02 Continue & Recommended Practice**: Quick-resume action for in-progress practice sessions, accompanied by deterministic recommendation cards (e.g., "Strengthen Trigonometry: 15 questions recommended").
- **FR-DSH-03 Weak Topic Alert**: Automatically flags the bottom 3 topics where historical accuracy is under 50%.
- **FR-DSH-04 Recent Test Attempt Cards**: Chronological list of completed tests with scores, accuracy, and direct links to in-depth test reviews.
- **FR-DSH-05 Performance Trend**: Interactive Recharts chart displaying score progression over the last 10 mock test attempts.

### 4.3 Module 3: Question Bank & Content Schema

- **FR-QBK-01 Question Types**:
  - Single-choice Multiple Choice Questions (Standard MCQ)
  - Assertion & Reason
  - Statement-Based (Statement I & Statement II evaluation)
  - Match the Following (List I vs List II)
  - Reading Comprehension / Passage-based Question Sets
- **FR-QBK-02 Mathematical & Scientific Notation**: Full KaTeX rendering support across question text, option texts, and detailed solutions.
- **FR-QBK-03 Question Metadata**: Subject ID, Chapter ID, Topic ID, Difficulty (EASY, MEDIUM, HARD), Source (CDS PYQ, Original CDSPrep, UPSC Reference), Year/Session tag, Marks, Negative Marks.
- **FR-QBK-04 Rich Explanation**: Every question must have an authoritative explanation justifying the correct option and detailing why alternative options are incorrect.

### 4.4 Module 4: 20-Year PYQ Architecture

- **FR-PYQ-01 Granular Taxonomy**: Organizes exams from 2006 to 2026 across sessions (CDS I, CDS II) and papers (English, GK, Maths).
- **FR-PYQ-02 Dual Execution Modes**:
  1. _Simulation Mode_: Attempt the exact original paper under 2-hour official exam conditions with live timer, question palette, and negative marking.
  2. _Browse/Study Mode_: Untimed exploration of questions with instant solution toggles, topic filters, and bookmarking.
- **FR-PYQ-03 Attribution & Legal Compliance**: Proper citation of original UPSC examination years and papers without republishing proprietary commentary.

### 4.5 Module 5: Adaptive Practice Engine

- **FR-PRC-01 Flexible Practice Scopes**:
  - _All Questions_: Randomized drill across entire database.
  - _Subject-Wise_: English, GK, or Elementary Mathematics.
  - _Chapter-Wise_: Specific domain focus (e.g., Arithmetic vs Algebra).
  - _Topic-Wise_: Fine-grained mastery (e.g., "Percentages & Profit Loss", "Modern Indian History").
  - _Difficulty-Based_: Filter by Easy, Medium, Hard, or Mixed.
- **FR-PRC-02 Bookmark Practice**: Drill questions bookmarked by the user.
- **FR-PRC-03 Mistake Notebook Practice**: Practice previously failed questions until mastery is confirmed.

### 4.6 Module 6: Server-Authoritative Mock Test Engine

- **FR-TST-01 Pre-Exam Instructions**: Displays exam guidelines, duration, scoring rules, section breakdown, and requires candidate acknowledgement.
- **FR-TST-02 6-State Question Palette**:
  1. `UNVISITED` (Gray)
  2. `NOT_ANSWERED` (Orange/Red)
  3. `ANSWERED` (Green)
  4. `MARKED_FOR_REVIEW` (Purple)
  5. `ANSWERED_AND_MARKED_FOR_REVIEW` (Purple with green dot indicator)
  6. `VISITED` (Neutral light state)
- **FR-TST-03 Server-Side Countdown Timer**:
  - `startedAt` and `expiresAt` timestamps generated server-side.
  - Client polls/syncs delta; server automatically closes attempt and computes results when `currentTime >= expiresAt`.
  - Immune to browser refresh, tab close, clock manipulation, or temporary offline reconnects.
- **FR-TST-04 Question Autosave**: Every selection sends a lightweight debounced persistence request (`/api/test-attempts/:id/answer`).
- **FR-TST-05 Anti-Cheat Telemetry**: Captures client events (`tab_hidden`, `window_blur`, `fullscreen_exit`, `copy_paste`) and logs them to the attempt audit record.

### 4.7 Module 7: Result & Performance Analytics

- **FR-RES-01 Comprehensive Scorecard**: Total Questions, Attempted, Correct, Incorrect, Unattempted, Gross Marks, Negative Marks Deducted, Net Score, Overall Accuracy (%), Total Time Spent.
- **FR-RES-02 Sectional & Topic Breakdown**: Score, accuracy, and average time per question for every subject and topic.
- **FR-RES-03 Solution Review**: Complete review interface showing candidate answer vs correct answer with complete KaTeX explanation.
- **FR-RES-04 Mistake Classification**: Automatically identifies "Careless Mistakes" (high topic accuracy historical baseline, but quick incorrect response) vs "Conceptual Gaps" (low historical accuracy).

### 4.8 Module 8: Personalized Study Recommendation Engine

- **FR-REC-01 Weak Topic Identification**: Aggregates trailing 30-day attempt data to detect topics with accuracy below 60%.
- **FR-REC-02 Deterministic Generation**: Generates actionable daily targets (e.g., "20 Medium Questions on Trigonometric Identities").
- **FR-REC-03 Spaced Repetition**: Re-surfaces questions answered incorrectly at 24 hours, 7 days, and 21 days intervals.

### 4.9 Module 9: Contextual AI Assistant

- **FR-AI-01 Contextual Question Explainer**: Aspirant can query "Explain this question simply", "Step-by-step math derivation", "Why is option C wrong?", receiving an exact, bounded answer referencing only the active question context.
- **FR-AI-02 Study Advisor**: Aspirant can ask "What should I study today?" or "How can I improve my GK score?", utilizing the student's authorized performance summary without exposing private user data.
- **FR-AI-03 AI Question Generator for Admins**: Admin can generate draft question batches given subject, topic, and difficulty. Mathematical equations are cross-verified deterministically before admin approval.

### 4.10 Module 10: Admin Control Center & Content Management

- **FR-ADM-01 Question Management Studio**: Full CRUD with KaTeX editor, multi-option manager, difficulty tagger, and status transitions (`DRAFT`, `IN_REVIEW`, `PUBLISHED`, `ARCHIVED`).
- **FR-ADM-02 Bulk Import Pipeline**: CSV/JSON upload with validation for missing fields, invalid topics, and duplicate question text. Produces downloadable error reports.
- **FR-ADM-03 Test Paper Builder**: Assemble tests by configuring sections, question counts, marks, time limits, and manual/automated question pool picking.
- **FR-ADM-04 Audit Logging**: Non-tamperable logs of administrative actions (question edits, role promotions, test creations).

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Performance & Latency

- **NFR-PERF-01**: P95 API response time for answer autosave $< 80\text{ms}$.
- **NFR-PERF-02**: Initial Page Load (LCP) for student dashboard and test interface $< 1.2\text{s}$ over 4G networks.
- **NFR-PERF-03**: Database queries for test submission and score calculation completed $< 350\text{ms}$ inside a single atomic transaction.

### 5.2 Reliability & Availability

- **NFR-REL-01**: High availability architecture targeting 99.9% uptime.
- **NFR-REL-02**: In-progress test attempts must survive client crashes, device reboot, or network drops with zero data loss.

### 5.3 Security & Data Privacy

- **NFR-SEC-01**: Argon2id password hashing with custom salt.
- **NFR-SEC-02**: JWT access tokens (15m expiry) paired with HTTP-only, SameSite=Strict refresh cookies (7d expiry).
- **NFR-SEC-03**: Strict Role-Based Access Control (RBAC) enforced on every API route.
- **NFR-SEC-04**: Complete sanitization of user inputs to prevent SQLi, XSS, and prototype pollution.

### 5.4 Accessibility & UI Standards

- **NFR-ACC-01**: Adherence to WCAG 2.2 AA standards, including full keyboard navigation, minimum 4.5:1 color contrast, and ARIA labels on all custom controls.
- **NFR-ACC-02**: Fully responsive layouts functioning seamlessly from 360px mobile viewports up to 4K ultra-wide monitors.

---

## 6. Success Metrics & Platform KPIs

1. **Test Completion Rate**: $> 92\%$ of started mock tests completed without client-side error.
2. **Practice Retention**: Aspirants completing at least 3 practice drills per week.
3. **Accuracy Improvement**: Aspirants who practice weak topics demonstrate a $> 15\%$ boost in that topic's accuracy over a 30-day window.
4. **Zero Timer Desynchronization**: 100% of test attempts terminated exactly on server-calculated deadlines.
