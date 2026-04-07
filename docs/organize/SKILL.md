---
name: repo-investigator
description: >
  Analyze, investigate, and compare code repositories. Use this skill whenever the user clones, downloads,
  or references an external repo and wants to understand it — what tech stack it uses, how it's architected,
  what features it has, and whether it's a good fit for their own project. Also trigger when the user asks
  to compare two repos, assess compatibility between codebases, evaluate whether to adopt a library or
  framework, or wants a "deep dive" or "investigation" of any repository. Also use when the user wants a
  borrowing assessment, fit analysis, or adoption decision for integrating external code into their platform.
  Trigger on phrases like: "what stack does this use", "analyze this repo", "compare these projects",
  "is this compatible with my project", "what does this codebase do", "investigate this repo", "break down
  this project for me", "would this work with my setup", "what can I learn from this repo", "should we
  adopt this", "what can we borrow", "do a fit assessment", or any mention of evaluating an external
  codebase against the user's own project. Even if the user doesn't say "investigate" — if they paste a
  GitHub URL or mention an unfamiliar repo by name and seem to want to understand it, use this skill.
---

# Repo Investigator

Deep-dive into code repositories, compare them against your own project, and produce
implementation-ready borrowing assessments.

## Core philosophy

Explore before you read. Structure before detail. Build a mental model of the codebase quickly and
accurately — don't read every file. You're a technical due-diligence analyst producing an actionable
brief, not a book report.

## Phase routing

Check user intent, then run only the phases needed. Stop as soon as you've answered the question.

| User intent | Phases | Stop after |
|---|---|---|
| "What does this repo do?" | 1 → 2 | Stack Profile |
| "Compare these two repos" | 1 → 2 → 3 | Integration Feasibility |
| "Should we adopt this?" / borrowing decision | 1 → 2 → 3 → 4 | Borrowing Contract |
| "Analyze against [platform]" (no second repo on disk) | 1 → 2 → 4 | Borrowing Contract |

---

## Phase 1: Reconnaissance

Run on each repo. If comparing, do the user's project first — it sets the baseline for "compatible."

### 1.1 — Directory structure scan

```bash
find <REPO_ROOT> -maxdepth 3 -type f \
  | grep -v node_modules | grep -v .git | grep -v __pycache__ \
  | grep -v '.pyc$' | grep -v dist/ | grep -v build/ \
  | head -200
```

```bash
tree -L 2 -I 'node_modules|.git|__pycache__|dist|build|.next|vendor' <REPO_ROOT>
```

Look for: top-level directory names (src, lib, packages, services, cmd), monorepo signals
(packages/, apps/, workspace config), frontend/backend separation, test locations,
infra configs (Dockerfile, docker-compose, k8s/, terraform/, .github/workflows).

### 1.2 — Manifest & config detection

Read selectively — first 80 lines of each manifest is usually enough.

```bash
find <REPO_ROOT> -maxdepth 2 -type f \( \
  -name 'package.json' -o -name 'requirements.txt' -o -name 'pyproject.toml' \
  -o -name 'go.mod' -o -name 'Cargo.toml' -o -name 'Gemfile' \
  -o -name 'pom.xml' -o -name 'build.gradle*' -o -name 'composer.json' \
  -o -name 'tsconfig.json' -o -name 'docker-compose.yml' -o -name 'Dockerfile' \
  -o -name '.env.example' -o -name 'Makefile' -o -name 'mix.exs' \
  -o -name 'pubspec.yaml' \
\) 2>/dev/null
```

| Signal file | What it tells you |
|---|---|
| `package.json` | JS/TS ecosystem: framework, build tools, test runner, key deps. Check `dependencies`, `devDependencies`, `scripts`, `workspaces`. |
| `requirements.txt` / `pyproject.toml` / `Pipfile` | Python ecosystem |
| `go.mod` | Go ecosystem + module deps |
| `Cargo.toml` | Rust ecosystem |
| `Gemfile` / `pom.xml` / `build.gradle*` / `composer.json` / `mix.exs` / `pubspec.yaml` | Ruby / Java / PHP / Elixir / Dart |
| `tsconfig.json` | TypeScript maturity (strict mode, path aliases, target) |
| `.env.example` | External service dependencies (DB, cache, auth, APIs) |
| `docker-compose.yml` | Service architecture |
| `Makefile` / `justfile` | Build/task runner commands |
| `.github/workflows/*.yml` | CI/CD pipeline, test matrix, deploy targets |

### 1.3 — Entry point identification

Find and read the top ~50 lines of main entry points. They reveal framework choice,
middleware stack, routing structure, and service wiring.

Common locations: `src/index.*`, `src/main.*`, `src/app.*`, `cmd/*/main.go`,
`app.py`, `main.py`, `manage.py`, `App.tsx`, `lib.rs`, `main.rs`.

### 1.4 — README & docs

Read README.md for: project purpose, install instructions (runtime requirements), architecture
notes, API docs links. The author knows their project better than a file scan will reveal —
lean on good docs when they exist.

