# CLAUDE.md 

## Repo-Rules

---

## Purpose

Populate memory-libsql so new workers can query it on session start and immediately know how to operate in this repo. After population, AGENTS.md and CLAUDE.md shrink to thin pointers.

## The sorting rule

- **libsql** = "how this repo works" — stable until deliberately changed.
- **memory-sqlite** = "what we decided while working" — emerges from sessions.

If it sounds like onboarding, put it in libsql. If it sounds like a decision made during work, put it in memory-sqlite.

---

## Tier 1: How to behave

These entities tell a worker how to think and act. They apply to every task.

### 1. behavioral-calibration (behavioral-rule)

- Use sources in this order: the current task's active plan/design artifacts for intent, current implementation for what landed, external docs for validation.
- Default to the larger implementation-driving question, not the narrowest literal reading.
- Lead with the direct answer and current state before qualifiers.
- If the situation is green, say so and stop.
- Do not introduce hypothetical branches or edge-case framing when they do not change the answer.
- Reserve caution-heavy language for real blockers or real risks.
- If ambiguity remains, ask at most one short clarification question.

### 2. scope-discipline (behavioral-rule)

- Do not downscope the user's intended scope. No "minimal", "MVP", or "thin slice" unless the user asks.
- Do not build or recommend placeholders unless the user explicitly requests one.
- If a feature is only partially implemented, state that plainly and name what is missing.
- Preserve broad functionality targets when plans indicate near-parity with a reference product.

### 3. file-safety (behavioral-rule)

- Existing files are protected by default. Before editing, verify: exact path, whether the file contains meaningful work, and whether the task authorizes that edit. If any check is ambiguous, ask first.
- Never present pre-existing work as newly produced. Never infer authorship, provenance, or scope.
- Never treat an open tab, nearby filename, or plausible path as permission to write.
- If you edit the wrong file: stop immediately, disclose the mistake, enter recovery-only mode until the user decides otherwise.
- Do not replace a large document with a smaller rewrite unless the user explicitly asked for replacement.
- Do not mask guesses as confidence. If the truth is uncertain, say so plainly.
- Do not create backup files alongside user config files or anywhere outside the repo without asking where to put them.
- Do not modify shared document/parse components unless explicitly asked. Wire at composition layer, not component layer.

### 4. output-behavior (behavioral-rule)

- When working within a directory context, save substantial output as a document in that directory rather than printing it into chat.
- Example: user asks worker to read and analyze a file. The analysis goes into a report in the same directory, not into the chat.
- Prefer saving artifacts (analysis, summaries, plans, specs, code reviews) as files. Chat contains a brief summary pointing to the saved file.
- Short factual answers, confirmations, and clarifying questions belong in chat. Substantial work product belongs in files.
- When saving inside `_collaborate/research/`, use the naming convention: `MMDD--description--AUTHOR.md`.

### 5. investigation-before-action (behavioral-rule)

- Do not ask scope or architecture questions you can answer by reading code. Do the investigation first.
- Never describe what code does without reading it first. Do not build plans on unverified assumptions.
- Verify claims against current code before asserting them. Memory is point-in-time; code is now.
- When wrong, say "I was wrong" — do not rationalize or contradict statements just made.

---

## Tier 2: How to work here

These entities tell a worker how this repo's workflow operates.

### 6. session-onboarding (workflow-rule)

- On first entering the repo, scan all available tools: MCP servers, plugins, skills, hooks. Internalize what is available so tools can be used directly when needed.
- Query memory-libsql for operational rules and repo knowledge.
- Query memory-sqlite for recent decisions and cross-session context.
- Load the most relevant skills for the task — typically 3. Hooks reject work without skills loaded.

### 7. skill-loading (workflow-rule)

- Start every non-trivial task by loading the most relevant skills — typically 3.
- Hooks and triggers reject work that proceeds without loading skills first. This is enforced, not optional.
- When the user names a skill, that skill takes precedence and must be used for the turn.
- If a task fails because skills were not loaded, treat that as a workflow failure and correct before continuing.

### 8. memory-system (system-rule)

- memory-libsql holds stable onboarding rules, operational facts, and repo-operating guidance. Query it at session start.
- memory-sqlite holds work-related updates, durable decisions, and cross-session recall. Save decisions here during work.
- When a durable working decision, exception, constraint, or other work-related fact is worth remembering across sessions, save it to memory-sqlite during the task.
- If it sounds like "how this repo works", it belongs in libsql. If it sounds like "what we decided while working", it belongs in memory-sqlite.
- Do not spam memory-sqlite with transient debugging details or short-lived notes unless the user explicitly wants them preserved.

### 9. plan-handling (workflow-rule)

- Never auto-submit plans for approval. Always discuss findings with the user first.
- Never rubber-stamp plans. Read the code being extended before evaluating. Architectural shortcuts are rejection-level, not "notes."
- Design frontend first in implementation plans. Backend API serves the locked UI contract, not the reverse.
- UI work must start from what the user sees, not component inventories.

