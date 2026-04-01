# AGChain Scorer + Prompt Template Registry Implementation Plan

## Pause this plan’s implementation
Keep the plan alive as a revision candidate
Choose Phase 1’s scorer model as the source of truth
Fold prompt templates into that world as a net-new addition
Ask for one revision pass, not a rewrite
Only resume execution after the revised scorer architecture is explicit

## Rationale: 
Phase 1 already says AGChain scorer registry is part of the Inspect-native substrate, not a later bespoke benchmark-local layer.
Phase 1 already expects dedicated scorer pages and shared frontend scorer modules.
The review correctly flags that agchainScorers.ts already exists in a Phase 1-aligned shape, so this newer plan would overwrite an active seam rather than extend it.
What that means in practice
1. Freeze implementation of this plan right now
2. Tell the author this is a revision, not a rejection
3. Revise the scorer side to match Phase 1
4. Keep prompts as a net-new addition




> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build two benchmark-scoped, interoperating AGChain registries — Scorer Definitions and Prompt Templates — with full CRUD backend, platform-api endpoints, OTel instrumentation, and frontend surfaces that replace the current placeholder pages, while upgrading the benchmark step editor so `scorer_ref` and `judge_prompt_ref` resolve against the new registries instead of accepting free-text strings. This establishes the registry composition pattern that all future AGChain surfaces will follow.

**Architecture:** Both registries are scoped to a benchmark via `benchmark_id` FK to `agchain_benchmarks`. Scorers and prompts are siblings — a scorer with `scoring_mode = "judge"` references a prompt template via `default_judge_prompt_ref`. The benchmark step editor binds to both registries: `scorer_ref` resolves against the scorer registry, `judge_prompt_ref` resolves against the prompt registry. Steps retain their existing string columns — no FK enforcement at the DB layer — with validation at the API layer checking that referenced scorer/prompt refs exist within the same benchmark scope. The API nests both registries under `/agchain/benchmarks/{benchmark_slug}/...` following the same pattern as the existing steps endpoints. Frontend pages replace the two existing placeholder pages and follow the Models page pattern (table + inspector + create sheet). The step editor's two free-text inputs become registry-resolved select dropdowns, with the scoring_mode dropdown gating which fields appear. This is frontend-first design: the locked UI contract drives the backend API shape.

**Tech Stack:** Supabase Postgres migrations, FastAPI, React + TypeScript, existing `platformApiFetch`, OpenTelemetry, pytest, Vitest.

**Status:** Draft — pending approval
**Author:** Claude (from user direction and investigation)
**Date:** 2026-03-31

---

## Design Rationale

### Why Scorers + Prompts as the first pair

1. **Tightest interoperation** — judge scoring mode requires both a scorer definition and a judge prompt template. They reference each other directly (`default_judge_prompt_ref`), not just through the step.
2. **Existing binding points** — the benchmark step editor already has `scorer_ref` and `judge_prompt_ref` fields. These are free-text today; upgrading them to registry-resolved dropdowns is the smallest change that creates real composition.
3. **Proven seed data** — Legal-10 has two working scorers (`d1_known_authority_scorer`, `citation_integrity`) and prompt templates in `benchmark/model_steps/` and `benchmark/judge_prompts/`.
4. **Pattern establishment** — every future registry surface (Datasets, Tools, Environment Profiles) will follow the same architecture: benchmark-scoped table, CRUD endpoints nested under benchmark slug, frontend page with table + inspector, binding resolution in the step editor.

### Reference positioning

- **Inspect AI** has no prompt registry — prompts are solvers, templates are strings loaded via `resource()`. Inspect AI's judge scorers (`model_graded_qa`, `model_graded_fact`) embed their prompt template as a parameter. AGChain's explicit prompt registry is more structured than Inspect AI's approach.
- **Braintrust** has a standalone Prompts surface (versioned prompt objects with model config, Mustache templating, environment deployment). AGChain v1 is simpler — prompt templates with placeholder declarations and kind classification, not full model-config objects. The Braintrust scorer creation UI embeds a prompt directly; AGChain separates them into two registries linked by reference.
- **Legal-10** treats prompts as benchmark package files and scorers as Python modules. The platform registry makes both first-class browsable objects that can be authored through the UI without writing Python.

---

## Benchmark Focus Contract

The AGChain frontend uses "project focus" as the UI-level scoping mechanism. In the current data model, **project === benchmark** with a 1:1 mapping. There is no separate project entity. The frontend stores the focused benchmark slug in `localStorage` under key `agchain.projectFocusSlug` and broadcasts changes via `agchain:project-focus-changed` events.

The Scorers page at `/app/agchain/scorers` and the Prompts page at `/app/agchain/prompts` resolve their benchmark scope as follows:

1. Call `useAgchainProjectFocus()` to get `focusedProject`.
2. Read `focusedProject.benchmark_slug` — this IS the benchmark slug for all API calls.
3. If no project is focused, show the "Choose an AGChain project" guard (same as all other project-scoped pages).

This means:
- `GET /agchain/benchmarks/{benchmark_slug}/scorers` uses the slug from `focusedProject.benchmark_slug`.
- The Scorers and Prompts pages show data for exactly one benchmark at a time.
- Switching the project switcher changes which benchmark's scorers/prompts are displayed.

This contract is identical to how `AgchainBenchmarksPage` (the benchmark definition workbench) already works — it reads `focusedProject.benchmark_slug` from the same hook and passes it to every API call.

If the platform ever introduces projects that own multiple benchmarks, this contract must be revisited. For V1, the 1:1 mapping is sufficient and already proven.

