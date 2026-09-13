# Frontend Route Map & UI Architecture — CDSPrep

**Document:** Frontend Route Map & Component Architecture  
**Framework:** Next.js 15+ App Router  
**Platform:** CDSPrep

---

## 1. Complete Route Architecture

```
apps/web/app/
│
├── (public)/                                    # Marketing, Information, and SEO
│   ├── layout.tsx                               # Public layout with Global Navbar and Footer
│   ├── page.tsx                                 # / -> High-converting Landing Page (Hero, Stats, CDS Subjects, PYQs, Features, FAQ, CTA)
│   ├── about/page.tsx                           # /about -> Mission, CDS exam context, defence values
│   ├── features/page.tsx                        # /features -> Detailed breakdown of Test Engine, PYQ, Mistake Notebook, AI
│   ├── pricing/page.tsx                         # /pricing -> Transparent plans (Free tier, Premium CDS aspirants)
│   ├── contact/page.tsx                         # /contact -> Contact form, academic inquiries
│   ├── faq/page.tsx                             # /faq -> Comprehensive CDS preparation & platform FAQ
│   ├── privacy/page.tsx                         # /privacy -> Privacy policy & data protection
│   └── terms/page.tsx                           # /terms -> Terms of service & academic use policy
│
├── (auth)/                                      # Authentication flows
│   ├── layout.tsx                               # Clean, focused auth layout (split-pane with motivational defence imagery)
│   ├── login/page.tsx                           # /login -> Email/Password login, Remember me, Forgot password link
│   ├── register/page.tsx                        # /register -> Registration with Target Academy selection (IMA/INA/AFA/OTA)
│   ├── forgot-password/page.tsx                 # /forgot-password -> Request password reset email
│   ├── reset-password/page.tsx                  # /reset-password -> Enter new password with cryptographic token
│   └── verify-email/page.tsx                    # /verify-email -> Token confirmation view
│
├── (student)/                                   # Authenticated Student Dashboard & Practice Portal
│   ├── layout.tsx                               # Student shell: Sidebar, Header with Streak & Target Academy badge, Notifications
│   ├── dashboard/page.tsx                       # /dashboard -> Overall accuracy, solved count, streak, weak topics, resume test
│   ├── practice/
│   │   ├── page.tsx                             # /practice -> Practice hub (All, Subjects, Chapters, Difficulties)
│   │   ├── all/page.tsx                         # /practice/all -> Randomized practice across full question bank
│   │   ├── english/page.tsx                     # /practice/english -> General English chapter drills (Grammar, Vocab, Comprehension)
│   │   ├── gk/page.tsx                          # /practice/gk -> General Knowledge drills (Polity, History, Science, Defence)
│   │   ├── maths/page.tsx                       # /practice/maths -> Elementary Maths drills (Arithmetic, Algebra, Geometry, Trig)
│   │   └── topic/[topicSlug]/page.tsx           # /practice/topic/[topicSlug] -> Fine-grained topic drill session
│   ├── pyq/
│   │   ├── page.tsx                             # /pyq -> 20-Year PYQ browser (2006–2026), Filter by Year, Session, Paper
│   │   ├── year/[year]/page.tsx                 # /pyq/year/[year] -> All papers for a specific year (CDS I & CDS II)
│   │   ├── subject/[subject]/page.tsx           # /pyq/subject/[subject] -> Subject-specific PYQs over 20 years
│   │   └── [paperId]/page.tsx                   # /pyq/[paperId] -> Paper details (Take as Exam or Browse Questions)
│   ├── tests/
│   │   ├── page.tsx                             # /tests -> Mock test catalog (Full Length, Subject-wise, Topic-wise)
│   │   ├── full/page.tsx                        # /tests/full -> Full-length UPSC CDS mock simulations (340 Qs / 300 Marks)
│   │   ├── subject/page.tsx                     # /tests/subject -> Subject-specific 2-hour sectional tests
│   │   ├── topic/page.tsx                       # /tests/topic -> Short 30-minute high-yield topic tests
│   │   └── custom/page.tsx                      # /tests/custom -> Custom test builder (pick questions, time, topics)
│   ├── test/
│   │   └── [testId]/
│   │       ├── instructions/page.tsx            # /test/[testId]/instructions -> Instructions, syllabus, scoring rules
│   │       └── attempt/[attemptId]/page.tsx     # /test/[testId]/attempt/[attemptId] -> Distraction-free live exam interface
│   ├── result/
│   │   └── [attemptId]/page.tsx                 # /result/[attemptId] -> Scorecard, Net score, Accuracy, KaTeX Solutions
│   ├── analytics/page.tsx                       # /analytics -> Performance trends, speed analysis, subject radars
│   ├── mistakes/page.tsx                        # /mistakes -> Automatic Mistake Notebook, Careless vs Conceptual tags, Retry
│   ├── bookmarks/page.tsx                       # /bookmarks -> Saved questions with personal notes & drill mode
│   ├── leaderboard/page.tsx                     # /leaderboard -> Weekly/Monthly aspirant rankings (privacy controlled)
│   ├── study-plan/page.tsx                      # /study-plan -> Structured daily revision goals and spaced repetition
│   ├── notifications/page.tsx                   # /notifications -> In-app alerts, test results, daily targets
│   ├── ai-assistant/page.tsx                    # /ai-assistant -> Contextual CDS study assistant & performance diagnosis
│   ├── profile/page.tsx                         # /profile -> Target Academy selection, notification preferences
│   └── settings/page.tsx                        # /settings -> Account security, password update, data export
│
└── (admin)/                                     # Admin & Faculty Management Console
    ├── layout.tsx                               # Admin shell: Left Admin Navigation, Quick stats, Faculty profile
    ├── admin/
    │   ├── dashboard/page.tsx                   # /admin/dashboard -> Platform metrics, question bank stats, active exams
    │   ├── users/page.tsx                       # /admin/users -> User directory, RBAC role assignment, activity status
    │   ├── questions/
    │   │   ├── page.tsx                         # /admin/questions -> Question bank explorer with filters & status tabs
    │   │   ├── create/page.tsx                  # /admin/questions/create -> Question Studio with KaTeX live preview
    │   │   ├── edit/[id]/page.tsx               # /admin/questions/edit/[id] -> Update existing question & options
    │   │   └── import/page.tsx                  # /admin/questions/import -> CSV/JSON bulk ingestion & error logs
    │   ├── pyq/page.tsx                         # /admin/pyq -> PYQ Paper catalog & official session linking
    │   ├── tests/
    │   │   ├── page.tsx                         # /admin/tests -> Mock test manager
    │   │   └── create/page.tsx                  # /admin/tests/create -> Multi-section test creator with duration & rules
    │   ├── subjects/page.tsx                    # /admin/subjects -> Syllabus hierarchy manager (Subjects, Chapters, Topics)
    │   ├── topics/page.tsx                      # /admin/topics -> Fine-grained topic taxonomy editor
    │   ├── analytics/page.tsx                   # /admin/analytics -> Cohort performance, question difficulty calibration
    │   ├── reports/page.tsx                     # /admin/reports -> Moderation queue for student-flagged questions
    │   ├── ai/page.tsx                          # /admin/ai -> AI question generator studio & approval queue
    │   ├── audit-logs/page.tsx                  # /admin/audit-logs -> Non-tamperable administrative action logs
    │   └── settings/page.tsx                    # /admin/settings -> Platform exam rules, default negative marking
```

