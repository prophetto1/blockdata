# Java-to-Python Translation Acceleration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce BD2's remaining Java-to-Python translation work by attacking generator defects first, repeated family patterns second, and runtime-kernel blockers last.

**Architecture:** This plan treats the remaining work as a leverage problem, not a file-count problem. Phase 1 improves the Java-to-Python scaffold pipeline so regenerated files stop carrying Java syntax into Python. Phase 2 ports repeated families as recipes. Phase 3 hand-ports the runtime kernel that all families depend on.

**Tech Stack:** Python 3.11, `pytest`, `javalang`, `ripgrep`, `dataclasses`, existing `integrations/javalang/pipeline/*`, existing `engine/*` and `integrations/*`

## Current Baseline

- `engine/`: 1,459 Python files
- `integrations/`: 2,068 Python files
- Current repo-wide `raise NotImplementedError` count: `6,837`
- Files with `# WARNING: Unresolved types:`: `1,673`
- Files with raw Java boolean/null literals: `259`
- Files with `Property.ofValue(true|false)`: `220`
- Files with Java-style static-call leakage: `664`

Representative files for dry runs and early verification:

- `integrations/javalang/pipeline/scaffold_builder.py`
- `integrations/javalang/pipeline/python_emitter.py`
- `integrations/git/abstract_sync_task.py`
- `integrations/git/sync_flows.py`
- `engine/jdbc/repository/abstract_jdbc_flow_repository.py`
- `engine/repository/postgres/postgres_flow_repository.py`
- `engine/core/models/property/property.py`
- `engine/core/runners/run_context.py`

### Task 1: Freeze Translation Baseline Metrics

**Files:**
- Create: `scripts/translation/report_translation_metrics.py`
- Create: `tests/scripts/translation/test_report_translation_metrics.py`
- Create: `docs/plans/tmp/translation-baseline-2026-03-19.json`

**Step 1: Write the failing test**

Create `tests/scripts/translation/test_report_translation_metrics.py` with tests that assert the metrics script:
- counts Python files under `engine/` and `integrations/`
- counts `raise NotImplementedError`
- counts unresolved warning lines
- counts raw `true|false|null`
- emits stable JSON keys

**Step 2: Run test to verify it fails**

Run: `pytest tests/scripts/translation/test_report_translation_metrics.py -v`
Expected: FAIL because the metrics script does not exist yet.

**Step 3: Write minimal implementation**

Create `scripts/translation/report_translation_metrics.py` to scan the repo, compute the baseline metrics, and write JSON to `docs/plans/tmp/translation-baseline-2026-03-19.json`.

**Step 4: Run test to verify it passes**

Run: `pytest tests/scripts/translation/test_report_translation_metrics.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/translation/report_translation_metrics.py tests/scripts/translation/test_report_translation_metrics.py docs/plans/tmp/translation-baseline-2026-03-19.json
git commit -m "test: add translation baseline metrics"
```

### Task 2: Create a Golden Scaffold Corpus

**Files:**
- Create: `tests/fixtures/translation/generator/git_abstract_sync_task.java`
- Create: `tests/fixtures/translation/generator/git_sync_flows.java`
- Create: `tests/fixtures/translation/generator/jdbc_abstract_flow_repository.java`
- Create: `tests/integrations/javalang/pipeline/test_golden_scaffolds.py`

**Step 1: Write the failing test**

Add a golden test that feeds representative Java fixtures into the scaffold pipeline and asserts the emitted Python:
- never contains raw `true`, `false`, or `null`
- never emits `Pattern.compile(...)`
- never emits mangled constant names like `n_a_m_e_s_p_a_c_e__...`
- preserves `# Source:` metadata

**Step 2: Run test to verify it fails**

Run: `pytest tests/integrations/javalang/pipeline/test_golden_scaffolds.py -v`
Expected: FAIL because the current emitter still leaks Java syntax.

**Step 3: Write minimal implementation**

Create the fixture corpus from the upstream Java sources and wire the pipeline test harness to run:
- preprocess
- type extraction
- scaffold building
- Python emission