---

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks/{benchmark_slug}/scorers` | List scorer definitions for a benchmark | New |
| POST | `/agchain/benchmarks/{benchmark_slug}/scorers` | Create scorer definition | New |
| GET | `/agchain/benchmarks/{benchmark_slug}/scorers/{scorer_ref}` | Get scorer detail | New |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/scorers/{scorer_ref}` | Update scorer definition | New |
| GET | `/agchain/benchmarks/{benchmark_slug}/prompts` | List prompt templates for a benchmark | New |
| POST | `/agchain/benchmarks/{benchmark_slug}/prompts` | Create prompt template | New |
| GET | `/agchain/benchmarks/{benchmark_slug}/prompts/{prompt_ref}` | Get prompt template detail | New |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/prompts/{prompt_ref}` | Update prompt template | New |

#### New endpoint contracts

##### `GET /agchain/benchmarks/{benchmark_slug}/scorers`

- Auth: `require_user_auth`
- Request: query params `search` (optional free-text filter), `scoring_mode` (optional: `deterministic`, `judge`), `enabled` (optional: `true`/`false`)
- Response:

```json
{
  "items": [
    {
      "scorer_definition_id": "uuid",
      "benchmark_id": "uuid",
      "scorer_ref": "d1_known_authority",
      "display_name": "D1 Known Authority Scorer",
      "scoring_mode": "deterministic",
      "description": "Scores the known authority step...",
      "default_judge_prompt_ref": null,
      "parameter_schema": {},
      "output_schema": {"score": "float", "correct": "bool", "details": "object"},
      "source_module": "legal_10.scorers.d1_known_authority_scorer",
      "enabled": true,
      "created_at": "2026-03-31T12:00:00Z",
      "updated_at": "2026-03-31T12:00:00Z"
    }
  ],
  "total": 2,
  "benchmark_slug": "legal-10"
}
```

- Touches: `public.agchain_scorer_definitions`, `public.agchain_benchmarks`

##### `POST /agchain/benchmarks/{benchmark_slug}/scorers`

- Auth: `require_superuser`
- Request:

```json
{
  "scorer_ref": "d1_known_authority",
  "display_name": "D1 Known Authority Scorer",
  "scoring_mode": "deterministic",
  "description": "Scores the known authority step using exact match and F1",
  "default_judge_prompt_ref": null,
  "parameter_schema": {},
  "output_schema": {},
  "source_module": null,
  "enabled": true
}
```

- Response: the created scorer object (same shape as list item)
- Touches: `public.agchain_scorer_definitions`, `public.agchain_benchmarks`
- Validation: `scorer_ref` must be unique within benchmark; `scoring_mode` must be one of `deterministic`, `judge`; if `default_judge_prompt_ref` is provided and non-null, it must reference an existing prompt_ref in the same benchmark

##### `GET /agchain/benchmarks/{benchmark_slug}/scorers/{scorer_ref}`

- Auth: `require_user_auth`
- Request: no body
- Response: single scorer object
- Touches: `public.agchain_scorer_definitions`, `public.agchain_benchmarks`

##### `PATCH /agchain/benchmarks/{benchmark_slug}/scorers/{scorer_ref}`

- Auth: `require_superuser`
- Request: partial object (all fields optional except `scorer_definition_id`):

```json
{
  "display_name": "Updated Name",
  "scoring_mode": "judge",
  "default_judge_prompt_ref": "irac_judge_rubric_v1",
  "enabled": false
}
```

- Response: the updated scorer object
- Touches: `public.agchain_scorer_definitions`
- Validation: same as create for any provided field; if `scoring_mode` changes to `judge` and `default_judge_prompt_ref` is null, that is allowed (prompt can be set later or overridden on the step)

##### Archive-only: no DELETE endpoint for scorers

Scorers are never hard-deleted. To archive a scorer, use `PATCH` with `{"enabled": false}`. Archived scorers remain in the database and are resolvable by ref for historical benchmark versions and past runs. List endpoints filter to `enabled=true` by default; the detail endpoint (`GET /{scorer_ref}`) always returns the scorer regardless of enabled state. The step editor dropdowns only show enabled scorers, but the step inspector shows a "disabled" warning badge if a step references an archived scorer.

##### `GET /agchain/benchmarks/{benchmark_slug}/prompts`

- Auth: `require_user_auth`
- Request: query params `search` (optional), `prompt_kind` (optional: `step_prompt`, `judge_rubric`, `system_message`, `output_guard`), `enabled` (optional)
- Response:

```json
{
  "items": [
    {
      "prompt_template_id": "uuid",
      "benchmark_id": "uuid",
      "prompt_ref": "irac_judge_rubric_v1",
      "display_name": "IRAC Judge Rubric v1",
      "prompt_kind": "judge_rubric",
      "description": "Evaluates IRAC quality on 4 dimensions",
      "template_body": "You are evaluating a legal IRAC analysis...\n\n{question}\n\n{answer}\n\nGrade the response...",
      "placeholder_declarations": [
        {"name": "question", "type": "string", "description": "The legal question", "required": true},
        {"name": "answer", "type": "string", "description": "The model's IRAC response", "required": true}
      ],
      "output_contract": "GRADE: C|P|I",
      "version_tag": "v1.0",
      "enabled": true,
      "created_at": "2026-03-31T12:00:00Z",
      "updated_at": "2026-03-31T12:00:00Z"
    }
  ],
  "total": 3,
  "benchmark_slug": "legal-10"
}
```

- Touches: `public.agchain_prompt_templates`, `public.agchain_benchmarks`

##### `POST /agchain/benchmarks/{benchmark_slug}/prompts`

- Auth: `require_superuser`
- Request:

```json
{
  "prompt_ref": "irac_judge_rubric_v1",
  "display_name": "IRAC Judge Rubric v1",
  "prompt_kind": "judge_rubric",
  "description": "Evaluates IRAC quality on 4 dimensions",
  "template_body": "You are evaluating a legal IRAC analysis...\n\n{question}\n\n{answer}\n\nGrade the response on:\n1. Issue identification\n2. Rule statement\n3. Application\n4. Conclusion\n\n{instructions}",
  "placeholder_declarations": [
    {"name": "question", "type": "string", "description": "The legal question", "required": true},
    {"name": "answer", "type": "string", "description": "The model's IRAC response", "required": true},
    {"name": "instructions", "type": "string", "description": "Grading instructions", "required": false}
  ],
  "output_contract": "GRADE: C|P|I",
  "version_tag": "v1.0",
  "enabled": true
}
```

- Response: the created prompt object
- Touches: `public.agchain_prompt_templates`, `public.agchain_benchmarks`
- Validation: `prompt_ref` must be unique within benchmark; `prompt_kind` must be one of `step_prompt`, `judge_rubric`, `system_message`, `output_guard`; `template_body` must be non-empty

##### `GET /agchain/benchmarks/{benchmark_slug}/prompts/{prompt_ref}`

- Auth: `require_user_auth`
- Request: no body
- Response: single prompt object
- Touches: `public.agchain_prompt_templates`, `public.agchain_benchmarks`

##### `PATCH /agchain/benchmarks/{benchmark_slug}/prompts/{prompt_ref}`

- Auth: `require_superuser`
- Request: partial object (all fields optional)
- Response: the updated prompt object
- Touches: `public.agchain_prompt_templates`

##### Archive-only: no DELETE endpoint for prompts

Prompt templates are never hard-deleted. To archive a prompt, use `PATCH` with `{"enabled": false}`. Same archive-only contract as scorers: remains resolvable historically, filtered out of default lists and dropdowns, shown with "disabled" warning badge in step inspector.

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Counter | `platform.agchain.scorers.list.count` | `agchain_scorers.py:list_scorers` | Count scorer list requests |
| Counter | `platform.agchain.scorers.create.count` | `agchain_scorers.py:create_scorer` | Count scorer creation |
| Counter | `platform.agchain.scorers.get.count` | `agchain_scorers.py:get_scorer` | Count scorer detail reads |
| Counter | `platform.agchain.scorers.update.count` | `agchain_scorers.py:update_scorer` | Count scorer updates |
| Histogram | `platform.agchain.scorers.list.duration_ms` | `agchain_scorers.py:list_scorers` | Measure list latency |
| Histogram | `platform.agchain.scorers.write.duration_ms` | `agchain_scorers.py:create/update` | Measure write operation latency |
| Counter | `platform.agchain.prompts.list.count` | `agchain_prompts.py:list_prompts` | Count prompt list requests |
| Counter | `platform.agchain.prompts.create.count` | `agchain_prompts.py:create_prompt` | Count prompt creation |
| Counter | `platform.agchain.prompts.get.count` | `agchain_prompts.py:get_prompt` | Count prompt detail reads |
| Counter | `platform.agchain.prompts.update.count` | `agchain_prompts.py:update_prompt` | Count prompt updates |
| Histogram | `platform.agchain.prompts.list.duration_ms` | `agchain_prompts.py:list_prompts` | Measure list latency |
| Histogram | `platform.agchain.prompts.write.duration_ms` | `agchain_prompts.py:create/update` | Measure write operation latency |

Span names follow existing agchain convention:

| Span Name | Handler |
|-----------|---------|
| `agchain.scorers.list` | `list_scorers` |
| `agchain.scorers.create` | `create_scorer` |
| `agchain.scorers.get` | `get_scorer` |
| `agchain.scorers.update` | `update_scorer` |
| `agchain.prompts.list` | `list_prompts` |
| `agchain.prompts.create` | `create_prompt` |
| `agchain.prompts.get` | `get_prompt` |
| `agchain.prompts.update` | `update_prompt` |

Observability attribute rules:

- Allowed attributes: `benchmark_slug`, `scorer_ref`, `prompt_ref`, `scoring_mode`, `prompt_kind`, `enabled`, `total`, `http.status_code`
- Forbidden in trace or metric attributes: `user_id`, `email`, `template_body`, `parameter_schema` values, `output_schema` values

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260331120000_agchain_scorer_definitions.sql` | Creates `agchain_scorer_definitions` table with benchmark FK, unique constraint on `(benchmark_id, scorer_ref)`, check constraint on `scoring_mode` | No — new table, no existing data |
| `20260331130000_agchain_prompt_templates.sql` | Creates `agchain_prompt_templates` table with benchmark FK, unique constraint on `(benchmark_id, prompt_ref)`, check constraint on `prompt_kind` | No — new table, no existing data |

