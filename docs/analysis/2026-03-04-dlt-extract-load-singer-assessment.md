# DLT Repository Assessment (Extraction, Loading, Singer Readiness)

## Plan metadata
- Source path reviewed: `F:\dlt`
- Date reviewed: `2026-03-04` (America/Phoenix)
- Reviewer: `Codex (GPT-5)`
- Scope: standard extraction/loading scripts and procedure patterns, plus Singer adapter/wrapper/integration readiness

## Verdict
`Conditional Pass`

Use DLT as the pipeline base now, but do not assume first-class Singer support in current upstream code. Treat Singer as a custom integration track.

## Standard scripts and procedures found

### Canonical script families
- `dlt init` template system points to:
  - single-file templates in `_single_file_templates`
  - core-source templates in `_core_source_templates`
  - default template fallback `default_pipeline.py`
  - Evidence: `F:\dlt\dlt\_workspace\cli\_pipeline_files.py` lines `25-26`, `41`, `257`, `324`

### Standard pipeline scripts (template inventory)
- Core-source templates:
  - `F:\dlt\dlt\_workspace\_templates\_core_source_templates\filesystem_pipeline.py`
  - `F:\dlt\dlt\_workspace\_templates\_core_source_templates\rest_api_pipeline.py`
  - `F:\dlt\dlt\_workspace\_templates\_core_source_templates\sql_database_pipeline.py`
- Single-file templates:
  - `arrow_pipeline.py`, `dataframe_pipeline.py`, `debug_pipeline.py`, `default_pipeline.py`, `fruitshop_pipeline.py`, `github_api_pipeline.py`, `requests_pipeline.py`, `vibe_rest_api_pipeline.py`
  - Path root: `F:\dlt\dlt\_workspace\_templates\_single_file_templates\`

### Standard extraction/loading procedure patterns
- Pattern A (most common): one-call execution with `pipeline.run(...)`
  - Seen across templates and docs examples:
    - `F:\dlt\dlt\_workspace\_templates\_single_file_templates\default_pipeline.py` lines `18`, `29`
    - `F:\dlt\dlt\_workspace\_templates\_core_source_templates\rest_api_pipeline.py` lines `98`, `104`
    - `F:\dlt\dlt\_workspace\_templates\_core_source_templates\sql_database_pipeline.py` lines `39`, `44`, `52`
- Pattern B (advanced/control): explicit `extract -> normalize -> load`
  - Example:
    - `F:\dlt\docs\examples\postgres_to_postgres\postgres_to_postgres.py` lines `191`, `197/201`, `209`
    - plus `sql_database_pipeline.py` explicit extract at line `108`

### Core engine implementation (how it actually runs)
- Public pipeline methods:
  - `extract`: `F:\dlt\dlt\pipeline\pipeline.py:428`
  - `normalize`: `F:\dlt\dlt\pipeline\pipeline.py:527`
  - `load`: `F:\dlt\dlt\pipeline\pipeline.py:581`
  - `run` (orchestrates all): `F:\dlt\dlt\pipeline\pipeline.py:639`
- Internal step engines:
  - Extract step: `F:\dlt\dlt\extract\extract.py:452`
  - Normalize step runner: `F:\dlt\dlt\normalize\normalize.py:305`
  - Load step runner: `F:\dlt\dlt\load\load.py:667`

## Singer considerations (adapter/wrapper/integration)

### What exists
- Singer appears only in archived examples:
  - `F:\dlt\docs\examples\archive\sources\singer_tap.py`
  - `F:\dlt\docs\examples\archive\singer_tap_example.py`
  - `F:\dlt\docs\examples\archive\singer_tap_jsonl_example.py`
  - Archive note: `F:\dlt\docs\examples\archive\README.md` lines around `16-22`
- Archived wrapper does show useful ideas:
  - message parsing into table records
  - state handoff (`state["singer"] = last_state`)
  - `tap(...)` wrapper using process pipe and virtualenv

### What does not exist (current first-class support signals)
- No Singer hits in active website docs (`F:\dlt\docs\website\docs`) from repository search.
- No Singer-related extras/dependencies in `F:\dlt\pyproject.toml` from repository search.
- No Singer adapter in `F:\dlt\dlt\destinations\adapters.py` (destination adapters only).

## Findings by severity

### Critical
1. Singer integration is not production-first in this repo state.
   - Evidence is archived-only examples, not active docs/features/dependencies.
2. Archived Singer path is operationally fragile for production as-is.
   - Ad-hoc venv installation and historical import comments indicate maintenance risk.

### Major
1. Two valid execution models (`run` vs split phases) require an explicit orchestration decision before buildout.
2. Adapter semantics differ from likely expectation:
   - repository adapters are primarily destination/table-hint adapters, not a maintained Singer source adapter framework.
3. No explicit modern contract for Singer error handling/retries/recovery in active docs.

### Minor
1. Repo ownership mismatch prevented local `git` introspection (`safe.directory` needed), which can slow CI/tooling scripts if not handled.
2. Archived Singer examples use older pathing conventions and should not be copied verbatim.

## Required changes before implementation
1. Decide orchestration mode for Kestra:
   - default `pipeline.run(...)` task, or explicit 3-task chain (`extract`, `normalize`, `load`) for checkpointing.
2. Define a Singer integration contract:
   - tap invocation strategy, catalog/config format, state persistence model, retry behavior, error taxonomy.
3. Implement a dedicated Singer bridge module in your own codebase (not from archive copy/paste):
   - parse Singer messages
   - route records to resources/tables
   - persist and resume Singer state via pipeline/source state
4. Add tests before rollout:
   - unit tests for Singer message handling (RECORD/STATE/SCHEMA)
   - integration test with at least one tap and state-resume scenario
5. Add operational controls:
   - structured logs, trace capture, dead-letter strategy, and idempotency checks.
6. Define destination/table policy defaults:
   - `write_disposition`, keys, incremental cursor policy, schema contract behavior.

## Verification expectations and acceptance criteria
- A baseline non-Singer DLT pipeline template runs end-to-end in your target environment.
- Singer bridge can run a tap twice with second run resuming state correctly.
- Failed run recovery is deterministic (no duplicate explosion beyond accepted policy).
- Load trace artifacts are captured and queryable for run diagnostics.
- At least one destination-specific adapter/hints scenario is validated for your target warehouse.

## Final go/no-go recommendation
- `No-Go` for directly adopting Singer from archived examples.
- `Go` for building on DLT core extraction/loading patterns immediately, with Singer implemented as a controlled custom bridge and validated behind the acceptance criteria above.

