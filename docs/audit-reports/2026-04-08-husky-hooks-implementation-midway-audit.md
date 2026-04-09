# Evaluation Report — Husky Hooks Implementation (Mid-Way Checkpoint)

## Reviewed Inputs

- **Approved plan:** `docs/plans/2026-04-07-husky-hooks-implementation-plan.md`
- **Code reviewed:** working tree for `.husky/`, `scripts/husky/`, `scripts/repo-hygiene/`, `scripts/tests/husky-*.test.mjs`, `scripts/tests/remove-desktop-ini.test.mjs`, `package.json`
- **Tests run:** `node --test scripts/tests/husky-hook-routing.test.mjs scripts/tests/husky-hardcoded-paths.test.mjs scripts/tests/husky-secret-scan.test.mjs scripts/tests/husky-protected-push.test.mjs scripts/tests/remove-desktop-ini.test.mjs` → **18 pass / 0 fail** ✓
- **Runtime evidence reviewed:** `git config --get core.hooksPath` → `.husky` ✓. Empirical stdin-consumption repro simulating hook-runner's pre-push path against check-protected-push.mjs.
- **Git provenance checks:** commit 3e38d468 history for `ObservabilityTelemetry.test.tsx` and `IndexBuilderPage.tsx`.

## Approved Contract Summary

- Husky owned at repo root via `prepare`; `core.hooksPath` = `.husky`.
- 5 thin authored entrypoints (`pre-commit`, `pre-push`, `post-checkout`, `post-merge`, `post-rewrite`) forward to a Node runner.
- 15 locked hook families with exact watch paths and exact commands.
- 4 policy guards: hardcoded-paths (blocking scope vs 2-file doc exception list), secret-scan (exact blocking classes + suppression token), protected-push (block `refs/heads/master` and remote deletes), desktop.ini cleanup (work tree + `.git` metadata dir).
- Hook logic in Node helpers under `scripts/husky/` and `scripts/repo-hygiene/`; shell files stay thin.
- `pre-push` may run targeted tests but must NOT run Docker/Supabase-local/deploy.
- No platform-API, observability, migration, or edge-function changes.
- 5 new helper test modules + 5 new frontend test modules; `package.json` and `__start-here/2026-04-07-dual-pc-setup-internal-readme.md` modified.

## Compliance Verdict

**Verdict:** `Non-Compliant`

**Compliance rate at mid-way checkpoint:** ~85% of foundation contract items verified (foundation layer tasks 1–6 and router data for tasks 7–17 are largely in place), **but one Critical Deviation** breaks a locked acceptance criterion.

**Critical deviations (1):**

1. **`protected-push` subprocess receives empty stdin.** `scripts/husky/hook-runner.mjs` calls `fs.readFileSync(0, 'utf8')` at line 12 to parse pre-push stdin, which drains the pipe. It then spawns `node scripts/husky/check-protected-push.mjs` with `stdio: 'inherit'` (line 28-35). The subprocess inherits the already-drained fd 0, reads an empty string, and exits `0` (no violations). **Empirically reproduced:** a push line targeting `refs/heads/master` fed into the runner results in the spawned check-protected-push process exiting with code 0. This defeats acceptance criterion #5 ("Protected-push rules are enforced locally according to the exact Protected Push Contract") and completion criterion #3 ("All 15 locked hook families are implemented with path-scoped routing"). The helper tests pass because `husky-protected-push.test.mjs` calls `evaluateProtectedPush(text)` directly and never exercises the real stdin handoff.

**Minor deviations (3):**

1. `blockdata-browser-upload` pytest argument ordering differs from the plan (plan: `test_runtime_action_service.py test_runtime_readiness_service.py test_admin_runtime_readiness_routes.py test_storage_routes.py`; impl at hook-groups.mjs:156: `test_runtime_action_service.py test_storage_routes.py test_runtime_readiness_service.py test_admin_runtime_readiness_routes.py`). Behaviorally equivalent because pytest runs the whole set.
2. Secret scanner is strictly line-by-line on added diff lines, so multi-line JSON `private_key` blobs (Secret Scan Contract item 2) are only caught when `"private_key"` and its value land on a single `+` line. Single-line JSON and PEM markers are correctly caught; multi-line JSON blobs are a known limitation.
3. `path-policy.mjs` collapses DOC_EXCEPTION_FILES into the same `'review'` scope as other `.md`/`.mdx`/`.txt` files. The exception list exists and is exact, but the distinction between "explicitly allowed" and "review-reported" is not surfaced in the classifier; downstream they are identical. Contract items 5–6 are met because neither class blocks, and the exception list is encoded verbatim and exported.

