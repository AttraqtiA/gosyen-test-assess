# AGENTS.md — Gosyen Assess Platform

> This file is the canonical instruction set for any coding agent (Claude Code, Cursor, Copilot, etc.)
> working on this codebase. Read it entirely before writing a single line of code.

---

## Project Overview

**Gosyen Assess** is a multi-tenant, universal assessment platform built for longevity and continuous
improvement. It replaces the existing Laravel app at test.gosyenpolinator.com.

It must support every category of test imaginable: personality (DISC, MBTI, OCEAN), IQ/logic,
composite intelligence batteries (IST-style), interview assessments, Kahoot-style live quizzes,
skills tests, and fully custom formats — with flexible scoring, LLM-powered review, manual
correction, and rich export capabilities.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | Full-stack, SSR, API routes in one repo |
| UI | Tailwind CSS + shadcn/ui | Fast, polished, solo-dev friendly |
| ORM | Prisma + PostgreSQL | Relational, multi-tenant safe, type-safe |
| Auth | Better Auth (organizations) | Multi-tenant out of the box |
| Client state | Zustand | Lightweight, no boilerplate |
| LLM | Vercel AI SDK + Anthropic Claude | Structured outputs, streaming, easy integration |
| File storage | MinIO (self-hosted, S3-compatible) | VPS-friendly, no AWS cost |
| Export | ExcelJS (xlsx) | Server-side Excel generation |
| Deployment | Docker Compose on VPS | Single-machine, self-hosted, Nginx reverse proxy |

---

## Project Structure

```
/app
  /(auth)
    /login/page.tsx
  /(candidate)
    /page.tsx                          ← session code entry / landing
    /take/page.tsx                     ← test engine (session code flow)
    /take/[token]/page.tsx             ← direct invite link flow
    /results/[attemptId]/page.tsx      ← candidate result page
  /(dashboard)
    /dashboard/page.tsx                ← overview stats
    /dashboard/tests/page.tsx
    /dashboard/tests/new/page.tsx      ← test builder wizard
    /dashboard/tests/[id]/page.tsx
    /dashboard/tests/[id]/edit/page.tsx
    /dashboard/tests/[id]/sessions/page.tsx
    /dashboard/tests/[id]/results/page.tsx
    /dashboard/attempts/[id]/page.tsx  ← single attempt detail + corrector panel
    /dashboard/candidates/[email]/page.tsx ← composite candidate profile
    /dashboard/corrector/page.tsx      ← manual review queue
  /api
    /attempts/start/route.ts
    /attempts/submit/route.ts
    /attempts/[id]/llm-review/route.ts
    /attempts/[id]/export/route.ts     ← Excel export single attempt
    /proctor/log/route.ts
    /responses/[id]/score/route.ts     ← corrector manual override
    /results/[attemptId]/route.ts
    /export/batch/route.ts             ← Excel export batch results

/components
  /ui/                                 ← shadcn components (do not hand-edit)
  /test-taking/
    Timer.tsx
    QuestionCard.tsx
    ProgressBar.tsx
    ViolationBanner.tsx
    question-types/
      MCQQuestion.tsx
      EssayQuestion.tsx
      ScaleQuestion.tsx
      RankingQuestion.tsx
      TrueFalseQuestion.tsx
      OpenQuestion.tsx
  /dashboard/
    TestCard.tsx
    AttemptTable.tsx
    ResultsTable.tsx
    CorrectorPanel.tsx
    ScoringConfigEditor.tsx
    SubTestTree.tsx                    ← left sidebar tree in test builder
    ProfileMappingEditor.tsx           ← condition → label rows
    CompositeFormulaEditor.tsx
    ExportButton.tsx

/lib
  /auth.ts                             ← Better Auth config
  /prisma.ts                           ← Prisma client singleton
  /scoring.ts                          ← pluggable scoring engine
  /llm-review.ts                       ← LLM scoring pipeline
  /export.ts                           ← ExcelJS export helpers
  /store.ts                            ← Zustand test-taking state

/prisma
  schema.prisma
  seed.ts

docker-compose.yml
.env.example
```

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Tenancy ─────────────────────────────────────────────────────────────────

