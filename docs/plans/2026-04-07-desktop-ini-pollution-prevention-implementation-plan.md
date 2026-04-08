# Desktop.ini Pollution Prevention Implementation Plan

**Goal:** Prevent recurring `desktop.ini` pollution in `E:\writing-system` by adding a checked-in cleanup tool, versioned Git hooks, and explicit local setup instructions, while preserving the existing pre-push type-check gate.

**Architecture:** Keep this as repo-hygiene work owned entirely inside the repository. Add one repo-local Node cleanup CLI that scans both the work tree and the Git metadata directory, wire it into checked-in Git hooks via `core.hooksPath`, preserve the current TypeScript `pre-push` contract, and document the required external sync-client exclusions as an environment prerequisite rather than trying to solve them with Atlas or runtime code.

**Tech Stack:** Node.js CLI scripts, Git hooks, Bash hook wrappers, npm scripts, Markdown docs.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-07

### Platform API

No platform API changes.

### Observability

No OpenTelemetry or platform-runtime observability changes.

Justification: this feature is a repo-local Git/filesystem hygiene workflow, not an application runtime seam. The owned verification surface is deterministic CLI output plus automated tests.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

No frontend changes.

## Pre-Implementation Contract

No major repo-hygiene decision may be improvised during implementation. If the cleanup scope, hook ownership model, or `.git` handling needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. `desktop.ini` prevention is owned by repo-local cleanup and Git hooks, not by Atlas, not by Git ignore rules alone, and not by manual cleanup alone.
2. The cleanup surface includes both the working tree and the repo’s Git metadata directory returned by `git rev-parse --git-dir`.
3. Checked-in hooks live in `.githooks/` and are activated through `git config core.hooksPath .githooks`; the repo must stop relying on one-off unmanaged files inside `.git/hooks/`.
4. The current TypeScript `pre-push` guard must survive unchanged in behavior after migration into the checked-in hooks path.
5. Sync-client exclusions for OneDrive / Google Drive / backup tooling remain a required manual environment step and are documented, not automated.
6. Atlas remains out of scope for this plan. It may be integrated later for agent workflow discipline, but it is not the mechanism for stopping Windows metadata files.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. Running the hook installer sets `core.hooksPath` to `.githooks` for this repo.
2. A synthetic `desktop.ini` created in the working tree is removed automatically by the repo cleanup CLI and by the checked-in `pre-commit`, `post-checkout`, and `post-merge` hooks.
3. A synthetic `desktop.ini` created inside the repo’s `.git` directory is also removed by the cleanup CLI and hooks.
4. The checked-in `pre-push` hook still runs the existing `web` TypeScript type-check and blocks pushes on errors exactly as it does now.
5. A repo-wide cleanup check reports zero remaining `desktop.ini` files after verification.

### Locked Platform API Surface

No platform API endpoints are added, modified, or consumed.

### Locked Observability Surface

No traces, metrics, or structured logs are added.

Allowed verification output:

- CLI summary lines such as scanned root count, deleted file count, and remaining file count
- Hook console messages indicating cleanup ran and whether any files were removed

Forbidden scope creep:

- No OpenTelemetry work
- No platform-api logging work
- No CI telemetry work in this plan

### Locked Inventory Counts

#### Repo hygiene artifacts

- New cleanup CLI scripts: `2`
- New checked-in Git hook files: `4`
- Modified repo config files: `1`
- Modified docs files: `1`

#### Application surfaces

- New platform API files: `0`
- Modified platform API files: `0`
- New frontend files: `0`
- Modified frontend files: `0`
- New migrations: `0`

### Locked File Inventory

#### New files

- `scripts/repo-hygiene/remove-desktop-ini.mjs`
- `scripts/tests/remove-desktop-ini.test.mjs`
- `scripts/install-git-hooks.mjs`
- `.githooks/pre-commit`
- `.githooks/post-checkout`
- `.githooks/post-merge`
- `.githooks/pre-push`

#### Modified files

- `package.json`
- `__start-here/2026-04-07-dual-pc-setup-internal-readme.md`

## Frozen Repo Hygiene Contract

This plan solves recurring `desktop.ini` pollution as a local repository hygiene problem.

- It does not attempt to stop Windows Explorer or sync clients from ever attempting file creation.
- It does enforce immediate cleanup inside the working tree and `.git` whenever common Git workflows run.
- It does preserve the existing `pre-push` behavior instead of replacing it.
- It does not depend on Atlas. Atlas is a repo workflow/context tool and is currently not integrated into `E:\writing-system\.mcp.json`; using Atlas would not, by itself, prevent `desktop.ini` creation.

## Explicit Risks Accepted In This Plan

1. Git hooks cannot prevent a sync client from creating a new `desktop.ini` between hook runs; they only provide rapid cleanup at predictable repo touchpoints.
2. Developers who do not run the hook installer will not get automatic cleanup until local setup is completed.
3. External sync/indexing tools can still interfere with `.git` if the machine-level exclusion rules are not applied.

## Completion Criteria

The work is complete only when all of the following are true:

1. `git config --get core.hooksPath` returns `.githooks` inside this repo.
2. `node --test scripts/tests/remove-desktop-ini.test.mjs` passes.
3. Manual verification proves cleanup of `desktop.ini` in both the work tree and `.git`.
4. The migrated checked-in `pre-push` hook still passes on a clean tree and still blocks when `npx tsc -b --noEmit` fails in `web/`.
5. The dual-PC setup doc clearly tells operators to exclude this repo and especially `.git` from sync/indexing tools.

## Task 1: Add the repo-local desktop.ini cleanup CLI

**File(s):** `scripts/repo-hygiene/remove-desktop-ini.mjs`, `scripts/tests/remove-desktop-ini.test.mjs`

**Step 1:** Implement a Node CLI that resolves the repo root and Git directory, scans both surfaces recursively, deletes files whose basename is exactly `desktop.ini`, and prints a deterministic summary.
**Step 2:** Add flags for dry-run / check mode versus delete mode so the same tool can support both verification and hook execution.
**Step 3:** Write node tests that create temporary repo-shaped directories, seed `desktop.ini` in the work tree and `.git`, run the CLI, and assert the files are removed while non-matching files remain untouched.

**Test command:** `node --test scripts/tests/remove-desktop-ini.test.mjs`
**Expected output:** Node test runner reports all cleanup CLI tests passing with explicit coverage for work tree and `.git` cases.

**Commit:** `feat(repo-hygiene): add desktop.ini cleanup cli`

## Task 2: Add checked-in Git hooks and preserve pre-push behavior

**File(s):** `.githooks/pre-commit`, `.githooks/post-checkout`, `.githooks/post-merge`, `.githooks/pre-push`

**Step 1:** Create checked-in hook scripts that resolve the repo root, run the cleanup CLI, and print concise status messages.
**Step 2:** Make `pre-commit`, `post-checkout`, and `post-merge` run the cleanup CLI automatically so common repo interactions clear newly introduced `desktop.ini` files.
**Step 3:** Move the current unmanaged `.git/hooks/pre-push` TypeScript check logic into `.githooks/pre-push`, keeping its behavior and messaging intact while optionally running the cleanup CLI before the type-check.

**Test command:** `bash .githooks/pre-push`
**Expected output:** On a clean repo, the hook prints the cleanup summary and then `TypeScript check passed.`

**Commit:** `feat(repo-hygiene): add checked-in git hooks`

## Task 3: Add hook installation wiring

**File(s):** `scripts/install-git-hooks.mjs`, `package.json`

**Step 1:** Add a small installer script that runs `git config core.hooksPath .githooks` from the repo root and verifies the resulting value.
**Step 2:** Add an npm script such as `hooks:install` that invokes the installer.
**Step 3:** Ensure the installer exits non-zero if Git is unavailable or if the configured hooks path does not match `.githooks`.

**Test command:** `node scripts/install-git-hooks.mjs && git config --get core.hooksPath`
**Expected output:** The installer reports success and `git config` returns exactly `.githooks`.

**Commit:** `chore(repo-hygiene): add git hook installer`

## Task 4: Document the manual machine-level prevention steps

**File(s):** `__start-here/2026-04-07-dual-pc-setup-internal-readme.md`

**Step 1:** Add a short repo-hygiene section that explains why `desktop.ini` appears, why `.gitignore` is insufficient, and why `.git` pollution is dangerous.
**Step 2:** Document the required machine-level exclusions: keep the working repo out of OneDrive / Google Drive / backup-indexed roots and exclude this repo, especially `.git`, from sync/indexing tools.
**Step 3:** Document the local setup command `npm run hooks:install` as a required step on each machine after cloning or restoring the repo.

**Test command:** `rg -n "desktop.ini|hooks:install|core.hooksPath|OneDrive|Google Drive|\\.git" __start-here/2026-04-07-dual-pc-setup-internal-readme.md`
**Expected output:** The readme contains explicit operator instructions for sync exclusions and hook installation.

**Commit:** `docs(repo-hygiene): document desktop.ini prevention workflow`

## Task 5: Run end-to-end verification

**File(s):** `scripts/repo-hygiene/remove-desktop-ini.mjs`, `.githooks/pre-commit`, `.githooks/post-checkout`, `.githooks/post-merge`, `.githooks/pre-push`

**Step 1:** Run `npm run hooks:install` and verify `core.hooksPath` is `.githooks`.
**Step 2:** Seed disposable `desktop.ini` files in both the working tree and `.git`, run the cleanup CLI plus hook scripts, and verify the files are removed.
**Step 3:** Run the cleanup CLI in check mode against the real repo and confirm it reports zero remaining `desktop.ini` files.

**Test command:** `node --test scripts/tests/remove-desktop-ini.test.mjs && node scripts/repo-hygiene/remove-desktop-ini.mjs --check`
**Expected output:** Tests pass and the check command reports zero remaining `desktop.ini` files in the repo and Git metadata directory.

**Commit:** `test(repo-hygiene): verify desktop.ini prevention flow`