**Not yet attempted (legitimate mid-way pending items — not counted as deviations):**

- Task 12 test module: `web/src/pages/ObservabilityTraces.test.tsx` — **present (new, staged as A)** ✓
- Task 12 test module: `web/src/pages/ObservabilityTelemetry.test.tsx` — **pre-existed since commit 3e38d468**, currently modified. Plan listed it as "new" in the Locked File Inventory; this is a **plan-baseline reconciliation issue**, not a dev defect.
- Task 14 test module: `web/src/hooks/useIndexBuilderList.test.ts` — missing (task deferred)
- Task 17 test modules: `AgchainAiProvidersPage.test.tsx`, `AgchainOrganizationAiProvidersPage.test.tsx` — missing (task deferred)
- Task 18: `__start-here/2026-04-07-dual-pc-setup-internal-readme.md` documentation update — not started

## Manifest Audit

### Husky Installation

- `package.json:12` adds `"prepare": "husky && git config core.hooksPath .husky"` and `devDependencies.husky: "^9.1.7"`. ✓
- `core.hooksPath` verified = `.husky`. ✓
- Tool-managed `.husky/_/**` bootstrap files present (intentionally unlocked). ✓

### Authored Hook Entrypoints (5/5)

All five shell entrypoints exist and are identical thin forwarders: `node scripts/husky/hook-runner.mjs <stage> "$@"`. ✓ Matches Locked Product Decision #4.

### Helper Scripts (8/8)