#### Table schema: `agchain_scorer_definitions`

```sql
CREATE TABLE public.agchain_scorer_definitions (
    scorer_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id UUID NOT NULL REFERENCES public.agchain_benchmarks(benchmark_id) ON DELETE CASCADE,
    scorer_ref TEXT NOT NULL,
    display_name TEXT NOT NULL,
    scoring_mode TEXT NOT NULL CHECK (scoring_mode IN ('deterministic', 'judge')),
    description TEXT,
    default_judge_prompt_ref TEXT,
    parameter_schema JSONB NOT NULL DEFAULT '{}',
    output_schema JSONB NOT NULL DEFAULT '{}',
    source_module TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (benchmark_id, scorer_ref)
);

CREATE INDEX idx_scorer_definitions_benchmark
    ON public.agchain_scorer_definitions (benchmark_id);
```

#### Table schema: `agchain_prompt_templates`

```sql
CREATE TABLE public.agchain_prompt_templates (
    prompt_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id UUID NOT NULL REFERENCES public.agchain_benchmarks(benchmark_id) ON DELETE CASCADE,
    prompt_ref TEXT NOT NULL,
    display_name TEXT NOT NULL,
    prompt_kind TEXT NOT NULL CHECK (prompt_kind IN ('step_prompt', 'judge_rubric', 'system_message', 'output_guard')),
    description TEXT,
    template_body TEXT NOT NULL,
    placeholder_declarations JSONB NOT NULL DEFAULT '[]',
    output_contract TEXT,
    version_tag TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (benchmark_id, prompt_ref)
);

CREATE INDEX idx_prompt_templates_benchmark
    ON public.agchain_prompt_templates (benchmark_id);
```

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0` (existing placeholder pages are replaced in-place)

**New components:** `6`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainScorersTable` | `web/src/components/agchain/scorers/AgchainScorersTable.tsx` | `AgchainScorersPage` |
| `AgchainScorerInspector` | `web/src/components/agchain/scorers/AgchainScorerInspector.tsx` | `AgchainScorersPage` |
| `AgchainScorerCreateSheet` | `web/src/components/agchain/scorers/AgchainScorerCreateSheet.tsx` | `AgchainScorersPage` |
| `AgchainPromptsTable` | `web/src/components/agchain/prompts/AgchainPromptsTable.tsx` | `AgchainPromptsPage` |
| `AgchainPromptInspector` | `web/src/components/agchain/prompts/AgchainPromptInspector.tsx` | `AgchainPromptsPage` |
| `AgchainPromptCreateSheet` | `web/src/components/agchain/prompts/AgchainPromptCreateSheet.tsx` | `AgchainPromptsPage` |

**New hooks:** `2`

| Hook | File | Purpose |
|------|------|---------|
| `useAgchainScorers` | `web/src/hooks/agchain/useAgchainScorers.ts` | Fetch scorer list for focused benchmark; exposes `scorers`, `loading`, `error`, `refetch` |
| `useAgchainPrompts` | `web/src/hooks/agchain/useAgchainPrompts.ts` | Fetch prompt list for focused benchmark; exposes `prompts`, `loading`, `error`, `refetch` |

**New libraries/services:** `2`

| Service | File | Purpose |
|---------|------|---------|
| `agchainScorers` | `web/src/lib/agchainScorers.ts` | API client functions: `listScorers`, `createScorer`, `getScorer`, `updateScorer` |
| `agchainPrompts` | `web/src/lib/agchainPrompts.ts` | API client functions: `listPrompts`, `createPrompt`, `getPrompt`, `updatePrompt` |

**Modified pages:** `2`

| Page | File | What changes |
|------|------|--------------|
| `AgchainScorersPage` | `web/src/pages/agchain/AgchainScorersPage.tsx` | Replace placeholder with real scorer registry surface: toolbar + table + inspector |
| `AgchainPromptsPage` | `web/src/pages/agchain/AgchainPromptsPage.tsx` | Replace placeholder with real prompt registry surface: toolbar + table + inspector |

**Modified components:** `1`

| Component | File | What changes |
|-----------|------|--------------|
| `AgchainBenchmarkStepInspector` | `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` | `scorer_ref` free-text input → select dropdown populated from scorer registry; `judge_prompt_ref` free-text input → select dropdown populated from prompt registry (filtered to `prompt_kind=judge_rubric`); conditional visibility: `scoring_mode=none` hides both, `scoring_mode=deterministic` shows scorer_ref only, `scoring_mode=judge` shows both; when scorer selected has `default_judge_prompt_ref`, auto-fill `judge_prompt_ref` |