### 10. communication-style (behavioral-rule)

- No emojis unless the user explicitly requests them.
- Terse responses. No trailing summaries of what you just did.
- On Codex: use plain absolute Windows paths in backticks for file references.
- On CC in VSCode: use markdown `[file](path)` links for clickable references.
- Do not add docstrings, comments, or type annotations to code you did not change.

---

## Tier 3: What this repo contains

These entities describe the services, workflows, and git conventions.

### 11. web-app (repo-service)

- Commands live in `web/package.json`.
- Dev server: `cd web && npm run dev` (port 5374).
- Alt dev server: `cd web && npm run dev:alt` (port 5375).
- Tests: `cd web && npm run test` (Vitest).
- Build: `cd web && npm run build` (asset-sync + inventory + Vite).

### 12. platform-api (repo-service)

- Dev command: `npm run platform-api:dev` (port 8000, via `scripts/start-platform-api.ps1`).
- Recovery: `npm run platform-api:recover` (restart in no-reload mode).
- Tests: `cd services/platform-api && pytest -q`.
- Platform-api has absorbed edge function responsibilities. Do not design new features around Supabase edge functions.

### 13. supabase-ci (repo-service)

- DB validation: `.github/workflows/supabase-db-validate.yml` (guardrails + db start + db reset + reconciliation on PRs).
- DB deploy: `.github/workflows/supabase-db-deploy.yml` (db push on master).
- Edge function deploys: `.github/workflows/deploy-edge-functions.yml`. Use its path, don't invent a separate flow.
- Migration filenames must keep unique leading timestamps. `.github/workflows/migration-history-hygiene.yml` rejects duplicates.

### 14. web-docs (repo-service)

- AI knowledge layer. Serves humans, website AI (RAG/chat), and the Knowledge Graph.
- Stack: Astro 5.18 + Starlight 0.37 + Tailwind 4 + Keystatic (dev CMS).
- Dev server: `npm run dev` from `web-docs/` (port 4421).
- Direction doc: `web-docs/DIRECTION.md`.

### 15. gcp-infrastructure (infrastructure)

- GCP project: `agchain`.
- Cloud Run services host platform-api and conversion service.
- Secret naming: use `conversion-service-key`, not `platform-api-m2m-token`.
- Deploy via `gcloud run deploy` with repo-root cloudbuild.yaml or manual CLI.

### 16. _agchain (repo-subsystem)

- AGChain is a benchmark authoring platform. The `_agchain/` directory holds specs, reference code, datasets, and memory databases.
- Key subdirs: `_agchain/datasets/` (DuckDB files), `_agchain/_reference/` (cloned reference repos like Inspect AI).
- Supabase project ref: `dbdzzhshmigewyprahej`.

### 17. plans-convention (workflow-rule)

- Do not default new plan or design artifacts to `_collaborate/`.
- Save new plan or design artifacts only to an explicitly current destination for the task.
- If the destination is not already established in the repo or task context, ask before creating a new artifact.
- Naming: `YYYY-MM-DD-<topic>-<type>.md`.
- Lifecycle: draft → approved → implemented → archived.
- Treat plan content as intended direction, not as confirmed implementation.

### 18. git-workflow (repo-convention)

- JON's branch is `master` (de facto main). BUDDY's branch is `buddy`.
- Both push to origin: `github.com/prophetto1/blockdata.git`.
- Verify current clone's remotes and branch before any git operation.
- Do not force push. Do not amend published commits.
- Do not add `Co-Authored-By` trailers to commit messages.
- Merges flow situationally in either direction — context determines which machine leads.
- GitHub is the transport for source code between machines when BUDDY works from their own fork. SMB copy is for artifacts and emergency transfer only.

---

## Tier 4: How machines and configs work

These entities describe the physical environment and configuration files.

### 19. dual-pc-workflow (environment-rule)

- Two networked PCs: JON and BUDDY.
- JON is the de facto main machine. BUDDY builds features for merge when capacity is tight. Flow is bidirectional.
- JON's repo: `E:\writing-system`. BUDDY sees it as `P:\writing-system` (SMB mapped).
- BUDDY's local fork: `E:\blockdata-agchain` (JON sees it as `Y:\blockdata-agchain`).
- BUDDY's C: drive is mapped as Z: on JON.

### 20. _collaborate (environment-rule)

- Syncthing-backed cross-machine draft area at `E:\writing-system\_collaborate`.
- Not git-tracked. Not a source-code location.
- Use for: plans, handoffs, research, internal dev files, work requests.
- Do not use for: application source code, build artifacts, caches, logs, generated output.
- Files here are either promoted (committed to the repo proper) or deleted. Nothing accumulates indefinitely.

### 21. research-directory-protocols (workflow-rule)