| File | Status |
|------|--------|
| `scripts/repo-hygiene/remove-desktop-ini.mjs` | ✓ — cleans work tree + resolves `.git`-file gitdir pointer + deletes nested `desktop.ini` |
| `scripts/husky/changed-files.mjs` | ✓ — `parsePrePushLines`, `getStagedFiles`, `getChangedFilesForPushLines` with ZERO_OID root handling |
| `scripts/husky/hook-groups.mjs` | ✓ — exports exactly 15 families matching locked names; correct stage assignments; correct watch patterns; correct commands (see minor #1) |
| `scripts/husky/hook-runner.mjs` | ⚠ — reads stdin + spawns commands with `stdio: 'inherit'`, causing Critical Deviation #1 |
| `scripts/husky/path-policy.mjs` | ✓ — blocking scope and exception list encoded verbatim (see minor #3) |
| `scripts/husky/check-hardcoded-paths.mjs` | ✓ — uses existing `auditHardcodedPaths`; classifies by scope; exit 1 only on blocking issues |
| `scripts/husky/check-secrets.mjs` | ✓ — exact `SECRET_ENV_VARS`, `TOKEN_PREFIXES`, placeholder regex, suppression token; added-lines-only diff scan (see minor #2) |
| `scripts/husky/check-protected-push.mjs` | ✓ (as pure function) — `evaluateProtectedPush` blocks `refs/heads/master` updates and `ZERO_OID` deletes; **wiring is broken** |

### Helper Tests (5/5)

- All 5 helper test modules present; 18 assertions pass.
- **TDD gap:** `husky-protected-push.test.mjs` only tests `evaluateProtectedPush(text)` as a pure function. There is no integration test that exercises `hook-runner.mjs → spawn(check-protected-push)` with real stdin — which is why the critical defect was missed.

### 15 Locked Hook Families (Data / Routing)

All 15 families present in `hook-groups.mjs` with matching ids, watch paths, and commands:

| # | Family | Present | Stage(s) match plan | Watch paths match | Commands match |
|---|--------|:-:|:-:|:-:|:-:|
| 1 | repo-metadata-cleanup | ✓ | ✓ (pre-commit + 3 metadata) | ✓ (alwaysRun) | ✓ |
| 2 | hardcoded-paths | ✓ | ✓ (pre-commit) | ✓ | ✓ |
| 3 | secret-scan | ✓ | ✓ (pre-commit) | ✓ | ✓ |
| 4 | frontend-build-safety | ✓ | ✓ (pre-commit lint, pre-push tsc) | ✓ | ✓ |
| 5 | protected-push | ✓ | ✓ (pre-push, alwaysRun) | ✓ | ⚠ wiring broken |
| 6 | supabase-workflow-guardrails | ✓ | ✓ | ✓ | ✓ (3 split commands) |
| 7 | superuser-operational-readiness | ✓ | ✓ | ✓ (7 files) | ✓ |
| 8 | blockdata-browser-upload | ✓ | ✓ | ✓ | minor #1 order drift |
| 9 | platform-api-bootstrap | ✓ | ✓ | ✓ | ✓ |
| 10 | telemetry-truthfulness | ✓ | ✓ | ✓ | ✓ |
| 11 | pipeline-services | ✓ | ✓ | ✓ | ✓ |
| 12 | index-builder | ✓ | ✓ | ✓ | ✓ (references missing test file) |
| 13 | shared-selector-contract | ✓ | ✓ | ✓ | ✓ |
| 14 | agchain-focus-sync | ✓ | ✓ | ✓ | ✓ |
| 15 | agchain-provider-model-surfaces | ✓ | ✓ | ✓ | ✓ (references missing test files) |

### Backend / Runtime

- Platform API: 0 new, 0 modified by this plan. ✓
- Migrations: 0. ✓
- Edge functions: 0. ✓
- Observability: 0 additions. ✓

### Frontend Surface Area

- New pages/components/hooks/services: 0. ✓
- New frontend regression test modules: **1 of 5 truly new** (`ObservabilityTraces.test.tsx`), 1 modified pre-existing (`ObservabilityTelemetry.test.tsx`, plan-baseline error), 3 deferred. Aligned with mid-way status.

## Higher-Rigor Contract Audit

### Locked Product Decisions

| # | Decision | Status |
|---|----------|:-:|
| 1 | Husky is the runner | ✓ |
| 2 | Repo root owns installation via `prepare` | ✓ |
| 3 | Old unmanaged `.git/hooks/pre-push` tsc gate migrated into `.husky/pre-push` | ✓ (encoded in `frontend-build-safety.pre-push.commands` as `cd web && npx tsc -b --noEmit`) |
| 4 | Logic in Node helpers; shell stays thin | ✓ |
| 5 | Path-scoped | ✓ (verified by `selectHookGroups` tests) |
| 6 | `pre-commit` fast, no Docker/Supabase/fanout | ✓ |
| 7 | `pre-push` no `supabase db start/reset` or deploy | ✓ |
| 8 | Hardcoded path phase-1 blocking scope + 2-file exception list | ✓ |
| 9 | `desktop.ini` cleanup in worktree AND `.git` | ✓ |
| 10 | 10 priorities from `top-areas-for-hooks.md` | ✓ (families 6–15) |
| 11 | `.husky/_/**` unlocked but allowed | ✓ |
| 12 | Edge functions zero-case in phase 1 | ✓ |

### Locked Acceptance Contract

| # | Criterion | Status |
|---|-----------|:-:|
| 1 | `npm install`/`npm run prepare` → `core.hooksPath = .husky` | ✓ verified |
| 2 | `web` tsc `pre-push` gate preserved | ✓ encoded; baseline debt blocks verification (dev's Task 7 blocker — **out of Husky plan scope**) |
| 3 | `desktop.ini` cleaned on 4 metadata hooks | ✓ (cleanup CLI + 4 family entries) |
| 4 | New machine-specific paths blocked; only 2 doc exceptions | ✓ (encoded exactly) |
| 5 | Secret leakage + protected-push enforced per exact contracts | **⚠ Secret scan ✓; protected-push wiring BROKEN** |
| 6 | 10 priority families implemented with exact paths/commands | ✓ data complete |
| 7 | 5 missing frontend test modules exist and wired | 1 of 5 truly new + 1 pre-existing-modified; 3 legitimately deferred |
| 8 | Supabase migration guardrails trigger 3 Node suites locally | ✓ wired |
| 9 | E2E verification proves each entrypoint runs + routing works + bypass honest | Not yet performed (Task 18) |

### Locked Inventory Counts

| Bucket | Locked | Delivered | Status |
|--------|:-:|:-:|:-:|
| New authored Husky entrypoints | 5 | 5 | ✓ |
| New repo helper scripts | 8 | 8 | ✓ |
| New repo helper test modules | 5 | 5 | ✓ |
| Modified repo config/docs | 2 | 1 | Pending (Task 18) |
| New frontend regression test modules | 5 | 1 new + 1 pre-existing-modified | 3 deferred to Tasks 14/17 |
| New platform API files | 0 | 0 | ✓ |
| New migrations | 0 | 0 | ✓ |
| New edge functions | 0 | 0 | ✓ |

## Missing Planned Work (within completed task scope)

1. **Integration-correct wiring of `protected-push`** — the family is declared and the helper exists, but the runner cannot feed it stdin. Must be fixed before any `pre-push` rollout can claim to enforce the Protected Push Contract.
2. **Integration test for the stdin handoff** — the TDD gap that let #1 land green.

## Undeclared Additions

None observed. No unexpected files, no unexpected endpoints, no unexpected observability, no migrations, no edge functions. Scope discipline is clean.

## Verification Evidence

- `git config --get core.hooksPath` = `.husky` ✓
- 18 helper tests pass ✓ (routing, hardcoded-path, secret-scan, protected-push pure function, desktop.ini)
- Empirical stdin repro proves protected-push integration is broken ⚠
- Baseline TSC failures (`IndexBuilderPage.tsx`, `syncPdfjsExpressAssets.test.ts`, `PipelineCatalogPanel.test.tsx`, `PipelineOperationalProbePanel.test.tsx`) are in files committed at `3e38d468` or pre-existing unstaged modifications — **NOT introduced by this plan**. The dev's Task 7 blocker is legitimate baseline debt; the Husky plan's `frontend-build-safety.pre-push` encoding is correct (it preserves the old behavior), it just exposes pre-existing breakage.

## Answer to the Dev's Question

> "Do you want me to keep going with the Husky rollout while treating the current web lint/typecheck failures as pre-existing baseline debt, or do you want me to stop and fix that frontend baseline first?"

**Continue the Husky rollout with one higher-priority pivot first:** fix the protected-push stdin defect (Critical Deviation #1) before layering more families on top of the runner, because every `pre-push` run now dispatches that family and it is silently non-enforcing. The frontend lint/typecheck baseline debt is legitimately out of Husky-plan scope — track it separately and treat Task 7's verification command as "preserved-behavior encoded, baseline cleanup is a follow-up".

## Approval Recommendation

**Recommendation:** `Reject — Remediation Required` (mid-way checkpoint)

### Remediation List (in order)

1. **Fix the stdin handoff in `scripts/husky/hook-runner.mjs`.** Three acceptable options:
   - **Preferred:** import and call `evaluateProtectedPush(stdinText)` directly from the runner for the protected-push family, skipping the subprocess entirely. Cleanest and fastest.
   - **Alternative A:** pass the already-read stdin text into the spawn via `spawnSync(..., { input: stdinText })` instead of `stdio: 'inherit'` — but this only works for families that need stdin, so the runner needs a per-family opt-in.
   - **Alternative B:** make `check-protected-push.mjs` accept the push lines via `argv` or a temp file written by the runner.
2. **Add an integration test for the fix.** Add a test in `scripts/tests/husky-protected-push.test.mjs` (or a new `husky-protected-push-integration.test.mjs`) that invokes `hook-runner.mjs` as a subprocess with a piped master push line and asserts the process exits non-zero. This closes the TDD gap that allowed the defect.
3. **Reconcile `ObservabilityTelemetry.test.tsx` with the plan.** The file predates this plan (commit `3e38d468`). Either (a) update the Locked File Inventory to list it as "modified" rather than "new" and count it toward the 5 required test modules, or (b) justify why the existing file is being replaced. This is a plan-reality reconciliation, not a code change.
4. **Align `blockdata-browser-upload` pytest order** in `hook-groups.mjs:156` to the plan's order (`test_runtime_action_service.py test_runtime_readiness_service.py test_admin_runtime_readiness_routes.py test_storage_routes.py`) for strict compliance. Minor — can be rolled into the next task's commit.
5. **Continue with Tasks 12, 14, 17, 18** (the three deferred frontend test files + documentation update) per the plan once #1 and #2 land.
6. **Do NOT** try to fix the frontend baseline typecheck debt (`IndexBuilderPage.tsx` null checks, `syncPdfjsExpressAssets.test.ts` declaration file) as part of this plan. Track it in a separate remediation ticket. The plan explicitly preserves the existing behavior of the unmanaged hook; the fact that the existing behavior was already failing is a pre-existing baseline problem that the new hook system has merely surfaced, not caused.

### Strengths Worth Preserving

- Clean separation: 5 thin shell forwarders → one Node runner → pure-function helpers.
- 15 families encoded as data, not code branches.
- Glob matcher is simple and predictable; `selectHookGroups` is easy to test.
- `desktop.ini` cleanup correctly handles `.git` worktree pointer files.
- Path policy and secret scan encode the locked contracts verbatim, including exact exception/token lists.
- Scope discipline is excellent — zero undeclared additions, zero scope creep into platform-api/migrations/observability.
- The dev correctly stopped at Task 7 rather than widening scope into pre-existing frontend debt.

**Bottom line:** foundation is solid and the scope discipline is exemplary, but the protected-push family ships a silent non-enforcer in its current integration. Fix that one defect and its TDD gap, then the rollout can resume.