**Modified tests:** `1`

| Test | File | What changes |
|------|------|--------------|
| `AgchainLevelOnePlaceholderPages` | `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx` | Remove `AgchainScorersPage` and `AgchainPromptsPage` test cases from placeholder test suite (they are no longer placeholders) |

**New test files:** `2`

| Test | File | Purpose |
|------|------|---------|
| `AgchainScorersPage.test` | `web/src/pages/agchain/AgchainScorersPage.test.tsx` | Test scorer page rendering, project focus guard, table population |
| `AgchainPromptsPage.test` | `web/src/pages/agchain/AgchainPromptsPage.test.tsx` | Test prompt page rendering, project focus guard, table population |

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Scorers and Prompts are benchmark-scoped, not global. Every scorer and prompt belongs to exactly one benchmark via `benchmark_id` FK.
2. The Scorers page lives at `/app/agchain/scorers` and the Prompts page lives at `/app/agchain/prompts` — the existing routes in `router.tsx`. Both require project focus.
3. The step editor (`AgchainBenchmarkStepInspector.tsx`) is the composition proof point. `scorer_ref` and `judge_prompt_ref` must become registry-resolved dropdowns, not remain free-text.
4. No changes to the `agchain_benchmark_steps` table schema. The `scorer_ref` and `judge_prompt_ref` columns remain `TEXT`. Validation is at the API layer, not FK-enforced.
5. Scorers and prompts are never hard-deleted. Archive via `PATCH` with `{"enabled": false}`. Archived items remain in the database and are resolvable historically. This preserves reproducibility for past benchmark versions and runs. A future plan may add full immutable versioning or run-time payload snapshotting; this plan establishes the archive-only foundation.
6. Template variable syntax uses Python `{variable}` format (matching Inspect AI's `format_template()` convention and Legal-10's existing templates), not Mustache `{{variable}}`.
7. `scoring_mode` enum values are: `deterministic`, `judge`. The citation integrity scorer (which produces structural audit output rather than a 0-1 score) is classified as `deterministic` — the distinction between score-producing and audit-producing is captured in `output_schema`, not in `scoring_mode`. This keeps the scorer registry aligned with the step editor's existing `none`/`deterministic`/`judge` dropdown.
8. `prompt_kind` enum values are: `step_prompt`, `judge_rubric`, `system_message`, `output_guard`. These match Legal-10's 6-window input assembly model.
9. Step create/update endpoints validate `scorer_ref` and `judge_prompt_ref` against the registries. When `scoring_mode` is `"deterministic"` or `"judge"` and `scorer_ref` is provided and non-null, it must exist in `agchain_scorer_definitions` for the same benchmark. When `scoring_mode` is `"judge"` and `judge_prompt_ref` is provided and non-null, it must exist in `agchain_prompt_templates` for the same benchmark. Invalid refs are rejected with 422.
10. The plan includes a seed task that populates the Legal-10 benchmark with its known scorers and prompt templates via the API, so the surfaces open with real data.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. The Legal-10 benchmark has been seeded with 2 scorers (`d1-known-authority` deterministic, `citation-integrity` deterministic) and 4 prompt templates (`d1-known-authority` step_prompt, `d2-irac-closed-book` step_prompt, `j3-irac-open-book` step_prompt, `irac-mee-pair-v1` judge_rubric).
2. On the Scorers page, both seeded scorers appear in the table with correct scoring mode badges. Selecting one shows its full detail in the inspector. The inspector shows a usage count of how many benchmark steps reference this scorer.
3. On the Prompts page, all four seeded prompts appear with correct kind badges. Selecting one shows the template body, placeholder declarations, and usage count.
4. A superuser creates a new judge scorer with `default_judge_prompt_ref` pointing to the `irac-mee-pair-v1` prompt. The Scorers page shows the linked judge prompt ref in the inspector.
5. In the benchmark step editor, creating a new step with `scoring_mode = "judge"` shows `scorer_ref` as a dropdown containing only judge scorers, and `judge_prompt_ref` as a dropdown containing only `judge_rubric` prompts.
6. Selecting the judge scorer in the step editor auto-fills `judge_prompt_ref` with the scorer's `default_judge_prompt_ref`.
7. In the benchmark step editor, switching `scoring_mode` to `"deterministic"` shows `scorer_ref` as a dropdown containing only deterministic scorers, and hides `judge_prompt_ref`.
8. In the benchmark step editor, switching `scoring_mode` to `"none"` hides both `scorer_ref` and `judge_prompt_ref` dropdowns.
9. Creating a step with `scoring_mode = "judge"` and an invalid `scorer_ref` via direct API call returns 422.
10. Archiving a scorer via `PATCH {"enabled": false}` removes it from the step editor dropdown but keeps it resolvable in the detail endpoint and displays a "disabled" warning badge on any step that references it.
11. All 8 OTel trace spans fire correctly on every endpoint call.

### Locked Platform API Surface

#### New platform API endpoints: `8`

1. `GET /agchain/benchmarks/{benchmark_slug}/scorers`
2. `POST /agchain/benchmarks/{benchmark_slug}/scorers`
3. `GET /agchain/benchmarks/{benchmark_slug}/scorers/{scorer_ref}`
4. `PATCH /agchain/benchmarks/{benchmark_slug}/scorers/{scorer_ref}`
5. `GET /agchain/benchmarks/{benchmark_slug}/prompts`
6. `POST /agchain/benchmarks/{benchmark_slug}/prompts`
7. `GET /agchain/benchmarks/{benchmark_slug}/prompts/{prompt_ref}`
8. `PATCH /agchain/benchmarks/{benchmark_slug}/prompts/{prompt_ref}`

#### Existing platform API endpoints modified: `2`

1. `POST /agchain/benchmarks/{benchmark_slug}/steps` — add server-side validation: when `scoring_mode` is `"deterministic"` or `"judge"` and `scorer_ref` is non-null, validate it exists in `agchain_scorer_definitions` for the same benchmark (422 if not found). When `scoring_mode` is `"judge"` and `judge_prompt_ref` is non-null, validate it exists in `agchain_prompt_templates` for the same benchmark (422 if not found).
2. `PATCH /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` — same validation as step create for any updated ref fields.

#### Existing platform API endpoints reused as-is: `8`

All existing benchmark and model endpoints remain unchanged.

### Locked Observability Surface

#### New traces: `8`

1. `agchain.scorers.list`
2. `agchain.scorers.create`
3. `agchain.scorers.get`
4. `agchain.scorers.update`
5. `agchain.prompts.list`
7. `agchain.prompts.create`
8. `agchain.prompts.get`
9. `agchain.prompts.update`
10. `agchain.prompts.delete`

#### New metrics: `8 counters`, `4 histograms`

