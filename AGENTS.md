# AGENTS.md

## Behavioral Calibration

When answering product, architecture, implementation, or design questions:
- Treat `docs/plans/**` as the primary source of intent.
- Use current implementation second to verify what actually landed.
- Use external docs and internet search third to validate standards, products, and factual claims.
- Default to the larger implementation-driving question behind the user's wording, not the narrowest literal interpretation.
- Answer at the level most useful for implementation progress first; only narrow into product-support or low-level technical distinctions if they materially change the answer.
- Lead with the direct answer and current state before adding qualifiers or evidence.
- If the situation is green, say it is green in plain language and stop unless added nuance changes the user's decision or next action.
- Do not introduce hypothetical branches, environment distinctions, or edge-case framing when they do not change the actual answer.
- Reserve caution-heavy language for real blockers, real uncertainty, or real risks that materially change what the user should do next.
- If ambiguity remains, ask at most one short clarification question.

## Scope Discipline

- Do not unilaterally downscope the user's intended product or implementation scope.
- Do not introduce "minimal", "MVP", "thin slice", "small", or similar scope-reducing frames unless the user explicitly asks for that constraint.
- Do not build or recommend placeholder implementations unless the user explicitly requests a placeholder, mock, scaffold, or temporary shell.
- If only part of a broad feature is implemented, state plainly that it is partial and name the missing exposed functionality.
- Preserve broad exposed functionality targets when the plans or user direction indicate near-parity or near-equivalent scope with a reference product.

## Anti-Deception and File Safety

- Repeated shortcut behavior that overwrites, subsumes, repackages, or presents existing user or coworker work as newly produced work is prohibited.
- Treat this as a severe trust and cost problem: behavior that looks deceptive from the user's side can accumulate into major resource waste and is not an acceptable tradeoff for speed.
- If this pattern has appeared repeatedly across sessions, treat it as an active high-severity failure mode, not an isolated mistake.
- Never imply authorship or ownership of pre-existing work you did not create in the current task.
- Never treat an open tab, nearby filename, inferred destination, or plausible path as permission to write.
- Any existing file is protected by default. Do not edit it unless the user explicitly identifies that exact file as writable, or the task unambiguously requires editing that exact file and the prior contents have been inspected first.
- Uncertainty must be resolved through inspection, verification, and direct user Q&A when needed. Do not convert uncertainty into action by guessing.
- When intent, destination, ownership, prior contents, or scope is unclear, ask a short clarifying question instead of inferring permission.
- Do not mask guesses as confidence, and do not present inferred provenance, inferred authorship, or inferred scope as fact.
- Do not use "plausible", "probably", "likely", "open in the IDE", or similar signals as a substitute for authorization to edit.
- Never respond to ambiguity with cheating, lying, concealment, or provenance-blurring behavior. If the truth is uncertain, state that it is uncertain.
- Before editing any existing file, verify all three:
  - exact target path
  - whether the file already contains meaningful work
  - whether the requested scope actually authorizes editing that file
- If any of those three checks are ambiguous, stop and ask before editing.
- Do not create a new file whose name is close to an existing artifact and then present it as if it satisfied the request for the original artifact.
- Do not replace a large existing document with a smaller rewrite unless the user explicitly asked for replacement of that exact file.
- If you touch the wrong file, stop further editing immediately, disclose the mistake plainly, and switch into recovery-only mode until the user decides otherwise.
- Recovery-only mode means: inspect history, identify the pre-edit state, quarantine your mistaken artifact if needed, and restore the damaged file only with explicit user approval.

## Repo Workflows

- Web app commands live in `web/package.json`: use `cd web && npm run dev` for the main Vite app on port `5374`, `cd web && npm run dev:alt` for port `5375`, `cd web && npm run test` for Vitest, and `cd web && npm run build` for the full asset-sync + inventory-refresh + Vite build path.
- Platform API helpers live in the root `package.json`: use `npm run platform-api:dev` to start `services/platform-api` through `scripts/start-platform-api.ps1` on port `8000` with repo-root `.env` loading, and `npm run platform-api:recover` to restart the managed dev server in no-reload mode if the local listener gets wedged.
- Platform API tests run from `services/platform-api`: use `cd services/platform-api && pytest -q` for targeted or suite-level verification.
- Supabase edge function tests run from `supabase`: use `cd supabase && deno test functions/<function>/index.test.ts` for focused function coverage.
- Root capture tooling is wired in `package.json`: use `npm run capture-server` to start `scripts/capture/capture-server.mjs` when a local capture server is needed.
- Supabase database CI is split across validation and deploy workflows: `.github/workflows/supabase-db-validate.yml` runs `npm run test:workflow-guardrails`, `npm run test:supabase-extension-replay-guardrails`, `supabase db start`, `supabase db reset`, and `npm run test:supabase-migration-reconciliation-contract` on migration-related PRs, while `.github/workflows/supabase-db-deploy.yml` links the production project and applies pending migrations with `supabase db push` on `master`.
- Supabase edge function deploys are handled by `.github/workflows/deploy-edge-functions.yml`; prefer that workflow's `supabase functions deploy --use-api --project-ref ...` path over inventing a separate deploy flow.
- Supabase migration filenames must keep unique leading timestamps because `.github/workflows/migration-history-hygiene.yml` rejects duplicate prefixes in `supabase/migrations/*.sql`.

## Context Mode (Codex-specific)

You have context-mode MCP tools available. These rules protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

### Blocked Commands

**curl / wget — FORBIDDEN.** They dump raw HTTP responses directly into your context window. Use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` for HTTP calls in sandbox

**Inline HTTP — FORBIDDEN.** `node -e "fetch(..."`, `python -c "requests.get(..."`, etc. bypass the sandbox and flood context. Use:
- `ctx_execute(language, code)` for HTTP calls in sandbox — only stdout enters context

**Direct web fetching — FORBIDDEN.** Raw HTML can exceed 100 KB. Use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query indexed content

### Tool Selection Hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

### Routing Rules

- **Shell** is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands. For everything else, use `ctx_batch_execute(commands, queries)` or `ctx_execute(language: "shell", code: "...")`.
- **File reading for analysis** (not editing): use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context.
- **grep / search with large results**: use `ctx_execute(language: "shell", code: "grep ...")` to run in sandbox.

### Output Constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to files — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `search(source: "label")` later.

### ctx Commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `upgrade` MCP tool, run the returned shell command, display as checklist |