---
title: husky-hook-usage-guide
description: Canonical local-usage guide for the repo's checked-in Husky hooks, path policy, and routed pre-push families.
---

# Husky Hook Usage Guide

This guide explains how the checked-in Husky hook system works, what it blocks, what it runs, and how to debug failures without guessing.

## What the system does

The repo uses checked-in Husky entrypoints under `.husky/` and routes real work through Node helpers under `scripts/husky/` and `scripts/repo-hygiene/`.

The goals are:

- keep repo metadata clean
- block obvious local mistakes before they land
- preserve the existing `web` TypeScript push gate
- run targeted regression suites only when related files changed
- leave Docker-backed startup and deploy behavior in CI

## One-time setup

Run this after a fresh clone, after reinstalling dependencies, or any time hooks stop firing:

```powershell
npm install
npm run prepare
git config --get core.hooksPath
```

Expected output for the last command:

```text
.husky
```

If `core.hooksPath` does not resolve to `.husky`, the checked-in hook entrypoints are not active.

## Authored entrypoints

These are the human-authored shell entrypoints:

- `.husky/pre-commit`
- `.husky/pre-push`
- `.husky/post-checkout`
- `.husky/post-merge`
- `.husky/post-rewrite`

Each one forwards into:

```text
node scripts/husky/hook-runner.mjs <stage>
```

Do not treat `.git/hooks/*` as the source of truth for this repo.

## Normal daily workflow

### On `git commit`

`pre-commit` always runs:

- repo metadata cleanup:
  - `node scripts/repo-hygiene/remove-desktop-ini.mjs --write --staged`
- hardcoded path scan:
  - `node scripts/husky/check-hardcoded-paths.mjs --staged`
- secret scan on added lines:
  - `node scripts/husky/check-secrets.mjs --staged`

If staged files under `web/` changed, it also runs:

- `cd web && npx eslint <changed-web-files>`

Performance note:

- `pre-commit` desktop.ini cleanup is intentionally staged-scope. It checks staged-path ancestor directories plus Git metadata, not a full recursive worktree sweep.

### On `git push`

`pre-push` always runs:

- protected push guard:
  - `node scripts/husky/check-protected-push.mjs`

If any changed file falls into a routed family, `pre-push` runs only the commands attached to those families.

For any `web/**` change, it also preserves the existing TypeScript push gate:

- `cd web && npx tsc -b --noEmit`

### On checkout, merge, or rewrite

These stages only do repo metadata cleanup:

- `post-checkout`
- `post-merge`
- `post-rewrite`

Those stages keep the full recursive sweep because they are the right place to clean broad `desktop.ini` pollution from both the worktree and Git metadata.

## Console output

You will usually see one of these lines first:

```text
[husky] pre-commit: repo-metadata-cleanup, hardcoded-paths, secret-scan
```

```text
[husky] pre-push: protected-push, frontend-build-safety, index-builder
```

```text
[husky] post-merge: repo-metadata-cleanup
```

```text
[husky] pre-push: no hook groups matched
```

`no hook groups matched` is not an error. It means no path-scoped family applied for that stage.

## Hardcoded path policy

All `.md`, `.mdx`, and `.txt` files are review-only: hardcoded path findings are reported for review and do not block the commit.

Blocking scope includes:

- `.husky/**`
- `scripts/**` scripts such as `.mjs`, `.js`, `.ps1`, `.sh`
- `web/**` TypeScript files
- `services/platform-api/**` Python files
- `supabase/**` SQL files
- config files such as `.json`, `.toml`, `.yml`, `.yaml`

The current tracked operational docs in the policy are:

<!-- husky-path-policy-docs:start -->
- `__start-here/2026-04-07-dual-pc-setup-internal-readme.md`
- `docs/sessions/0407/ai-tool-directory-inventory.md`
- `scripts/tests/docs-perspective-audit.test.mjs`
- `scripts/tests/hardcoded-path-audit.test.mjs`
<!-- husky-path-policy-docs:end -->

Those files are listed explicitly because they are known operational docs, but they still follow the same review-only documentation policy as every other `.md`, `.mdx`, and `.txt` file.

Typical output:

```text
block: web/src/example.ts:10:5 -> <machine-local-path>/...
review: docs/notes/example.md:42:1 -> <machine-local-path>/...
```

If you are writing code or config, use repo-relative logic or placeholders such as `<repo-root>/...` or `/path/to/...`.

## Secret scan

The staged secret scan blocks:

- PEM private key material
- inline JSON `private_key` blobs
- real assignments to protected env vars such as `OPENAI_API_KEY`
- known token prefixes such as `ghp_`, `github_pat_`, `sk-`, `xoxb-`, `AIza`