Counters: `platform.agchain.scorers.{list,create,get,update}.count` (4) + `platform.agchain.prompts.{list,create,get,update}.count` (4)

Histograms: `platform.agchain.scorers.{list,write}.duration_ms` (2) + `platform.agchain.prompts.{list,write}.duration_ms` (2)

### Locked Inventory Counts

#### Database

- New migrations: `2`
- New tables: `2` (`agchain_scorer_definitions`, `agchain_prompt_templates`)
- Modified existing migrations: `0`

#### Backend

- New domain service files: `2` (`scorer_registry.py`, `prompt_registry.py`)
- New route files: `2` (`agchain_scorers.py`, `agchain_prompts.py`)
- New test files: `2` (`test_agchain_scorers.py`, `test_agchain_prompts.py`)
- Modified files: `2` (`main.py` — register 2 new routers; `benchmark_registry.py` — add scorer_ref/judge_prompt_ref validation to step create/update)

#### Frontend

- New top-level pages/routes: `0` (existing routes point to replaced pages)
- New visual components: `6`
- New hooks: `2`
- New lib/service files: `2`
- New test files: `2`
- Modified pages: `2` (Scorers + Prompts pages replaced)
- Modified components: `1` (step inspector)
- Modified test files: `1` (remove 2 tests from placeholder suite)

### Locked File Inventory

#### New files: `20`

**Migrations:**
- `supabase/migrations/20260331120000_agchain_scorer_definitions.sql`
- `supabase/migrations/20260331130000_agchain_prompt_templates.sql`

**Backend domain:**
- `services/platform-api/app/domain/agchain/scorer_registry.py`
- `services/platform-api/app/domain/agchain/prompt_registry.py`

**Backend routes:**
- `services/platform-api/app/api/routes/agchain_scorers.py`
- `services/platform-api/app/api/routes/agchain_prompts.py`

**Backend tests:**
- `services/platform-api/tests/test_agchain_scorers.py`
- `services/platform-api/tests/test_agchain_prompts.py`

**Frontend hooks:**
- `web/src/hooks/agchain/useAgchainScorers.ts`
- `web/src/hooks/agchain/useAgchainPrompts.ts`

**Frontend services:**
- `web/src/lib/agchainScorers.ts`
- `web/src/lib/agchainPrompts.ts`

**Frontend components:**
- `web/src/components/agchain/scorers/AgchainScorersTable.tsx`
- `web/src/components/agchain/scorers/AgchainScorerInspector.tsx`
- `web/src/components/agchain/scorers/AgchainScorerCreateSheet.tsx`
- `web/src/components/agchain/prompts/AgchainPromptsTable.tsx`
- `web/src/components/agchain/prompts/AgchainPromptInspector.tsx`
- `web/src/components/agchain/prompts/AgchainPromptCreateSheet.tsx`

**Frontend tests:**
- `web/src/pages/agchain/AgchainScorersPage.test.tsx`
- `web/src/pages/agchain/AgchainPromptsPage.test.tsx`

#### Modified files: `6`

- `services/platform-api/app/main.py` — register `agchain_scorers_router` and `agchain_prompts_router`
- `services/platform-api/app/domain/agchain/benchmark_registry.py` — add scorer_ref and judge_prompt_ref validation to `create_benchmark_step` and `update_benchmark_step`
- `web/src/pages/agchain/AgchainScorersPage.tsx` — replace placeholder with real surface
- `web/src/pages/agchain/AgchainPromptsPage.tsx` — replace placeholder with real surface
- `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` — upgrade scorer_ref and judge_prompt_ref to registry dropdowns
- `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx` — remove Scorers and Prompts test cases

---

## Explicit Risks Accepted In This Plan

1. No FK enforcement between `agchain_benchmark_steps.scorer_ref` and `agchain_scorer_definitions.scorer_ref`. The step columns remain `TEXT`. Validation is at the API layer (422 rejection for invalid refs), not DB-enforced. This keeps the step schema stable and avoids complex cross-table FK with composite keys.
2. No auto-versioning for prompt templates. `version_tag` is a free-text field for human use, not an auto-incrementing version. Full Braintrust-style versioning is deferred to a future plan. Reproducibility in V1 is protected by archive-only (no hard delete) — scorers and prompts remain resolvable historically.
3. The scorer `source_module` field stores a Python module path but is not validated or executed by the platform API. It is metadata for the runtime executor (which lives outside platform-api). Platform-api never imports or runs scorer Python code.
4. Template variable syntax is validated at the frontend only. The backend stores `template_body` as-is. The frontend create/edit forms extract `{variable}` patterns from the body and compare to `placeholder_declarations`, showing a warning (not blocking) on mismatch.
5. The step editor's registry dropdowns depend on the focused benchmark having scorers/prompts registered. If a benchmark has no scorers, the dropdown is empty and the API rejects step creation with a non-null scorer_ref that doesn't exist. This is correct behavior — it surfaces that the benchmark needs scorers to be authored before steps can reference them.
6. Run-time payload snapshotting (freezing the resolved scorer/prompt config into a run record) is out of scope for this plan. This is safe because no run endpoints exist yet. When runs are built in a future plan, they must snapshot the resolved scorer and prompt payloads at launch time.

---

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface (8 new endpoints + 2 modified step endpoints) exists exactly as specified and responds correctly to authenticated requests.
2. The locked OTel instruments (8 counters, 4 histograms, 8 spans) emit on every endpoint call.
3. The two new tables exist with correct schemas, constraints, and indexes.
4. The Scorers and Prompts pages render real registry data for the focused benchmark, not placeholder text.
5. The benchmark step editor shows registry-resolved dropdowns for `scorer_ref` and `judge_prompt_ref` gated by `scoring_mode`.
6. Auto-fill works: selecting a judge scorer with `default_judge_prompt_ref` pre-fills the step's `judge_prompt_ref`.
7. Step create/update rejects invalid `scorer_ref` and `judge_prompt_ref` with 422 when `scoring_mode` requires them.
8. Scorers and prompts cannot be hard-deleted — only archived via `PATCH {"enabled": false}`. Archived items remain resolvable.
9. The Legal-10 benchmark is seeded with 2 scorers and 4 prompt templates. The pages open with real data.
10. The Scorers and Prompts inspectors show usage counts (number of steps referencing each scorer/prompt).
11. The prompt create/edit form shows a validation warning when `{variable}` patterns in `template_body` don't match `placeholder_declarations`.
12. All backend tests pass (`pytest services/platform-api/tests/test_agchain_scorers.py services/platform-api/tests/test_agchain_prompts.py`).
13. All frontend tests pass (`npx vitest run src/pages/agchain/AgchainScorersPage.test.tsx src/pages/agchain/AgchainPromptsPage.test.tsx`).
14. The placeholder test file no longer asserts placeholder behavior for Scorers or Prompts.
15. The inventory counts in this plan match the actual set of created and modified files.

---

## Tasks