---

## Phase 2: Stack Profile

Synthesize reconnaissance into a structured profile. Produce one per repo.

```
## Stack Profile: [repo name]

**Primary Language(s):** TypeScript, Python, etc.
**Runtime:** Node.js 20.x, Python 3.11, Go 1.22, etc.

**Frontend:**
- Framework: React 18 / Next.js 14 / Vue 3 / Svelte / None
- Styling: Tailwind / CSS Modules / styled-components / SCSS
- State Management: Redux / Zustand / Pinia / Context API / None
- Build Tool: Vite / Webpack / Turbopack / esbuild

**Backend:**
- Framework: Express / FastAPI / Django / Rails / Gin / None
- API Style: REST / GraphQL / tRPC / gRPC
- Auth: JWT / OAuth / Session / Clerk / Auth0 / Custom

**Data Layer:**
- Database: PostgreSQL / MySQL / MongoDB / SQLite / None detected
- ORM/Query Builder: Prisma / Drizzle / SQLAlchemy / TypeORM / Raw SQL
- Cache: Redis / Memcached / None detected
- Queue/Messaging: RabbitMQ / Kafka / BullMQ / Celery / None detected

**Testing:**
- Framework: Jest / Vitest / pytest / Go test / RSpec
- E2E: Playwright / Cypress / Selenium / None
- Coverage: Istanbul / c8 / coverage.py / None

**DevOps:**
- Containerization: Docker / Podman / None
- CI/CD: GitHub Actions / GitLab CI / CircleCI / None
- Deploy target: Vercel / AWS / GCP / Fly.io / Self-hosted / Unknown
- IaC: Terraform / Pulumi / CloudFormation / None

**Architecture Pattern:** Monolith / Monorepo / Microservices / Serverless / Hybrid
**Repo Structure:** [brief — e.g. "monorepo with packages/ for shared libs, apps/ for deployables"]

**Key Features:**
- [Feature 1 — brief description]
- [Feature 2 — brief description]
```

Say "Not detected" rather than guessing. Accuracy over completeness.

---

## Phase 3: Comparison & Compatibility

Run only when comparing two repos or assessing stack compatibility.

### 3.1 — Stack overlap matrix

| Dimension | User's Project | External Repo | Match? |
|---|---|---|---|
| Language |  |  |  |
| Frontend framework |  |  |  |
| Backend framework |  |  |  |
| Database |  |  |  |
| ORM |  |  |  |
| Testing |  |  |  |

### 3.2 — Compatibility dimensions

Rate each High / Medium / Low / N/A:

- **Language & Runtime** — Can code run in the user's environment without translation?
- **Dependency Overlap** — Shared deps? Version conflicts?
- **Architecture** — Could components fit into the user's architecture?
- **API/Interface** — Same patterns, data formats, auth?
- **Pattern & Convention** — Similar structure, testing, code style?
- **Feature Relevance** — Which features are actually useful? Note integration effort per feature.

### 3.3 — Integration feasibility

Assign one verdict:

- **Drop-in compatible** — Same stack, similar patterns. Adopt directly.
- **Adoptable with effort** — Shared language/framework, different patterns. Core logic transfers after refactoring.
- **Reference only** — Different stack, but architecture/patterns/algorithms worth studying and reimplementing.
- **Incompatible** — Different ecosystem. Solves a different problem or needs fundamentally different architecture.

Then specify: what to adopt, what to skip, and effort estimate (trivial / moderate / significant / major overhaul).

---

## Phase 4: Borrowing Assessment

Run when the user needs an implementation-ready borrowing decision with exact file evidence.

**Read `references/borrowing-contract.md` before filling out this phase.** It contains the full
contract template (§4.0–4.12) including the Borrowing Matrix, Architecture Map, Extract Checklist,
Evidence Inventory, Risks, Roadmap, Security Matrix, and optional AGChain appendix.

The contract is the deliverable. Fill it completely — empty fields signal incomplete analysis, not
irrelevance. If a section doesn't apply, write "N/A" with a one-line reason.

Key rules for Phase 4:
- Every Borrowing Matrix row needs exact file/function evidence. "Not found" is acceptable; empty is not.
- The Architecture Map examples are placeholders — replace them with actual findings.
- The Extract Checklist (§4.4) traces back to the Architecture Map (§4.3). If it doesn't, something's wrong.
- The Roadmap gate (§4.8) must define a concrete pass/fail condition before the next wave begins.
- License compatibility (§4.6) is a potential blocker — surface it early, not as an afterthought.

---

## Execution notes

- Explore the file tree before reading files. This prevents wasting reads on irrelevant files.
- For large repos (>500 files at top 2 levels), focus on `src/` or `app/` and manifests.
- If the user's project isn't on disk, ask them to describe its stack so you can still compare.
- Focus on user-facing functionality when listing features — what does this app DO, not how it's wired.
- Be practical and opinionated. The user wants your assessment, not a neutral dump of facts.
