---
name: repo-investigator
description: >
  Analyze, investigate, and compare code repositories. Use this skill whenever the user clones, downloads,
  or references an external repo and wants to understand it — what tech stack it uses, how it's architected,
  what features it has, and whether it's a good fit for their own project. Also trigger when the user asks
  to compare two repos, assess compatibility between codebases, evaluate whether to adopt a library or
  framework, or wants a "deep dive" or "investigation" of any repository. Trigger on phrases like:
  "what stack does this use", "analyze this repo", "compare these projects", "is this compatible with my project",
  "what does this codebase do", "investigate this repo", "break down this project for me", "would this work with
  my setup", "what can I learn from this repo", or any mention of evaluating an external codebase against the
  user's own project.
---

# Repo Investigator

A skill for deep-diving into code repositories and comparing them against your own project.

## When to use this

- User has cloned or downloaded a repo and wants to understand it
- User wants to know the tech stack, architecture, or feature set of a codebase
- User wants to compare two repos (typically: an external one vs their own project)
- User wants to assess whether an external repo/library/tool is compatible with their project
- User asks "what does this project do" or "break this down for me"

## Core philosophy

Explore before you read. Structure before detail. The goal is to build a mental model of the codebase
quickly and accurately, not to read every file. Think of yourself as a technical due-diligence analyst —
you're producing an actionable brief, not a book report.

---

## Phase 1: Reconnaissance (both repos)

Run this phase on each repo the user wants analyzed. If comparing, do the user's project first (it provides
the baseline for what "compatible" means).

### 1.1 — Directory structure scan

```bash
# Get the lay of the land — 3 levels deep, ignore noise
find <REPO_ROOT> -maxdepth 3 -type f \
  | grep -v node_modules | grep -v .git | grep -v __pycache__ \
  | grep -v '.pyc$' | grep -v dist/ | grep -v build/ \
  | head -200
```

Also run a simple tree if available:
```bash
tree -L 2 -I 'node_modules|.git|__pycache__|dist|build|.next|vendor' <REPO_ROOT>
```

What you're looking for:
- How many top-level directories? What are they named? (src, lib, app, packages, services, cmd — these tell you a lot)
- Is it a monorepo? (look for packages/, apps/, services/, or a workspace config)
- Are there separate frontend/backend directories?
- Where do tests live?
- Are there infra/deploy configs? (Dockerfile, docker-compose, k8s/, terraform/, .github/workflows)

### 1.2 — Manifest & config detection

Read the following files **selectively** — first 80 lines is usually enough for manifests. These are
your primary signals for tech stack identification.

| Signal file | What it tells you |
|---|---|
| `package.json` | JS/TS ecosystem: framework, build tools, test runner, key deps |
| `requirements.txt` / `Pipfile` / `pyproject.toml` / `setup.py` / `setup.cfg` | Python ecosystem |
| `go.mod` | Go ecosystem + module dependencies |
| `Cargo.toml` | Rust ecosystem |
| `Gemfile` | Ruby ecosystem |
| `pom.xml` / `build.gradle` / `build.gradle.kts` | Java/Kotlin ecosystem |
| `composer.json` | PHP ecosystem |
| `mix.exs` | Elixir ecosystem |
| `Package.swift` / `*.xcodeproj` | Swift/iOS ecosystem |
| `pubspec.yaml` | Dart/Flutter ecosystem |
| `tsconfig.json` | TypeScript config — compiler options reveal a lot about the project's maturity |
| `.env.example` / `.env.sample` | Environment variables hint at external services (DB, cache, auth, APIs) |
| `docker-compose.yml` | Service architecture — databases, caches, queues, workers |
| `Dockerfile` | Runtime, base image, build steps |
| `Makefile` / `justfile` / `Taskfile.yml` | Build/task runner commands |
| `.github/workflows/*.yml` / `.gitlab-ci.yml` | CI/CD pipeline, test matrix, deploy targets |

```bash
# Quick manifest discovery
find <REPO_ROOT> -maxdepth 2 -type f \( \
  -name 'package.json' -o -name 'requirements.txt' -o -name 'pyproject.toml' \
  -o -name 'go.mod' -o -name 'Cargo.toml' -o -name 'Gemfile' \
  -o -name 'pom.xml' -o -name 'build.gradle*' -o -name 'composer.json' \
  -o -name 'tsconfig.json' -o -name 'docker-compose.yml' -o -name 'Dockerfile' \
  -o -name '.env.example' -o -name 'Makefile' -o -name 'mix.exs' \
  -o -name 'pubspec.yaml' \
\) 2>/dev/null
```

Read each discovered manifest. For `package.json`, pay special attention to:
- `dependencies` vs `devDependencies` — this is where you identify the framework, UI library, ORM, test runner, bundler, etc.
- `scripts` section — reveals the build pipeline, dev server, test command, lint command
- `workspaces` — if present, it's a monorepo

### 1.3 — Entry point identification

Find the main entry points — these are the files that tie the whole app together:

- `src/index.*`, `src/main.*`, `src/app.*`, `src/server.*`
- `cmd/*/main.go` (Go convention)
- `app.py`, `main.py`, `manage.py`, `wsgi.py`, `asgi.py`
- `index.html`, `App.tsx`, `App.vue`, `App.svelte`
- `lib.rs`, `main.rs`

Read the top ~50 lines of each entry point. They reveal:
- What framework is being initialized (Express, FastAPI, Next.js, Rails, etc.)
- What middleware/plugins are loaded
- How routing is structured
- What services are wired together

### 1.4 — README & docs

Read the README.md (or README.rst, etc.) — this is the author's own summary. Look for:
- Project description and purpose
- Installation instructions (reveals runtime requirements)
- Architecture diagrams or explanations
- API documentation links
- Contributing guidelines (reveals code standards)

---

## Phase 2: Stack Profile (per repo)

After reconnaissance, synthesize your findings into a structured profile. Produce this for each repo.

### Output format

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
- Coverage tool: Istanbul / c8 / coverage.py / None

**DevOps & Infrastructure:**
- Containerization: Docker / Podman / None
- CI/CD: GitHub Actions / GitLab CI / CircleCI / None
- Deploy target: Vercel / AWS / GCP / Fly.io / Railway / Self-hosted / Unknown
- IaC: Terraform / Pulumi / CloudFormation / None

**Architecture Pattern:** Monolith / Monorepo / Microservices / Serverless / Hybrid
**Repo Structure:** [brief description — e.g. "monorepo with packages/ for shared libs, apps/ for deployables"]

**Key Features / Functionality:**
- [Feature 1 — brief description]
- [Feature 2 — brief description]
- [Feature N — keep it to the major ones]
```

When you can't determine something, say "Not detected" rather than guessing.

---

## Phase 3: Comparison & Compatibility Assessment

Only run this phase if the user wants to compare two repos (typically their project vs an external one).

### 3.1 — Stack overlap matrix

Compare the two profiles dimension by dimension:

| Dimension | User's Project | External Repo | Match? |
|---|---|---|---|
| Language | TypeScript | TypeScript | Yes |
| Frontend framework | React | React | Yes |
| Backend framework | Express | FastAPI | No — different language |
| Database | PostgreSQL | PostgreSQL | Yes |
| ORM | Prisma | SQLAlchemy | No — different ecosystem |
| Testing | Jest | pytest | No — different ecosystem |
| ... | ... | ... | ... |

### 3.2 — Compatibility assessment

Evaluate these dimensions and provide a rating for each (High / Medium / Low / N/A):

**Language & Runtime Compatibility**
Can code from the external repo run in the user's environment without translation? Same language = High. Same ecosystem but different framework = Medium. Different language = Low.

**Dependency Overlap**
How many shared dependencies exist? High overlap means easier integration and fewer new dependencies to manage. Check for version conflicts in shared deps.

**Architecture Compatibility**
Could components from the external repo fit into the user's architecture? A microservice can plug into a microservices architecture. A monolith feature is harder to extract.

**API/Interface Compatibility**
Do they use the same API patterns (REST vs GraphQL)? Same data formats? Compatible auth patterns?

**Pattern & Convention Alignment**
Similar folder structure? Same testing patterns? Compatible code style? This affects how natural it feels to work across both.

**Feature Relevance**
Which features from the external repo are actually useful to the user's project? List them with a brief note on integration effort.

### 3.3 — Integration feasibility

Based on the above, provide one of these overall assessments:

- **Drop-in compatible** — Same stack, similar patterns. Code/components can be adopted directly with minimal modification.
- **Adoptable with effort** — Shared language or framework, but different patterns or conventions. Will need refactoring but the core logic transfers.
- **Reference only** — Different stack, but the architecture, patterns, or algorithms are worth studying and reimplementing in the user's stack.
- **Incompatible** — Different ecosystem entirely. The external repo solves a different problem or requires a fundamentally different architecture.

Include a brief section on:
- **What to adopt:** specific components, patterns, or approaches worth pulling in
- **What to skip:** things that don't fit or would create unnecessary complexity
- **Migration/integration effort:** rough sense of effort (trivial / moderate / significant / major overhaul)

---

## Execution notes

- Always explore the file tree before reading files. This prevents wasting reads on irrelevant files.
- For large repos (>500 files at top 2 levels), focus on the `src/` or `app/` directory and manifests. Don't try to read everything.
- If the user only wants to investigate one repo (no comparison), stop after Phase 2.
- If the user's project isn't available on the filesystem, ask them to point you to it or describe its stack so you can still do a comparison.
- When listing features, focus on user-facing functionality, not internal utilities. Think: "what does this app DO for someone using it?"
- If a repo has a README with good documentation, lean on it — the author knows their own project better than a file scan will reveal.
- Prioritize accuracy over completeness. It's better to say "Not detected" than to guess wrong.
- Keep the tone practical and opinionated. The user wants your assessment, not a neutral dump of facts.