### Task 1: Create database migrations

**File(s):** `supabase/migrations/20260331120000_agchain_scorer_definitions.sql`, `supabase/migrations/20260331130000_agchain_prompt_templates.sql`

**Step 1:** Create `20260331120000_agchain_scorer_definitions.sql` with the `agchain_scorer_definitions` table schema from the manifest above (table, unique constraint, index).
**Step 2:** Create `20260331130000_agchain_prompt_templates.sql` with the `agchain_prompt_templates` table schema from the manifest above (table, unique constraint, index).
**Step 3:** Verify both files parse as valid SQL by reading them back.

**Commit:** `feat: add scorer_definitions and prompt_templates tables for agchain registries`

---

### Task 2: Scorer registry domain service — tests first

**File(s):** `services/platform-api/tests/test_agchain_scorers.py`

**Step 1:** Write test file with tests covering:
- `test_list_scorers_empty` — list returns empty items for benchmark with no scorers
- `test_create_scorer_deterministic` — create deterministic scorer, verify all fields returned
- `test_create_scorer_judge_with_prompt_ref` — create judge scorer with default_judge_prompt_ref
- `test_create_scorer_duplicate_ref_rejected` — 409 on duplicate scorer_ref within same benchmark
- `test_create_scorer_invalid_scoring_mode_rejected` — 422 on invalid scoring_mode
- `test_get_scorer_detail` — create then get, verify match
- `test_get_scorer_not_found` — 404 for nonexistent scorer_ref
- `test_update_scorer` — partial update of display_name and enabled
- `test_archive_scorer` — PATCH enabled=false, verify filtered from default list but still resolvable via detail endpoint
- `test_list_scorers_with_filters` — filter by scoring_mode and enabled
- `test_scorer_usage_count` — create scorer, create step referencing it, verify usage count in scorer detail
**Step 2:** Run tests to confirm they fail (no implementation yet).

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_scorers.py -v`
**Expected output:** All tests fail (import errors or assertion errors)

---

### Task 3: Scorer registry domain service — implementation

**File(s):** `services/platform-api/app/domain/agchain/scorer_registry.py`

**Step 1:** Create `scorer_registry.py` with functions:
- `list_scorers(user_id, benchmark_slug, filters)` — look up benchmark by owner+slug, query `agchain_scorer_definitions` with optional filters
- `create_scorer(user_id, benchmark_slug, payload)` — validate benchmark ownership, validate scorer_ref uniqueness, validate scoring_mode enum, validate default_judge_prompt_ref exists if provided, insert row
- `get_scorer(user_id, benchmark_slug, scorer_ref)` — look up benchmark then scorer
- `update_scorer(user_id, benchmark_slug, scorer_ref, payload)` — partial update with validation; setting `enabled=false` is the archive operation
- `get_scorer_usage_count(user_id, benchmark_slug, scorer_ref)` — count steps in the benchmark that reference this scorer_ref
- Internal helpers: `_get_benchmark_for_owner`, `_normalize_scorer_row`
- No delete function — archive only via update with `enabled=false`
**Step 2:** Follow the exact patterns from `benchmark_registry.py`: supabase client from `get_supabase()`, error handling with HTTPException, UTC timestamp strings.
**Step 3:** Run tests.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_scorers.py -v`
**Expected output:** All tests pass

**Commit:** `feat: scorer registry domain service with tests`

---

### Task 4: Scorer route file — tests first, then implementation

**File(s):** `services/platform-api/app/api/routes/agchain_scorers.py`, `services/platform-api/tests/test_agchain_scorers.py` (extend)

**Step 1:** Add route-level tests to the existing test file (or verify the existing tests already exercise the routes if using FastAPI test client).
**Step 2:** Create `agchain_scorers.py` route file:
- `router = APIRouter(prefix="/agchain/benchmarks/{benchmark_slug}/scorers", tags=["agchain-scorers"])`
- Pydantic request models: `ScorerCreateRequest`, `ScorerUpdateRequest`
- 4 route handlers matching the manifest endpoints (list, create, get, update — no delete)
- OTel instrumentation: tracer, meter, 4 counters, 2 histograms, spans on each handler
- Auth: GET endpoints use `require_user_auth`, mutating endpoints use `require_superuser`
**Step 3:** Run tests.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_scorers.py -v`
**Expected output:** All tests pass

**Commit:** `feat: scorer registry API routes with OTel instrumentation`

---

### Task 5: Prompt registry domain service — tests first

**File(s):** `services/platform-api/tests/test_agchain_prompts.py`

**Step 1:** Write test file with tests covering:
- `test_list_prompts_empty` — empty list for benchmark with no prompts
- `test_create_prompt_judge_rubric` — create judge_rubric prompt, verify all fields
- `test_create_prompt_step_prompt` — create step_prompt, verify prompt_kind
- `test_create_prompt_duplicate_ref_rejected` — 409 on duplicate prompt_ref
- `test_create_prompt_invalid_kind_rejected` — 422 on invalid prompt_kind
- `test_create_prompt_empty_body_rejected` — 422 on empty template_body
- `test_get_prompt_detail` — create then get, verify template_body and placeholder_declarations
- `test_get_prompt_not_found` — 404
- `test_update_prompt` — partial update of template_body and version_tag
- `test_archive_prompt` — PATCH enabled=false, verify filtered from default list but still resolvable via detail endpoint
- `test_list_prompts_with_kind_filter` — filter by prompt_kind
- `test_prompt_usage_count` — create prompt, create scorer referencing it, verify usage count in prompt detail
**Step 2:** Run tests to confirm they fail.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_prompts.py -v`
**Expected output:** All tests fail

---

### Task 6: Prompt registry domain service + routes — implementation

**File(s):** `services/platform-api/app/domain/agchain/prompt_registry.py`, `services/platform-api/app/api/routes/agchain_prompts.py`

**Step 1:** Create `prompt_registry.py` following the same pattern as `scorer_registry.py`:
- `list_prompts`, `create_prompt`, `get_prompt`, `update_prompt` (no delete — archive via update with enabled=false)
- `get_prompt_usage_count` — count scorers and steps that reference this prompt_ref
- Validate prompt_kind enum, prompt_ref uniqueness, non-empty template_body
**Step 2:** Create `agchain_prompts.py` route file:
- `router = APIRouter(prefix="/agchain/benchmarks/{benchmark_slug}/prompts", tags=["agchain-prompts"])`
- Pydantic models: `PromptCreateRequest`, `PromptUpdateRequest`
- 4 route handlers (list, create, get, update — no delete), OTel instrumentation matching the manifest
**Step 3:** Run tests.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_prompts.py -v`
**Expected output:** All tests pass

**Commit:** `feat: prompt template registry domain service and API routes with OTel`

---

### Task 7: Register routers in main.py

**File(s):** `services/platform-api/app/main.py`

**Step 1:** Add after the existing agchain benchmarks router registration (line 187):

```python
# 5l. AG chain scorer registry (benchmark-scoped, before plugin catch-all)
from app.api.routes.agchain_scorers import router as agchain_scorers_router
app.include_router(agchain_scorers_router)