model Company {
  id                String             @id @default(cuid())
  name              String
  slug              String             @unique
  createdAt         DateTime           @default(now())
  users             User[]
  tests             Test[]
  candidateProfiles CandidateProfile[]
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role
  companyId String?
  company   Company? @relation(fields: [companyId], references: [id])
  createdAt DateTime @default(now())
}

enum Role {
  SUPER_ADMIN
  COMPANY_ADMIN
  CORRECTOR
}

// ─── Tests ────────────────────────────────────────────────────────────────────

model Test {
  id               String        @id @default(cuid())
  companyId        String
  company          Company       @relation(fields: [companyId], references: [id])
  title            String
  description      String?
  category         TestCategory
  timeLimitMinutes Int?          // null = no global limit (use per-subtest limits)
  isActive         Boolean       @default(true)
  shuffleQuestions Boolean       @default(false)
  showResultsToCandidate Boolean @default(false)
  passingThreshold Float?        // optional pass/fail cutoff score
  scoringConfig    Json
  // scoringConfig shape:
  // {
  //   compositeFormula?: string,       e.g. "SE1 + SE2 + RA * 1.5"
  //   subtestWeights?: Record<string, number>,
  //   profileMappings?: Array<{ condition: string, label: string, description: string }>
  // }
  createdAt        DateTime      @default(now())
  subTests         SubTest[]
  sessions         TestSession[]
  attempts         Attempt[]
}

enum TestCategory {
  PERSONALITY
  IQ_LOGIC
  INTERVIEW
  KAHOOT
  COMPOSITE    // IST-style multi-subtest batteries
  CUSTOM
}

model SubTest {
  id            String     @id @default(cuid())
  testId        String
  test          Test       @relation(fields: [testId], references: [id])
  title         String     // e.g. "SE1 - Number Sequences"
  description   String?
  order         Int
  timeLimitSecs Int?       // per-subtest timer (used in IST-style)
  isEnabled     Boolean    @default(true) // default state; sessions can override
  scoringConfig Json
  // scoringConfig shape:
  // {
  //   strategy: 'correct_count' | 'sum_by_dimension' | 'average_scale' | 'weighted_sum' | 'custom_formula',
  //   formula?: string,          used when strategy = custom_formula
  //   dimensionMap?: Record<string, string>  questionId → dimension label
  // }
  questions     Question[]
}

model Question {
  id            String       @id @default(cuid())
  subTestId     String
  subTest       SubTest      @relation(fields: [subTestId], references: [id])
  body          String
  type          QuestionType
  order         Int
  options       Json?
  // MCQ options shape: Array<{ id: string, label: string, value?: number, dimension?: string }>
  // Scale shape:       { min: number, max: number, minLabel: string, maxLabel: string }
  // Ranking shape:     Array<{ id: string, label: string }>
  correctAnswer String?      // for MCQ / TRUE_FALSE auto-scoring
  weight        Float        @default(1.0)
  dimension     String?      // e.g. "D", "I", "E/I", "Openness", "SE1"
  scoringHint   String?      // rubric shown to LLM and corrector
}