**Step 4: Run test to verify it passes**

Run: `pytest tests/integrations/javalang/pipeline/test_golden_scaffolds.py -v`
Expected: PASS for the fixture corpus.

**Step 5: Commit**

```bash
git add tests/fixtures/translation/generator tests/integrations/javalang/pipeline/test_golden_scaffolds.py
git commit -m "test: add golden scaffold corpus"
```

### Task 3: Fix Scaffold Hygiene in the Generator

**Files:**
- Modify: `integrations/javalang/pipeline/scaffold_builder.py`
- Modify: `integrations/javalang/pipeline/python_emitter.py`
- Create: `integrations/javalang/pipeline/postprocess.py`
- Test: `tests/integrations/javalang/pipeline/test_golden_scaffolds.py`

**Step 1: Write the failing test**

Extend the golden scaffold test to assert:
- Java booleans become `True` and `False`
- `null` becomes `None`
- unsupported framework types are omitted or downgraded to `Any`
- uppercase constants are normalized to readable Python names
- Java static helpers are rewritten or suppressed instead of emitted verbatim

**Step 2: Run test to verify it fails**

Run: `pytest tests/integrations/javalang/pipeline/test_golden_scaffolds.py -v`
Expected: FAIL on current scaffold output.

**Step 3: Write minimal implementation**

Update the pipeline so it:
- normalizes Java literals in defaults and field initializers
- strips or downgrades framework-only types before emission
- adds a post-process cleanup pass for invalid Python tokens
- preserves readable constant names instead of character-splitting them

**Step 4: Run test to verify it passes**

Run: `pytest tests/integrations/javalang/pipeline/test_golden_scaffolds.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add integrations/javalang/pipeline/scaffold_builder.py integrations/javalang/pipeline/python_emitter.py integrations/javalang/pipeline/postprocess.py tests/integrations/javalang/pipeline/test_golden_scaffolds.py
git commit -m "feat: clean scaffolded python output"
```

### Task 4: Add a Repo-Wide Translation Lint Gate

**Files:**
- Create: `scripts/translation/validate_scaffold_output.py`
- Create: `tests/scripts/translation/test_validate_scaffold_output.py`
- Modify: `scripts/translation/report_translation_metrics.py`

**Step 1: Write the failing test**

Add tests for a validator that fails when a Python file contains:
- raw `true`, `false`, or `null`
- `Pattern.compile(` or similar Java-only call shapes
- known mangled constant patterns
- invalid unresolved-type leakage that should be downgraded

**Step 2: Run test to verify it fails**

Run: `pytest tests/scripts/translation/test_validate_scaffold_output.py -v`
Expected: FAIL because the validator does not exist.

**Step 3: Write minimal implementation**

Create `scripts/translation/validate_scaffold_output.py` and make the metrics script optionally call it in strict mode.

**Step 4: Run test to verify it passes**

Run: `pytest tests/scripts/translation/test_validate_scaffold_output.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/translation/validate_scaffold_output.py scripts/translation/report_translation_metrics.py tests/scripts/translation/test_validate_scaffold_output.py
git commit -m "test: add translation scaffold lint gate"
```

### Task 5: Batch-Regenerate and Dry-Run Tranche 1 Targets

**Files:**
- Modify: `integrations/git/abstract_sync_task.py`
- Modify: `integrations/git/sync_flows.py`
- Modify: `engine/jdbc/repository/abstract_jdbc_flow_repository.py`
- Modify: `engine/repository/postgres/postgres_flow_repository.py`
- Create: `docs/plans/tmp/tranche-1-dry-run-2026-03-19.md`

**Step 1: Write the failing test**

Add assertions to the golden scaffold and validator suites that these regenerated files no longer contain the known hygiene defects.

**Step 2: Run test to verify it fails**

Run:
- `pytest tests/integrations/javalang/pipeline/test_golden_scaffolds.py -v`
- `pytest tests/scripts/translation/test_validate_scaffold_output.py -v`