# 5m. AG chain prompt template registry (benchmark-scoped, before plugin catch-all)
from app.api.routes.agchain_prompts import router as agchain_prompts_router
app.include_router(agchain_prompts_router)
```

**Step 2:** Add server-side validation to `benchmark_registry.py`:
- In `create_benchmark_step`: after existing validation, if `scoring_mode` is `"deterministic"` or `"judge"` and `scorer_ref` is non-null, query `agchain_scorer_definitions` for a row matching `(benchmark_id, scorer_ref)`. If not found, raise HTTPException 422 with message `"scorer_ref '{ref}' not found in benchmark '{slug}'"`.
- Same check: if `scoring_mode` is `"judge"` and `judge_prompt_ref` is non-null, query `agchain_prompt_templates` for a row matching `(benchmark_id, prompt_ref)`. If not found, raise HTTPException 422.
- In `update_benchmark_step`: same validation for any updated ref fields.
- Add tests: `test_step_create_rejects_invalid_scorer_ref`, `test_step_create_rejects_invalid_judge_prompt_ref`, `test_step_create_allows_null_scorer_ref`, `test_step_update_validates_scorer_ref`.

**Step 3:** Run full backend test suite to verify no regressions.

**Test command:** `cd services/platform-api && python -m pytest tests/ -v --timeout=30`
**Expected output:** All tests pass including new scorer, prompt, and step validation tests

**Commit:** `feat: register scorer/prompt routers and add step ref validation`

---

### Task 8: Frontend API client and hooks — Scorers

**File(s):** `web/src/lib/agchainScorers.ts`, `web/src/hooks/agchain/useAgchainScorers.ts`

**Step 1:** Create `agchainScorers.ts` with typed API client functions following the pattern in `web/src/lib/agchainModels.ts`:
- `listScorers(benchmarkSlug)` — GET
- `createScorer(benchmarkSlug, payload)` — POST
- `getScorer(benchmarkSlug, scorerRef)` — GET
- `updateScorer(benchmarkSlug, scorerRef, payload)` — PATCH (archive via `{enabled: false}`)
- TypeScript types: `ScorerDefinition`, `ScorerCreatePayload`, `ScorerUpdatePayload`, `ScorerListResponse`
**Step 2:** Create `useAgchainScorers.ts` hook following the pattern in `web/src/hooks/agchain/useAgchainModels.ts`:
- Accepts `benchmarkSlug: string | null`
- Returns `{ scorers, loading, error, refetch }`
- Fetches on mount and when benchmarkSlug changes
- Returns empty array when benchmarkSlug is null

**Commit:** `feat: scorer API client and useAgchainScorers hook`

---

### Task 9: Frontend API client and hooks — Prompts

**File(s):** `web/src/lib/agchainPrompts.ts`, `web/src/hooks/agchain/useAgchainPrompts.ts`

**Step 1:** Create `agchainPrompts.ts` with typed API client functions:
- `listPrompts(benchmarkSlug, kind?)` — GET with optional `prompt_kind` filter
- `createPrompt(benchmarkSlug, payload)` — POST
- `getPrompt(benchmarkSlug, promptRef)` — GET
- `updatePrompt(benchmarkSlug, promptRef, payload)` — PATCH (archive via `{enabled: false}`)
- TypeScript types: `PromptTemplate`, `PromptCreatePayload`, `PromptUpdatePayload`, `PromptListResponse`
**Step 2:** Create `useAgchainPrompts.ts` hook:
- Accepts `benchmarkSlug: string | null`, optional `kind: string`
- Returns `{ prompts, loading, error, refetch }`

**Commit:** `feat: prompt API client and useAgchainPrompts hook`

---

### Task 10: Frontend Scorers surface — components and page

**File(s):** `web/src/components/agchain/scorers/AgchainScorersTable.tsx`, `web/src/components/agchain/scorers/AgchainScorerInspector.tsx`, `web/src/components/agchain/scorers/AgchainScorerCreateSheet.tsx`, `web/src/pages/agchain/AgchainScorersPage.tsx`, `web/src/pages/agchain/AgchainScorersPage.test.tsx`

**Step 1:** Write `AgchainScorersPage.test.tsx`:
- Test that page renders "Scorers" heading when project is focused
- Test that project focus guard shows "Choose an AGChain project" when not focused
- Test that table renders with mock scorer data

**Step 2:** Create `AgchainScorersTable.tsx`:
- Columns: Scorer Ref, Display Name, Scoring Mode (badge), Judge Prompt Ref, Enabled (badge)
- Row selection triggers inspector
- Follow `AgchainModelsTable` patterns

**Step 3:** Create `AgchainScorerInspector.tsx`:
- Detail panel showing all scorer fields
- Usage count: "Referenced by N steps" (fetched or derived from step list)
- "Edit Scorer" button opens edit sheet
- "Archive" button (sets `enabled: false`) with confirmation showing usage count. No delete button.
- If scorer is disabled: show "Archived" badge prominently

**Step 4:** Create `AgchainScorerCreateSheet.tsx`:
- Slide-out sheet (following Models page pattern)
- Form fields: scorer_ref (input), display_name (input), scoring_mode (select: deterministic/judge), description (textarea), default_judge_prompt_ref (select populated from prompts hook, filtered to judge_rubric, visible only when scoring_mode=judge), parameter_schema (JSON textarea), output_schema (JSON textarea), source_module (input), enabled (checkbox)

**Step 5:** Replace `AgchainScorersPage.tsx` placeholder content with:
- Project focus guard (useAgchainProjectFocus)
- Toolbar with search input + "Add Scorer" button
- Left: `AgchainScorersTable`
- Right: `AgchainScorerInspector` (when a scorer is selected)

**Step 6:** Run tests.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainScorersPage.test.tsx`
**Expected output:** All tests pass

**Commit:** `feat: scorer registry frontend surface replacing placeholder`

---

### Task 11: Frontend Prompts surface — components and page

**File(s):** `web/src/components/agchain/prompts/AgchainPromptsTable.tsx`, `web/src/components/agchain/prompts/AgchainPromptInspector.tsx`, `web/src/components/agchain/prompts/AgchainPromptCreateSheet.tsx`, `web/src/pages/agchain/AgchainPromptsPage.tsx`, `web/src/pages/agchain/AgchainPromptsPage.test.tsx`

**Step 1:** Write `AgchainPromptsPage.test.tsx`:
- Test page rendering with project focus
- Test project focus guard
- Test table rendering with mock prompt data

**Step 2:** Create `AgchainPromptsTable.tsx`:
- Columns: Prompt Ref, Display Name, Kind (badge), Version Tag, Enabled (badge)