It scans added lines only, not the whole repo.

Examples of placeholder values that are allowed in template-like files:

- `<YOUR_VALUE>`
- `YOUR_API_KEY_HERE`
- `example`
- `dummy`
- `/path/to/...`

For docs, tests, and template-like files only, you can suppress an intentional example with:

```text
husky: allow-secret-example
```

Put that on the previous added line before the example.

## What `pre-push` can block

### Protected pushes

This always runs, even if no changed file family matches.

It blocks:

- any push that updates `refs/heads/master`
- any remote delete operation

Typical failures:

```text
pushes to refs/heads/master are blocked
```

```text
remote delete operations are blocked for refs/heads/feature
```

### Routed family checks

Current routed family IDs are:

- `supabase-workflow-guardrails`
- `superuser-operational-readiness`
- `blockdata-browser-upload`
- `platform-api-bootstrap`
- `telemetry-truthfulness`
- `pipeline-services`
- `index-builder`
- `shared-selector-contract`
- `agchain-focus-sync`
- `agchain-provider-model-surfaces`

Representative examples:

- changing `web/src/pages/IndexBuilderPage.tsx` triggers:
  - `frontend-build-safety`
  - `index-builder`
  - `protected-push`
- changing `services/platform-api/app/api/routes/telemetry.py` triggers:
  - `telemetry-truthfulness`
  - `protected-push`
- changing `supabase/migrations/...` triggers:
  - `supabase-workflow-guardrails`
  - `protected-push`

## Manual rerun commands

### Helper and policy suite

```powershell
node --test --test-isolation=none scripts/tests/remove-desktop-ini.test.mjs scripts/tests/husky-hook-routing.test.mjs scripts/tests/husky-hardcoded-paths.test.mjs scripts/tests/husky-secret-scan.test.mjs scripts/tests/husky-protected-push.test.mjs
```

### Frontend changed-file lint example

```powershell
cd web
npx eslint src/pages/IndexBuilderPage.tsx
```

### Frontend push gate

```powershell
cd web
npx tsc -b --noEmit
```

### Platform API targeted suites

```powershell
cd services/platform-api
pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py
```

### Web targeted suites

```powershell
cd web
npm run test -- src/pages/IndexBuilderPage.test.tsx src/hooks/useIndexBuilderJob.test.ts src/hooks/usePipelineSourceSet.test.ts src/hooks/useIndexBuilderList.test.ts
```

### Manual hook smoke tests

```powershell
node scripts/husky/hook-runner.mjs post-merge
```

```powershell
@"
refs/heads/feature <current-head-sha> refs/heads/master <current-head-sha>
"@ | node scripts/husky/hook-runner.mjs pre-push
```

The second example is a safe way to prove the protected-push rule still blocks `master`.

## CI-owned boundaries

These are intentionally not part of local Husky enforcement:

- `supabase db start`
- `supabase db reset`
- Docker-backed replay or setup
- edge-function deploy behavior
- deploy commands in general

One routed `pre-push` family does call:

```powershell
npm run test:supabase-migration-reconciliation-contract
```

That command expects a reachable Postgres instance at `127.0.0.1:54322` by default, unless `TEST_DATABASE_URL` is set. If that local database is not running, the command will fail with connection errors even when the hook logic itself is correct.

## Bypass options

These exist, but use them deliberately:

- `git commit --no-verify`
- `git push --no-verify`
- `HUSKY=0`

Bypassing local hooks does not bypass CI. If you skip local checks, expect CI or later reviewers to surface the same problem.

## Troubleshooting

### Hooks are not running at all

Run:

```powershell
npm run prepare
git config --get core.hooksPath
```

Expected result:

```text
.husky
```

### The hook says `no hook groups matched`

That is normal when no family watched the changed paths for that stage.

### `desktop.ini` keeps coming back

The hooks remove it when they run, but they do not control OneDrive, Explorer metadata, or sync clients. Keep those tools away from `.git` directories.

### A push fails on tests that seem unrelated

Look at the first `[husky] pre-push: ...` line. It tells you which family IDs were selected. Start debugging from those families instead of scanning the whole repo.

### A push fails on the Supabase migration reconciliation contract

Check whether local Postgres is available on `127.0.0.1:54322`, or provide `TEST_DATABASE_URL`.

### A code sample in docs or tests is being flagged as a secret

Use the suppression token only for intentional examples in docs, tests, or template-like files:

```text
husky: allow-secret-example
```

Do not use the suppression token to hide a real credential.