Expected: FAIL before regeneration.

**Step 3: Write minimal implementation**

Regenerate or patch only the tranche-1 sample files and capture before/after metrics in `docs/plans/tmp/tranche-1-dry-run-2026-03-19.md`.

**Step 4: Run test to verify it passes**

Run:
- `pytest tests/integrations/javalang/pipeline/test_golden_scaffolds.py -v`
- `pytest tests/scripts/translation/test_validate_scaffold_output.py -v`

Expected: PASS for the tranche-1 sample set.

**Step 5: Commit**

```bash
git add integrations/git/abstract_sync_task.py integrations/git/sync_flows.py engine/jdbc/repository/abstract_jdbc_flow_repository.py engine/repository/postgres/postgres_flow_repository.py docs/plans/tmp/tranche-1-dry-run-2026-03-19.md
git commit -m "feat: dry-run tranche 1 scaffold cleanup"
```

### Task 6: Port the JDBC Repository Family as a Recipe

**Files:**
- Modify: `engine/jdbc/repository/abstract_jdbc_flow_repository.py`
- Modify: `engine/jdbc/repository/abstract_jdbc_execution_repository.py`
- Modify: `engine/jdbc/repository/abstract_jdbc_trigger_repository.py`
- Modify: `engine/repository/postgres/postgres_flow_repository.py`
- Modify: `engine/repository/mysql/mysql_flow_repository.py`
- Modify: `engine/repository/h2/h2_flow_repository.py`
- Create: `tests/engine/jdbc/repository/test_repository_family_recipe.py`

**Step 1: Write the failing test**

Create a family-level test that verifies:
- abstract repositories own the shared logic
- dialect repositories override only SQL-condition hooks and storage-specific differences
- the family recipe works for flow, execution, and trigger repos

**Step 2: Run test to verify it fails**

Run: `pytest tests/engine/jdbc/repository/test_repository_family_recipe.py -v`
Expected: FAIL because the shared behavior is not implemented yet.

**Step 3: Write minimal implementation**

Port one complete repository family end to end:
- shared query assembly in the abstract base
- dialect-specific hooks in Postgres/MySQL/H2 subclasses
- test only the contract that siblings must satisfy

**Step 4: Run test to verify it passes**

Run: `pytest tests/engine/jdbc/repository/test_repository_family_recipe.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add engine/jdbc/repository engine/repository/postgres/postgres_flow_repository.py engine/repository/mysql/mysql_flow_repository.py engine/repository/h2/h2_flow_repository.py tests/engine/jdbc/repository/test_repository_family_recipe.py
git commit -m "feat: port jdbc repository family recipe"
```

### Task 7: Port the Git Sync Family as a Recipe

**Files:**
- Modify: `integrations/git/abstract_sync_task.py`
- Modify: `integrations/git/sync_flows.py`
- Modify: `integrations/git/sync_flow.py`
- Modify: `integrations/git/sync_namespace_files.py`
- Modify: `integrations/git/sync_dashboards.py`
- Create: `tests/integrations/git/test_sync_family_recipe.py`

**Step 1: Write the failing test**

Create tests for the shared sync contract:
- directory setup
- dry-run behavior
- diff creation
- delete handling
- wrapper output per specialization

**Step 2: Run test to verify it fails**

Run: `pytest tests/integrations/git/test_sync_family_recipe.py -v`
Expected: FAIL because the shared sync algorithm is still stubbed.

**Step 3: Write minimal implementation**

Port `AbstractSyncTask` fully, then bind the concrete specializations with only resource-specific hooks.

**Step 4: Run test to verify it passes**

Run: `pytest tests/integrations/git/test_sync_family_recipe.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add integrations/git tests/integrations/git/test_sync_family_recipe.py
git commit -m "feat: port git sync family recipe"
```

### Task 8: Build Connector Archetypes for Repeated Integration Shapes