**Step 3:** Create `AgchainPromptInspector.tsx`:
- Detail panel showing all fields including template_body in a monospace preview area
- Placeholder declarations rendered as a tag list or mini-table
- Usage count: "Referenced by N scorers, M steps"
- "Archive" button (sets `enabled: false`) with confirmation showing usage count. No delete button.
- If prompt is disabled: show "Archived" badge prominently

**Step 4:** Create `AgchainPromptCreateSheet.tsx`:
- Form fields: prompt_ref (input), display_name (input), prompt_kind (select: step_prompt/judge_rubric/system_message/output_guard), description (textarea), template_body (large monospace textarea), placeholder_declarations (JSON textarea), output_contract (input), version_tag (input), enabled (checkbox)
- Placeholder-vs-template validation: extract `{variable}` patterns from template_body, compare to declared placeholder names. Show inline warning (not blocking) if variables in body are not in declarations or vice versa.

**Step 5:** Replace `AgchainPromptsPage.tsx` placeholder content with real surface.

**Step 6:** Run tests.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainPromptsPage.test.tsx`
**Expected output:** All tests pass

**Commit:** `feat: prompt template registry frontend surface replacing placeholder`

---

### Task 12: Upgrade step editor with registry-resolved dropdowns

**File(s):** `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`

**Step 1:** Import `useAgchainScorers` and `useAgchainPrompts` hooks.

**Step 2:** Replace `scorer_ref` free-text `<input>` with a `<select>` dropdown:
- Options populated from `useAgchainScorers(benchmarkSlug)`
- When `scoring_mode === "none"`, hide the scorer_ref field entirely
- When `scoring_mode === "deterministic"`, show dropdown filtered to scorers where `scoring_mode === "deterministic"`
- When `scoring_mode === "judge"`, show dropdown filtered to scorers where `scoring_mode === "judge"`
- Include an empty "— Select scorer —" option
- Include a fallback: if the current step's scorer_ref does not match any registered scorer, show it as a text value with a warning badge "(unregistered)"

**Step 3:** Replace `judge_prompt_ref` free-text `<input>` with a `<select>` dropdown:
- Options populated from `useAgchainPrompts(benchmarkSlug, "judge_rubric")`
- Only visible when `scoring_mode === "judge"`
- Include an empty "— Select judge prompt —" option
- Same unregistered fallback as scorer_ref

**Step 4:** Add auto-fill behavior: when `scorer_ref` changes and the newly selected scorer has a non-null `default_judge_prompt_ref`, set `judge_prompt_ref` to that value. Only auto-fill when the current `judge_prompt_ref` is empty or matches the previously selected scorer's default — do not overwrite a manually selected prompt.

**Step 5:** Run existing step inspector tests plus manual verification.

**Test command:** `cd web && npx vitest run src/components/agchain`
**Expected output:** All existing tests pass

**Commit:** `feat: upgrade step editor scorer_ref and judge_prompt_ref to registry dropdowns`

---

### Task 13: Update placeholder test file

**File(s):** `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`

**Step 1:** Read the current test file.
**Step 2:** Remove the `AgchainScorersPage` and `AgchainPromptsPage` test cases. These pages are no longer placeholders.
**Step 3:** Verify the remaining placeholder tests still pass (Datasets, Parameters, Tools should still be placeholders).

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`
**Expected output:** Remaining placeholder tests pass; no Scorers or Prompts tests in the file

**Commit:** `chore: remove scorers and prompts from placeholder test suite`

---

### Task 14: Seed Legal-10 benchmark with known scorers and prompts

**Step 1:** Create a backend test or script that seeds the Legal-10 benchmark with its proven scorers and prompt templates via the API endpoints. The seed data:

**Scorers (2):**
- `scorer_ref: "d1-known-authority"`, `display_name: "Known Authority (SCOTUS)"`, `scoring_mode: "deterministic"`, `source_module: "legal_10.scorers.d1_known_authority_scorer"`, with parameter_schema and output_schema from the investigated Legal-10 scorer
- `scorer_ref: "citation-integrity"`, `display_name: "Citation Integrity Audit"`, `scoring_mode: "deterministic"`, `source_module: "legal_10.scorers.citation_integrity"`, with the audit output schema

**Prompts (4):**
- `prompt_ref: "d1-known-authority"`, `kind: "step_prompt"`, `template_body`: Known Authority prompt from `model_steps/d1.json`
- `prompt_ref: "d2-irac-closed-book"`, `kind: "step_prompt"`, `template_body`: Closed-book IRAC prompt from `model_steps/d2.json`
- `prompt_ref: "j3-irac-open-book"`, `kind: "step_prompt"`, `template_body`: Open-book IRAC prompt from `model_steps/j3.json`
- `prompt_ref: "irac-mee-pair-v1"`, `kind: "judge_rubric"`, `template_body`: MEE pair grading rubric from `judge_prompts/irac_mee_pair_v1.json`

**Step 2:** Run the seed and verify: Scorers page shows 2 entries, Prompts page shows 4 entries.

**Commit:** `feat: seed Legal-10 benchmark with known scorers and prompt templates`

---

### Task 15: Integration verification

**Step 1:** Run full backend test suite:
```bash
cd services/platform-api && python -m pytest tests/ -v --timeout=30
```
**Expected output:** All tests pass including new scorer and prompt tests.

**Step 2:** Run full frontend test suite:
```bash
cd web && npx vitest run
```
**Expected output:** All tests pass. No placeholder assertions for Scorers or Prompts.

**Step 3:** Verify file inventory matches locked counts:
- New files: 20
- Modified files: 6
- New backend endpoints: 8
- Modified backend endpoints: 2 (step create/update with ref validation)
- New OTel instruments: 12 (8 counters + 4 histograms)
- New DB tables: 2

**Step 4:** Verify acceptance contract items 1–10 from the locked acceptance contract above.

**Commit:** `chore: verify scorers and prompts registry integration`

---

## Revision History

**v1.0 (2026-03-31):** Initial draft.

**v1.1 (2026-03-31):** Revised based on evaluation findings. 7 findings verified and addressed:
1. Added explicit Benchmark Focus Contract section (Finding 1 — partially accurate)
2. Replaced DELETE endpoints with archive-only via `enabled=false` for reproducibility (Findings 2+3 — verified accurate, critical)
3. Added server-side validation of `scorer_ref` and `judge_prompt_ref` on step create/update (Finding 4 — verified accurate)
4. Added Task 14: seed Legal-10 benchmark with known scorers and prompts (Finding 5 — verified accurate)
5. Dropped `integrity_audit` scoring_mode, kept only `deterministic`/`judge` (Finding 6 — verified accurate)
6. Added frontend placeholder-vs-template validation warning (Finding 7 — verified accurate)
7. Added usage counts to scorer and prompt inspectors