---

## 2. Examination Interface Component Wireframe & Layout

To satisfy Rule 50, the test attempt view (`/test/[testId]/attempt/[attemptId]`) provides a distraction-free, accessible layout:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] CDSPrep | CDS I 2026 Full Length Mock          Remaining Time: [ 01:48:23 ]     │
├──────────────────────────┬──────────────────────────────────────────┬──────────────────┤
│ SECTION TABS             │ QUESTION DISPLAY AREA                    │ QUESTION PALETTE │
│ [ English ] [ GK ] [Math]│                                          │ Legend:          │
│                          │ Question 42 of 120    [Marks: +0.83 / -0.28] │ [1] Answered   │
│                          │                                          │ [2] Not Answered │
│                          │ In the given sentence, identify the      │ [3] Marked Review│
│                          │ segment which contains a grammatical     │ [4] Unvisited    │
│                          │ error:                                   │                  │
│                          │                                          │ Grid Buttons:    │
│                          │ "Neither the officer nor his men was     │ [ 1 ][ 2 ][ 3 ]  │
│                          │ able to locate the enemy outpost."       │ [ 4 ][ 5 ][ 6 ]  │
│                          │                                          │ [ 7 ][ 8 ][ 9 ]  │
│                          │ Options:                                 │ [10 ][11 ][12 ]  │
│                          │ ( ) A. Neither the officer               │ ...              │
│                          │ ( ) B. nor his men                       │                  │
│                          │ ( ) C. was able to locate                │ Actions:         │
│                          │ ( ) D. the enemy outpost                 │ [ Submit Exam ]  │
│                          │                                          │                  │
│                          │ Action Bar:                              │ Focus Status:    │
│                          │ [ Mark for Review ] [ Clear Response ]   │ Fullscreen Active│
│                          │ [ Previous ]                 [ Next ]    │ Integrity: OK    │
└──────────────────────────┴──────────────────────────────────────────┴──────────────────┘
```

---

## 3. Responsive Breakpoints & Mobile Optimization

- **Desktop $(\ge 1024\text{px})$**: Full 3-column split view (Section Tabs, Question Display, Question Palette).
- **Tablet $(768\text{px} - 1023\text{px})$**: 2-column layout; palette collapsible into a slide-over sheet.
- **Mobile $(< 768\text{px})$**:
  - Sticky header with timer and submit button.
  - Full-width question and touch-friendly option cards ($> 48\text{px}$ touch targets).
  - Floating bottom bar with `[Previous]`, `[Palette Sheet]`, and `[Next]`.
  - Distraction-free full-bleed layout preventing accidental tab switches.