**Files:**
- Create: `docs/plans/tmp/integration-archetype-matrix-2026-03-19.md`
- Create: `tests/integrations/test_integration_archetypes.py`
- Modify: representative files under:
  - `integrations/aws/`
  - `integrations/azure/`
  - `integrations/gcp/`
  - `integrations/googleworkspace/`
  - `integrations/notifications/`

**Step 1: Write the failing test**

Add tests that classify integrations into a small set of shapes:
- connection + task
- connection + service + task
- trigger + realtime trigger + message model
- CRUD task set over one service

**Step 2: Run test to verify it fails**

Run: `pytest tests/integrations/test_integration_archetypes.py -v`
Expected: FAIL because the archetype registry does not exist.

**Step 3: Write minimal implementation**

Create a documented archetype matrix, then port one example per archetype before expanding to sibling families.

**Step 4: Run test to verify it passes**

Run: `pytest tests/integrations/test_integration_archetypes.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/tmp/integration-archetype-matrix-2026-03-19.md tests/integrations/test_integration_archetypes.py integrations/aws integrations/azure integrations/gcp integrations/googleworkspace integrations/notifications
git commit -m "feat: define connector archetypes"
```

### Task 9: Hand-Port the Runtime Property Kernel

**Files:**
- Modify: `engine/core/models/property/property.py`
- Modify: `engine/core/models/property/property_context.py`
- Modify: `engine/core/runners/run_context_property.py`
- Create: `tests/engine/core/models/property/test_property.py`

**Step 1: Write the failing test**

Add tests for:
- `Property.of_value`
- `Property.of_expression`
- typed rendering from plain values
- list and map coercion
- stringification and equality behavior

**Step 2: Run test to verify it fails**

Run: `pytest tests/engine/core/models/property/test_property.py -v`
Expected: FAIL because the current property kernel is stubbed.

**Step 3: Write minimal implementation**

Implement `Property` as a real runtime object and keep serializer concerns isolated from core behavior.

**Step 4: Run test to verify it passes**

Run: `pytest tests/engine/core/models/property/test_property.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add engine/core/models/property/property.py engine/core/models/property/property_context.py engine/core/runners/run_context_property.py tests/engine/core/models/property/test_property.py
git commit -m "feat: port property runtime kernel"
```

### Task 10: Hand-Port the RunContext Kernel

**Files:**
- Modify: `engine/core/runners/run_context.py`
- Modify: `engine/core/runners/default_run_context.py`
- Modify: `engine/core/runners/input_and_output.py`
- Modify: `engine/core/runners/working_dir.py`
- Create: `tests/engine/core/runners/test_run_context.py`

**Step 1: Write the failing test**

Add tests for:
- rendering and typed rendering
- plugin cloning
- storage and working-dir access
- metric capture
- state-store access

**Step 2: Run test to verify it fails**

Run: `pytest tests/engine/core/runners/test_run_context.py -v`
Expected: FAIL because the runtime context is not implemented yet.

**Step 3: Write minimal implementation**

Implement the minimal `RunContext` behavior needed by the already-ported families and wire the concrete default runtime context.

**Step 4: Run test to verify it passes**

Run: `pytest tests/engine/core/runners/test_run_context.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add engine/core/runners/run_context.py engine/core/runners/default_run_context.py engine/core/runners/input_and_output.py engine/core/runners/working_dir.py tests/engine/core/runners/test_run_context.py
git commit -m "feat: port run context kernel"
```

### Task 11: Hand-Port the Execution Kernel

**Files:**
- Modify: `engine/executor/executor_service.py`
- Modify: `engine/worker/default_worker.py`
- Modify: `engine/scheduler/abstract_scheduler.py`
- Modify: `engine/core/services/execution_service.py`
- Modify: `engine/core/services/flow_service.py`
- Create: `tests/engine/runtime/test_execution_kernel.py`

**Step 1: Write the failing test**

Add tests that cover one small end-to-end path:
- schedule a runnable task
- hand it to the worker
- capture a result
- persist state transitions

**Step 2: Run test to verify it fails**