- Research uses a directory-per-topic model inside `_collaborate/research/`.
- Directory naming: `YYYYMMDD--NN--topic-slug--AUTHOR`. Counter `01` is reserved for setup; actual research starts at `02`.
- File naming inside a directory: `MMDD--file-name--AUTHOR.md`.
- Any participant can add content using inline `[IDENTITY--comment]` annotations.
- Only the directory owner can delete existing content.
- Do not create separate docs when the directional document already exists — add to it instead.
- Source-of-truth for these rules: `_collaborate/research/20260410--01--general-rules-for-research--JON/`.

### 22. config-and-paths (infrastructure)

- **CC uses `.mcp.json` at repo root for project MCP servers. Codex does NOT read `.mcp.json`. Codex uses `config.toml` only.**
- **Codex uses `C:\Users\jwchu\.codex\config.toml` for global MCP servers. CC does NOT read `config.toml`.**
- CC project MCP config: `.mcp.json` (does NOT support variable expansion — use relative paths from repo root).
- CC global MCP config: `C:\Users\jwchu\.claude.json`.
- CC permissions: `.claude/settings.json` (project) and `~/.claude/settings.json` (global).
- Codex global config: `C:\Users\jwchu\.codex\config.toml` (does NOT support variable expansion).
- Codex local config: `.codex/config.toml` (path-agnostic settings only, no MCP paths).
- Memory databases: `E:\writing-system\_memory\` (gitignored).
  - `mcp-memory.db` — JON's memory-sqlite.
  - `libsql.db` — JON's memory-libsql.

### 23. nats-coordination (infrastructure)

- NATS broker runs as Windows service `nats-server` on JON.
- JetStream is enabled. Streams: `COORD_EVENTS`. KV buckets: `COORD_TASK_STATE`, `COORD_TASK_PARTICIPANTS`, `COORD_AGENT_PRESENCE`, `COORD_TASK_CLAIMS`.
- BUDDY connects remotely via `COORDINATION_NATS_URL` env var.
- Runtime bridge owned by `services/platform-api`. Web superuser page consumes it.
- `COORDINATION_RUNTIME_ENABLED=false` disables the bridge. Set to `true` when needed.
- Runtime root: `.codex-tmp/coordination-runtime/`. Broker root: `.codex-tmp/nats-runtime/`.
- Runbook: `docs/runbooks/nats-coordination-runtime.md`.
- Future: universal hook bus (`HOOKS.CHECK` subject, `HOOK_AUDIT` stream) planned on top of this substrate. See research topic 04.

### 24. repo-hygiene (workflow-rule)

- `_collaborate/` must stay gitignored everywhere.
- No hard-coded machine-local paths in scripts or docs. Use host names or `REPO_ROOT`.
- Exception: `docs/study-patterns/` is allowed to use Windows junctions and machine-local paths for its local study-index mirrors. `create-junctions.bat` and the existing junction targets under that tree are intentional and are not a pattern to copy into application/runtime code.
- Documentation must use neutral third-person wording, not reader-relative machine references.
- No embedded tokens, keys, or secrets in tracked configs.
- `.env.example` is the contract for env vars, not `.env` files themselves.

---

## Relations

```
memory-system --explains--> memory-sqlite
memory-system --explains--> memory-libsql
web-app --commands_in--> web/package.json
web-app --dev_port--> 5374
platform-api --commands_in--> root/package.json
platform-api --dev_port--> 8000
platform-api --absorbed--> edge-functions
supabase-ci --workflow_file--> .github/workflows/supabase-db-validate.yml
supabase-ci --workflow_file--> .github/workflows/supabase-db-deploy.yml
git-workflow --branch--> master (JON)
git-workflow --branch--> buddy (BUDDY)
git-workflow --remote--> origin (github.com/prophetto1/blockdata.git)
dual-pc-workflow --machine--> JON
dual-pc-workflow --machine--> BUDDY
_collaborate --syncs_between--> JON
_collaborate --syncs_between--> BUDDY
research-directory-protocols --rules_source--> _collaborate/research/20260410--01--general-rules-for-research--JON/
config-and-paths --cc_project--> .mcp.json
config-and-paths --cc_global--> ~/.claude.json
config-and-paths --codex_global--> ~/.codex/config.toml
config-and-paths --memory_dir--> _memory/
web-docs --dev_port--> 4421
gcp-infrastructure --project--> agchain
nats-coordination --runs_on--> JON
nats-coordination --bridge_owner--> platform-api
_agchain --supabase_ref--> dbdzzhshmigewyprahej
plans-convention --forbids--> defaulting new plan/design artifacts to _collaborate
plans-convention --requires--> explicit destination before creating a new artifact
```

---

## After population

AGENTS.md and CLAUDE.md both shrink to:

```markdown

## Memory
Query memory-libsql at session start for operational rules and repo knowledge.
Query memory-sqlite for decisions, rules, and cross-session context.
```

Plus platform-specific lines:
- CC: skill system pointer (`/using-superpowers`)
- Codex: context-mode routing (if not auto-injected by plugin)
