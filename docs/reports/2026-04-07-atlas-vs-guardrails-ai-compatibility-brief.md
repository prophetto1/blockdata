# Repo Compatibility Brief - atlas-guardrails vs guardrails-ai

## Block 1: Context

- `repo_name`: `atlas-guardrails` vs `guardrails-ai/guardrails`
- `repo_path`: `I:\atlas-guardrails`, `I:\guardrails`
- `analysis_date`: `2026-04-07`
- `our_context`: `writing-system` is a mixed TypeScript/React + Python/FastAPI repo with existing repo/CI guardrail tests and active Claude, Codex, and Cursor surfaces.
- `scope`: Compare repo-level agent guardrails vs runtime LLM validation for preventing drift, duplicate code, and weak agent workflow in this codebase.
- `target_summary`: Atlas is a local-first CLI/MCP guardrail for coding agents; Guardrails AI is an application framework for validating LLM inputs/outputs and structured generation.

## Block 2: Decision

- `fit_decision`: `atlas-guardrails = high-fit`, `guardrails-ai = partial-fit`
- `thesis`: Atlas matches our repo workflow problem directly; Guardrails AI mostly solves a different layer of the stack.
- `go_no_go`: `approve atlas-guardrails`, `prototype guardrails-ai only if we want product/runtime LLM validation`
- `confidence`: `Medium`

## Block 3: Borrowing Matrix

| Domain | Evidence (file:function) | Decision | Why | Cost |
|---|---|---|---|---|
| Context pack before editing | `atlas-guardrails/src/core/packer.ts:AtlasPacker.pack`, `atlas-guardrails/src/mcp/server.ts:atlas_pack` | Adapt | Directly targets "read context before editing" for agent workflows | 1d |
| Duplicate detection before creating code | `atlas-guardrails/src/core/guardrails.ts:findDuplicates`, `atlas-guardrails/src/mcp/server.ts:atlas_find_duplicates` | Adapt | Fits our duplicate/entropy problem better than runtime validators | 1d |
| Repo indexing across TS + Python | `atlas-guardrails/src/core/indexer.ts:AtlasIndexer.index`, `atlas-guardrails/src/core/parser.ts:parse`, `parseTS`, `parsePython` | Adapt | Covers both our frontend and backend languages with one repo index | 1d |
| MCP / agent integration | `atlas-guardrails/.mcp.json:mcpServers.atlas`, `atlas-guardrails/AGENTS.md` | Lift | Easy to map into our existing `.mcp.json` + agent instruction surfaces | 1d |
| CI / API drift gate | `atlas-guardrails/src/core/guardrails.ts:checkDrift` | Rework | Useful shape, but current drift check is simplistic and manifest-dependent | 3d |
| Runtime LLM output validation | `guardrails/guardrails/guard.py:Guard.validate`, `guardrails/guardrails/validator_service/sequential_validator_service.py` | Adapt | Strong if we need validation inside the Python app, but not for coding-agent workflow | 3d |
| CLI validation of model output | `guardrails/guardrails/cli/validate.py:validate`, `validate_llm_output` | Skip | Validates LLM outputs against specs, not repo editing behavior | 1d |
| Guard server / REST validation | `guardrails/guardrails/cli/start.py:start`, `guardrails/README.md:guardrails start` | Skip | App service pattern; not the main problem we are solving here | 1w+ |
| Hub-installed validators | `guardrails/README.md:guardrails hub install ...` | Adapt | Potentially useful later for platform-api model safety/compliance | 3d |

## Block 4: Architecture Map

### Agent workflow layer
- `extract`: Atlas MCP server, CLI commands, root instruction pattern
- `extension_points`: `.mcp.json` server entry, root `AGENTS.md` / `CLAUDE.md` / Codex instructions
- `contracts`: "pack before editing", "search before creating", "check drift before declaring done"

### Repo analysis layer
- `extract`: Atlas indexer, parser, packer, duplicate search
- `extension_points`: task description into `atlas_pack`, creation intent into `atlas_find_duplicates`
- `contracts`: repo state -> symbol index -> context pack / duplicate candidate list

### Runtime validation layer
- `extract`: Guardrails `Guard`, validator execution pipeline, CLI/server entrypoints
- `extension_points`: validator sets, hub-installed validators, server config
- `contracts`: input/output text -> validation pipeline -> pass/fail/fix/reask/filter

## Block 5: Risks

- `validate_first`: Atlas parser is heuristic regex parsing, not a deep AST; verify symbol quality on our repo before trusting it broadly.
- `validate_first`: Atlas drift checks require fresh indexing and an `approved_api.json` workflow to be meaningful.
- `platform_mismatch`: Atlas solves repo workflow discipline, not anti-rationalization session hooks by itself.
- `platform_mismatch`: Guardrails AI is Python-first application infrastructure, while our main immediate problem is cross-agent repo behavior.
- `license`: Atlas `MIT`; Guardrails AI `Apache-2.0`; our repo is private. `No obvious blocker`, but downstream redistribution rules still need normal review.
- `fit_breakers`: If we expect deterministic "don't claim done without verification" enforcement from Atlas alone, that expectation is wrong.

## Block 6: Verdict

**Product-fit assignment:**
- Use Atlas for repo workflow guardrails across coding agents.
- Do not treat Guardrails AI as a substitute for repo editing discipline.
- Use Guardrails AI later only if `services/platform-api` needs structured output or validator-based LLM runtime safety.

**Roadmap (smallest useful sequence):**
- First cut: add Atlas MCP config to our repo, add agent instructions, run `atlas index` on `writing-system`.
- Gate: prove Atlas catches one duplicate-helper scenario and one API-drift scenario in a sample branch.
- Next wave: wire `atlas check` into CI alongside existing guardrail tests and tune scope/noise.

**Hard invariants:**
- Do not remove existing repo CI guardrails while introducing Atlas.
- Do not treat Atlas as a replacement for explicit verification/test rules.
- Do not introduce Guardrails AI into the coding workflow layer unless the need shifts to runtime model validation.
- Keep repo workflow enforcement and runtime LLM validation as separate concerns.