enum QuestionType {
  MCQ
  ESSAY
  SCALE
  RANKING
  TRUE_FALSE
  OPEN
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

model TestSession {
  id                 String    @id @default(cuid())
  testId             String
  test               Test      @relation(fields: [testId], references: [id])
  code               String    @unique // 6-char alphanumeric candidate entry code
  label              String?           // internal label e.g. "Batch 3 — Marketing"
  enabledSubtestIds  String[]          // which subtests are active for THIS session
  expiresAt          DateTime?
  maxUses            Int?
  useCount           Int       @default(0)
  createdAt          DateTime  @default(now())
  attempts           Attempt[]
}

// ─── Attempts & Responses ─────────────────────────────────────────────────────

model Attempt {
  id             String          @id @default(cuid())
  testId         String
  test           Test            @relation(fields: [testId], references: [id])
  sessionId      String?
  session        TestSession?    @relation(fields: [sessionId], references: [id])
  candidateName  String
  candidateEmail String
  startedAt      DateTime        @default(now())
  submittedAt    DateTime?
  status         AttemptStatus   @default(IN_PROGRESS)
  responses      Response[]
  proctoringLogs ProctoringLog[]
  result         Result?
}

enum AttemptStatus {
  IN_PROGRESS
  SUBMITTED
  UNDER_REVIEW  // LLM or corrector is reviewing
  REVIEWED      // final
}

model Response {
  id          String   @id @default(cuid())
  attemptId   String
  attempt     Attempt  @relation(fields: [attemptId], references: [id])
  questionId  String
  subTestId   String   // denormalized for fast per-subtest grouping
  answer      String   // raw: selected option id, text, scale value, comma-sep ranking
  autoScore   Float?   // computed by formula engine at submission
  llmScore    Float?   // scored by LLM pipeline
  llmFeedback String?
  llmConfidence String? // 'low' | 'medium' | 'high'
  manualScore Float?   // corrector override — always wins
  finalScore  Float?   // resolved: manual ?? llm ?? auto
}

model Result {
  id               String    @id @default(cuid())
  attemptId        String    @unique
  attempt          Attempt   @relation(fields: [attemptId], references: [id])
  totalScore       Float?
  subtestScores    Json?     // Record<subtestTitle, score>
  dimensionMap     Json?     // e.g. { D: 24, I: 18, S: 30, C: 12 }
  profile          String?   // e.g. "INTJ", "High D", resolved from profileMappings
  profileLabel     String?   // human-readable label from profileMappings
  summary          String?   // LLM-generated narrative
  isPassed         Boolean?  // evaluated against passingThreshold
  reviewedBy       String?   // userId
  reviewedAt       DateTime?
}

// ─── Proctoring ───────────────────────────────────────────────────────────────

model ProctoringLog {
  id        String          @id @default(cuid())
  attemptId String
  attempt   Attempt         @relation(fields: [attemptId], references: [id])
  event     ProctoringEvent
  metadata  Json?
  createdAt DateTime        @default(now())
}

enum ProctoringEvent {
  TAB_SWITCH
  FOCUS_LOSS
  FULLSCREEN_EXIT
  SNAPSHOT        // future: webcam snapshot stored in MinIO
}

// ─── Composite Profiles ───────────────────────────────────────────────────────

model CandidateProfile {
  id               String   @id @default(cuid())
  companyId        String
  company          Company  @relation(fields: [companyId], references: [id])
  candidateEmail   String
  label            String   // e.g. "Marketing Manager Applicant — Batch 2"
  attemptIds       String[] // multiple Attempt IDs combined into this profile
  compositeScore   Float?
  compositeSummary String?  // LLM narrative across all included test results
  createdAt        DateTime @default(now())
}
```

---

## Auth Setup (Better Auth)

Configure `lib/auth.ts` with organization/multi-tenant plugin.

**Role hierarchy:**
- `SUPER_ADMIN` — creates and manages Companies, all access
- `COMPANY_ADMIN` — manages their company's tests, sessions, results, exports
- `CORRECTOR` — read-only on attempts queue, can submit manual scores only

**Candidate access:**
- No account required
- Entry via session code at `/` → `/take`
- Or direct invite link at `/take/[token]`

**Route protection:**
- All `/dashboard/*` routes: require authenticated user, redirect to `/login` otherwise
- `/dashboard/corrector/*`: require `CORRECTOR` or `COMPANY_ADMIN` role
- API routes: validate session and role on every request
- Every DB query in dashboard routes must be scoped by the authenticated user's `companyId`

---

## Scoring Engine (`/lib/scoring.ts`)

Pluggable, called after submission with `(test, enabledSubtests, responses)`.

### Per-subtest strategies

```typescript
type ScoringStrategy =
  | 'correct_count'     // Σ(correct ? weight : 0)
  | 'sum_by_dimension'  // group by question.dimension, sum values → dimensionMap
  | 'average_scale'     // mean of all scale numeric answers
  | 'weighted_sum'      // Σ(answer_numeric_value × question.weight)
  | 'custom_formula'    // evaluate scoringConfig.formula with dimension vars injected
```

### Composite formula

After all subtests are scored, evaluate `test.scoringConfig.compositeFormula` as a JS
expression where subtest titles are variables:

```
// e.g. formula: "SE1 + SE2 + RA * 1.5"
// variables injected: { SE1: 42, SE2: 38, RA: 30, ... }
```

Use `new Function()` with a strict variable whitelist — never `eval()` raw user input unsanitized.

### Profile mapping

After composite score is computed, evaluate `profileMappings` conditions in order.
First matching condition wins. Conditions use the same variable set (dimension values, subtest
scores, totalScore):

```json
[
  { "condition": "D > I && D > S && D > C", "label": "High D", "description": "Dominant style" },
  { "condition": "totalScore >= 80", "label": "Superior", "description": "Top percentile" }
]
```

### Essay / Open questions

Mark `Response.autoScore = null`, flag as `pending_llm`. Do not block submission.

### Output shape

```typescript
interface ResultPayload {
  totalScore: number | null
  subtestScores: Record<string, number>   // subtestTitle → score
  dimensionMap: Record<string, number>    // dimension → value
  profile: string | null                  // raw key e.g. "INTJ"
  profileLabel: string | null             // human label e.g. "Architect"
  isPassed: boolean | null
}
```

---

## LLM Review Pipeline (`/lib/llm-review.ts`)

Triggered via `POST /api/attempts/[id]/llm-review` (manually by admin, or auto on submission
if `test.scoringConfig.autoLlmReview === true`).

```typescript
// For each Response where question.type is ESSAY or OPEN:
// 1. Build prompt: question.body + question.scoringHint (rubric) + response.answer
// 2. Call Claude via Vercel AI SDK generateObject():
//    schema: { score: number (0-100), feedback: string, confidence: 'low'|'medium'|'high' }
// 3. Save to response.llmScore, response.llmFeedback, response.llmConfidence
// 4. Recompute response.finalScore = manual ?? llm ?? auto
// 5. After all responses, recompute Result.totalScore

// finalScore resolution (always respect this order):
const finalScore = response.manualScore ?? response.llmScore ?? response.autoScore
```

Update `Attempt.status` to `UNDER_REVIEW` while running, `REVIEWED` on completion.

---

## Excel Export (`/lib/export.ts` + `/api/export/*`)

Use **ExcelJS** for all Excel generation. Never use `xlsx` (SheetJS) — ExcelJS has better
styling support for professional output.

### Single attempt export — `GET /api/attempts/[id]/export`

Generates a `.xlsx` file with:
- **Sheet 1 — Summary:** candidate name, email, test title, date, total score, subtest scores,
  dimension map, profile label, pass/fail, proctoring violation count
- **Sheet 2 — Responses:** one row per question with: question body, question type, subtest,
  candidate answer, auto score, LLM score, LLM feedback, manual score, final score
- **Sheet 3 — Proctoring Log:** timestamp, event type, metadata

### Batch results export — `POST /api/export/batch`

Body: `{ testId, sessionId? }` — exports all submitted attempts for a test/session.

Generates a `.xlsx` file with:
- **Sheet 1 — Candidates overview:** one row per attempt with all summary fields + one column
  per subtest score + one column per dimension
- **Sheet 2 — Raw responses:** all responses from all candidates (candidateName + candidateEmail
  as first two columns, then one column per question)
- **Sheet 3 — Subtest breakdown:** pivot-style, subtests as columns, candidates as rows

### Formatting rules (apply to all exports)
- Header row: bold, background `#1E293B`, font color white, frozen
- Alternating row background: white / `#F8FAFC`
- Column widths: auto-fit to content, min 12, max 60
- Score columns: number format `0.00`
- Date columns: format `DD MMM YYYY HH:mm`
- Pass rows: font color `#16A34A` (green). Fail rows: `#DC2626` (red)
- Sheet tab colors: Summary `#3B82F6`, Responses `#8B5CF6`, Proctoring `#F59E0B`

### Export buttons in dashboard

Add `ExportButton` component in:
- `/dashboard/tests/[id]/results` — "Export all results" → batch export
- `/dashboard/attempts/[id]` — "Export this attempt" → single export
- Both buttons show a loading spinner during generation and trigger browser download on completion

---

## Test Builder UI (`/dashboard/tests/new` and `/dashboard/tests/[id]/edit`)

Build as a **multi-step wizard** with a persistent left sidebar.

### Left sidebar — SubTest tree

Always visible during editing. Shows the full test structure:

```
[Test title]
  ├── [SubTest: SE1]  ✓  ↕
  │     ├── Q1 [MCQ]
  │     └── Q2 [MCQ]
  ├── [SubTest: SE2]  ✓  ↕
  └── + Add sub-test
```

- Click a subtest to jump to its editor
- Toggle enable/disable per subtest
- Drag handle (↕) to reorder
- Click a question to jump to its editor

### Wizard steps

**Step 1 — Test metadata**
- Title, description
- Category (dropdown: Personality / IQ & Logic / Interview / Composite / Kahoot / Custom)
- Global time limit OR "use per-subtest timers" toggle
- Shuffle questions toggle
- Show results to candidate toggle
- Passing threshold (optional numeric field)

**Step 2 — Structure builder**
- Add SubTest → creates named section with its own timer field
- Each subtest: title, description, optional time limit in seconds, enable/disable
- Drag to reorder subtests
- Expand subtest to manage its questions

**Step 3 — Question editor**

Per question:
- Body (textarea, plain text)
- Type selector: MCQ | Essay | Scale | Ranking | True/False | Open
- Type-specific fields:
  - **MCQ**: add/remove options (label + optional numeric value + optional dimension tag),
    mark correct answer(s), multi-select correct answers toggle
  - **Scale**: min value, max value, min label, max label (e.g. "Strongly Disagree" → "Strongly Agree")
  - **Ranking**: add/remove items to rank
  - **Essay / Open**: scoring hint / rubric textarea (shown to LLM and corrector)
  - **True/False**: correct answer toggle
- Dimension tag field (free text, e.g. "D", "E/I", "Openness")
- Weight field (number, default 1.0)
- "Import questions" button: paste newline-separated list → auto-creates one question per line
  as the same type, editable afterward

**Step 4 — Scoring config**

Two panels side by side:

Left panel — per subtest scoring:
- Strategy dropdown per subtest (correct_count / sum_by_dimension / average_scale /
  weighted_sum / custom_formula)
- If custom_formula: show formula text field with available variable hints

Right panel — composite (only shown if test has 2+ subtests):
- Composite formula field: e.g. `SE1 + SE2 + RA * 1.5`
- Live example calculation with placeholder values
- Profile mapping table: each row has `condition`, `label`, `description` fields
  - Add/remove rows
  - Conditions use subtest title vars + dimension vars + `totalScore`

**Step 5 — Preview & publish**
- Full read-only preview of the test exactly as candidate sees it
- Publish toggle (sets `isActive = true`)
- "Generate session code" button → creates first TestSession with all subtests enabled

---

## Session Management (`/dashboard/tests/[id]/sessions`)

- Create session form: label, expiry date (optional), max uses (optional)
- **SubTest selector**: checklist of all subtests — admin picks which are enabled for this
  session. This is the IST use case: pick only SE1, SE3, SE5, SE6 for this cohort.
- Session card shows: code (large, copyable), candidate link (copyable), label, expiry,
  use count / max uses, enabled subtests list, disable button
- Disabled sessions still show historical attempt data — never delete, only disable

---

## Composite Candidate Profiles (`/dashboard/candidates/[email]`)

- Shows all attempts by this candidate email across all tests in the company
- Each attempt card: test title, date, total score, profile label, subtest scores
- "Create composite profile" button:
  - Select which attempts to include (checkbox per attempt)
  - Optional label for this profile (e.g. "Batch 3 — Engineering Role")
  - On create: compute weighted composite across selected results
  - Optionally trigger LLM to generate a unified narrative summary across all test results
- Composite profile shows combined score, per-test breakdown, and LLM narrative
- Export button: generates Excel with all selected attempts + composite summary

---

## Test-Taking UI (`/take` and `/take/[token]`)

**All client components** — do not use server components here.

**Zustand store shape (`/lib/store.ts`):**

```typescript
interface TestStore {
  attemptId: string | null
  currentSubtestIndex: number
  currentQuestionIndex: number
  answers: Record<string, string>       // questionId → raw answer
  startedAt: Date | null
  violations: ProctoringEvent[]
  isSubmitted: boolean

  setAnswer: (questionId: string, answer: string) => void
  nextQuestion: () => void
  prevQuestion: () => void
  addViolation: (event: ProctoringEvent) => void
  submit: () => Promise<void>
}
```

**Flow:**
1. Candidate enters name + email → POST `/api/attempts/start` → receive `attemptId`
2. Request fullscreen (`document.documentElement.requestFullscreen()`)
3. Start countdown timer (if test has time limit)
4. Render questions one at a time, grouped by subtest
5. Show subtest title as a section header when subtest changes
6. Proctoring listeners (attach on mount, remove on unmount):
   - `document.addEventListener('visibilitychange', ...)` → TAB_SWITCH
   - `window.addEventListener('blur', ...)` → FOCUS_LOSS
   - `document.addEventListener('fullscreenchange', ...)` → FULLSCREEN_EXIT
   - Each event: POST to `/api/proctor/log` + call `store.addViolation()`
7. `ViolationBanner` — shows count of violations, persists until dismissed
8. Timer expiry OR manual submit → POST `/api/attempts/submit` with all answers
9. If `test.showResultsToCandidate`: redirect to `/results/[attemptId]`
   Else: show thank-you screen

**Question type renderers:**
- `MCQQuestion` — radio group (single correct) or checkbox group (multi-correct)
- `EssayQuestion` — textarea, character count, no paste restrictions
- `ScaleQuestion` — horizontal button row (1–5 or 1–10) with min/max labels
- `RankingQuestion` — drag-to-rank ordered list
- `TrueFalseQuestion` — two large buttons: True / False
- `OpenQuestion` — textarea, no character limit

---

## API Routes

All routes validate auth session and `companyId` scope before any DB operation.

| Method | Path | Description |
|---|---|---|
| POST | `/api/attempts/start` | Validate session code/token, create Attempt record |
| POST | `/api/attempts/submit` | Save all Responses, run scoring engine, create Result |
| POST | `/api/attempts/[id]/llm-review` | Trigger LLM scoring for ESSAY/OPEN responses |
| GET | `/api/attempts/[id]/export` | Generate + stream single attempt Excel file |
| POST | `/api/proctor/log` | Append ProctoringLog entry |
| PATCH | `/api/responses/[id]/score` | Corrector manual score override, recompute finalScore |
| GET | `/api/results/[attemptId]` | Return Result (public, token-validated for candidate) |
| POST | `/api/export/batch` | Generate + stream batch results Excel for a test/session |
| POST | `/api/candidates/profile` | Create CandidateProfile from selected attempt IDs |

---

## Environment Variables (`.env.example`)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/gosyen_assess"

# Better Auth
BETTER_AUTH_SECRET="generate-a-long-random-string"
BETTER_AUTH_URL="http://localhost:3000"

# Anthropic (LLM review)
ANTHROPIC_API_KEY="sk-ant-..."

# MinIO (file storage for future webcam snapshots)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="gosyen-assets"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
      - minio

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gosyen_assess
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

volumes:
  postgres_data:
  minio_data:
```

---

## Seed Script (`prisma/seed.ts`)

Create the following:

**Companies & Users:**
- Company: `Gosyen HR`, slug `gosyen`
- 1 × SUPER_ADMIN: `superadmin@gosyen.com` / `password123`
- 1 × COMPANY_ADMIN: `admin@gosyen.com` / `password123`
- 1 × CORRECTOR: `corrector@gosyen.com` / `password123`

**Test 1 — DISC Personality (category: PERSONALITY)**
- 20 SCALE questions (1–5), each tagged with dimension D / I / S / C
- scoringConfig: `{ strategy: 'sum_by_dimension' }`
- compositeFormula: none (single subtest)
- profileMappings: High D / High I / High S / High C based on dominant dimension
- 1 subtest: "DISC Assessment"
- 1 session: code `DISC01`

**Test 2 — Logic & IQ (category: IQ_LOGIC)**
- 1 subtest: "Logical Reasoning" with 10 MCQ questions (correctAnswer set)
- scoringConfig: `{ strategy: 'correct_count' }`
- 1 session: code `IQ0001`

**Test 3 — IST Intelligence Battery (category: COMPOSITE)**
- 6 subtests:
  - SE1: Number Sequences (10 MCQ) — enabled by default
  - SE2: Verbal Analogies (10 MCQ) — enabled
  - SE3: Spatial Reasoning (10 MCQ) — enabled
  - SE4: Arithmetic (10 MCQ) — disabled by default
  - SE5: Similarities (10 MCQ) — enabled
  - SE6: Memory (10 MCQ) — enabled
- compositeFormula: `SE1 + SE2 + SE3 + SE5 + SE6`
- 2 sessions:
  - `IST001`: all 5 enabled subtests
  - `IST002`: only SE1, SE3, SE5, SE6 (SE2 excluded for this cohort)

**Test 4 — Interview Assessment (category: INTERVIEW)**
- 1 subtest: "Structured Interview" with 5 ESSAY questions with scoringHint rubrics
- scoringConfig: `{ strategy: 'weighted_sum', autoLlmReview: true }`
- 1 session: code `INT001`

---

## General Constraints

- TypeScript everywhere. `strict: true` in `tsconfig.json`. Zero `any`.
- All dashboard data fetching via **Next.js Server Components**. No `useEffect` data fetching
  in dashboard pages.
- The test-taking route (`/take`) is a **Client Component** — it needs browser APIs for
  fullscreen, visibility, timers.
- The corrector's `manualScore` always wins over `llmScore` in `finalScore` resolution.
- Every single DB query that touches Test, SubTest, Question, Session, Attempt, Response,
  or Result must be scoped by `companyId`. No exceptions. No cross-tenant data bleed.
- Do **not** build webcam/snapshot proctoring in Phase 1. The `SNAPSHOT` enum value and
  MinIO are set up but unused — tab/focus/fullscreen logging is enough.
- Do **not** build Kahoot live mode in Phase 1. The `KAHOOT` category exists in the schema
  but the real-time WebSocket engine is Phase 3.
- `scoringConfig` and `options` are `Json` fields — the scoring engine and question renderers
  read them at runtime with Zod validation, not raw access.
- Use `ExcelJS` for all Excel exports. Never `SheetJS/xlsx`.
- Session codes are 6-character uppercase alphanumeric. Generate with `crypto.randomBytes`.
- After every corrector `manualScore` patch, recompute `Response.finalScore` and
  `Result.totalScore` immediately in the same request.

---

## What is NOT in Phase 1 (build later)

| Feature | Phase |
|---|---|
| Webcam snapshots → MinIO | Phase 2 |
| Kahoot live quiz mode (WebSockets) | Phase 3 |
| Email invitations to candidates | Phase 2 |
| PDF result certificates | Phase 2 |
| Public API for third-party integrations | Phase 4 |
| SSO / OAuth for company admins | Phase 4 |