Run: `pytest tests/engine/runtime/test_execution_kernel.py -v`
Expected: FAIL because executor, worker, and scheduler remain mostly stubbed.

**Step 3: Write minimal implementation**

Port the narrowest viable execution path needed to prove the architecture, then expand outward.

**Step 4: Run test to verify it passes**

Run: `pytest tests/engine/runtime/test_execution_kernel.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add engine/executor/executor_service.py engine/worker/default_worker.py engine/scheduler/abstract_scheduler.py engine/core/services/execution_service.py engine/core/services/flow_service.py tests/engine/runtime/test_execution_kernel.py
git commit -m "feat: port execution kernel"
```

## Simulated Dry Run

This dry run validates the ordering before implementation. It does not change code.

### Dry-Run Input Set

- `integrations/git/abstract_sync_task.py`
- `integrations/git/sync_flows.py`
- `engine/jdbc/repository/abstract_jdbc_flow_repository.py`
- `engine/repository/postgres/postgres_flow_repository.py`
- `engine/core/models/property/property.py`
- `engine/core/runners/run_context.py`

### Simulated Tranche 1 Result

Apply only generator hygiene rules to the sample set.

Expected effect:
- `Property.ofValue(false)` becomes `Property.of_value(False)` or a generator-safe placeholder.
- `Pattern.compile("...")` is rewritten, downgraded, or omitted instead of emitted as invalid Python.
- mangled constants like `n_a_m_e_s_p_a_c_e__f_i_n_d_e_r__p_a_t_t_e_r_n` stop being produced.
- unresolved framework types remain visible as warnings or `Any`, but no longer poison the emitted module.

Expected conclusion:
- `integrations/git/abstract_sync_task.py`
- `integrations/git/sync_flows.py`
- `engine/jdbc/repository/abstract_jdbc_flow_repository.py`
- `engine/repository/postgres/postgres_flow_repository.py`

These four files are valid tranche-1 candidates because their first problems are scaffold defects, not business logic.

### Simulated Tranche 2 Result

Group the cleaned sample files into families.

Expected family assignments:
- Git sync family:
  - `integrations/git/abstract_sync_task.py`
  - `integrations/git/sync_flows.py`
- JDBC repository family:
  - `engine/jdbc/repository/abstract_jdbc_flow_repository.py`
  - `engine/repository/postgres/postgres_flow_repository.py`

Expected conclusion:
- implement shared abstract-base logic once
- keep subclass work thin and dialect-specific
- expand only after one family passes its tests

### Simulated Tranche 3 Result

Classify kernel blockers.

Expected kernel assignments:
- `engine/core/models/property/property.py`
- `engine/core/runners/run_context.py`

Expected conclusion:
- do not spend time mass-porting families that depend on these kernels until tranche 1 noise is reduced
- once the property and runtime context kernels are real, many family ports become straightforward

### Dry-Run Decision

If the dry run behaves as expected, execute in this order:

1. Task 1 through Task 5
2. Task 6 through Task 8
3. Task 9 through Task 11

If Task 5 does not reduce obvious scaffold leakage in the sample files, stop and fix the generator again before touching any larger family.

## Verification Commands

Run these after each major task group:

```bash
pytest tests/integrations/javalang/pipeline -v
pytest tests/scripts/translation -v
pytest tests/integrations/git -v
pytest tests/engine/jdbc/repository -v
pytest tests/engine/core/models/property/test_property.py -v
pytest tests/engine/core/runners/test_run_context.py -v
pytest tests/engine/runtime/test_execution_kernel.py -v
python3 scripts/translation/report_translation_metrics.py
python3 scripts/translation/validate_scaffold_output.py
```

## Exit Criteria

- scaffold pipeline stops emitting known invalid Python patterns
- one tranche-1 dry run shows measurable hygiene reduction on representative files
- at least one family recipe is proven end to end with tests
- property and run-context kernels are real enough to support family code
- one narrow execution path works across executor, worker, and scheduler

Plan complete and saved to `docs/plans/2026-03-19-java-to-python-translation-acceleration-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
