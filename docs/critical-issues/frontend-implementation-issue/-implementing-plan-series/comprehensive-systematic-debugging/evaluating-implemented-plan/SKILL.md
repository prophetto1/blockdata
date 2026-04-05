---
name: evaluating-implemented-plan
description: Use when implementation from an approved plan appears complete and you need the first post-implementation audit before approval, merge, or handoff — especially when you must verify plan compliance rather than debug a known defect
---

# Evaluating an Implemented Plan

## Overview

This skill is the final contract audit after implementation claims completion. It is not a cursory gate check and it is not debugging. The reviewer must understand what the approved implementation plan says the system should be, then prove the delivered code matches that contract closely enough to approve.

This skill shares the same core discipline as `investigating-and-writing-plan`, `taking-over-investigation-and-plan`, and `comprehensive-systematic-debugging`: the plan is the source of truth for intended behavior, and the code is the thing being verified against that truth. The difference is timing. Planning skills lock the contract before work begins. This skill verifies the delivered implementation against that locked contract before the work is accepted. If this evaluation discovers an actual defect, unexplained failure, or broken user flow, stop the evaluation and switch to `comprehensive-systematic-debugging`.

**Announce at start:** "I'm using the evaluating-implemented-plan skill to audit the completed implementation against the approved plan."

**REQUIRED READ:** Read this file in full before evaluating any implementation. Do not approve based on commit summaries, test pass claims, or a quick skim.

## The Rule

No approval without re-deriving the approved contract first.

If you cannot clearly explain the correct platform API, observability, database changes, frontend surface, and completion conditions from the approved plan, then you are not ready to evaluate the implementation. Passing tests or visible UI alone are not enough.

The plan is the source of truth. The implementation is the subject under test.

The standard is substantial compliance — approximately 90% of locked contract items must match reality with no critical deviations. Minor deviations are noted and accepted. Critical deviations (wrong auth, missing endpoints, absent migrations, missing observability that the plan declared) block approval regardless of overall percentage. The goal is rigorous verification that ships correct work, not perfection theater that blocks everything.

Use any skill or mcp as needed. Use any tool as many times as you need. Use every resource available to you in any read-only way as much as you need. The evaluator's job is to understand the plan deeply and then prove reality matches it.

If the implementation diverges from the plan in a contract-bearing way and the plan was not updated and approved accordingly, the work is not compliant. If the evaluation discovers an actual bug, failing behavior, or unexplained runtime problem, stop and use `comprehensive-systematic-debugging`.

## When to Use

- A worker says the implementation plan is complete
- You need the first serious post-implementation assessment before calling the work done
- You need to decide whether the work is ready for approval, merge, or handoff
- You need to verify that delivered code matches the approved plan, not just that "something exists"
- You suspect the implementation may be partially correct but need a rigorous compliance decision

## When NOT to Use

- The work is still being planned — use `investigating-and-writing-plan`
- The work must be re-planned from inherited or stale material — use `taking-over-investigation-and-plan`
- There is already a known bug, runtime failure, or broken flow to diagnose — use `comprehensive-systematic-debugging`

## Where to Look

Start your evaluation at these locations. Read the approved plan first, then inspect reality.

| Area | Start here |
|------|-----------|
| Approved implementation plan | `docs/plans/` — this is the intended contract |
| Current implementation diff | Working tree, branch diff, or merged files |
| Platform API routes | `services/platform-api/app/api/routes/` |
| Platform API entry point | `services/platform-api/app/main.py` |
| Observability / OTel | `services/platform-api/app/observability/` |
| Database migrations | `supabase/migrations/` |
| Edge functions | `supabase/functions/` |
| Frontend pages | `web/src/pages/` |
| Frontend components | `web/src/components/` |
| Frontend hooks | `web/src/hooks/` |
| Frontend services/libs | `web/src/lib/` |
| Test files | Backend and frontend test directories touched by the work |
| Verification evidence | Test commands, screenshots, traces, logs, manual QA notes, review comments |

## Evaluation Workflow

### 1. Read the approved plan until you can restate the contract

Read the approved implementation plan first.

- Header: goal, architecture, tech stack
- Manifest: platform API, observability, database migrations, edge functions, frontend surface area
- Higher-rigor sections, if present
- Explicit risks and completion criteria
- Implementation tasks and stated verification commands

You are not ready to evaluate until you can answer:

- What are the correct endpoints and request/response contracts?
- What observability must exist and what attributes are allowed or forbidden?
- What migrations and schema effects are required?
- What exact frontend files and user-visible surfaces should exist?
- What completion conditions must all be true before approval?

### 2. Inventory the implementation evidence

Before judging compliance, gather the evidence set:

- Current changed files
- Relevant commits or PR diff
- Test commands actually run and results
- Database migration files created or modified
- Runtime evidence, if required by the plan: traces, metrics, structured logs
- Manual verification notes for user-visible flows

Do not trust "tests passed" or "implemented as planned" without seeing the evidence yourself.

### 3. Audit the manifest against reality at contract level

This is not an existence check. Verify the implementation matches the approved contract, not merely that something similar exists.

- Platform API: verb, path, auth, request shape, response shape, touched tables/RPCs, caller usage
- Observability: trace names, metric names and types, structured logs, emit locations, allowed/forbidden attributes
- Database migrations: filenames, schema effects, data impact, policies, helper functions, triggers, RPC contracts
- Edge functions: whether they were correctly left untouched or intentionally reused as declared
- Frontend surface area: exact counts, exact files, exact mount points, correct API usage, correct user-visible behavior

### 4. Audit the higher-rigor locked sections

When the approved plan includes higher-rigor locking, verify those sections directly:

- Locked product decisions
- Locked acceptance contract
- Locked platform API surface
- Locked observability surface
- Locked inventory counts
- Locked file inventory
- Frozen seam contract
- Explicit risks accepted in this plan
- Completion criteria

The implementation must satisfy the plan that was approved, not a softer or improvised version of it.

### 5. Classify every deviation

For every difference between plan and implementation, classify it by severity:

**Item-level classifications:**

| Classification | Meaning | Blocks Approval? |
|---------------|---------|:-:|
| `Compliant` | Implementation matches the approved contract for this item | No |
| `Minor Deviation` | Deviation exists but does not break the contract's intent — e.g., slightly different attribute name, helper organized differently, count off by one in a non-critical area | No — noted and accepted |
| `Critical Deviation` | Missing endpoint, wrong auth, missing migration, absent declared observability, wrong API shape, missing acceptance criteria, undeclared scope expansion | **Yes** |
| `Defect Found` | Actual bug, broken flow, failing verification, or unexplained runtime issue — stop evaluation and switch to `comprehensive-systematic-debugging` | **Yes — switch skills** |

**Verdict logic:** Approximately 90% compliance on locked contract items with zero critical deviations = approve. Any critical deviation or overall compliance below that threshold = reject with remediation list.

### 6. Verify completion evidence

Even if the code shape looks right, the implementation is not ready for approval unless completion evidence exists where the plan requires it.

- Declared tests exist and were run
- Manual acceptance steps were executed when required
- Traces, metrics, and structured logs emit when the plan says they must
- Migrations are present and produce the declared schema/runtime state
- Completion criteria can be proven true

### 7. Produce the evaluation output and approval recommendation

Your output must make a clear approval decision. Do not leave the status implicit.

If the work is compliant, say so and state the evidence.

If the work is non-compliant, state exactly what is missing, wrong, or undocumented.

If the work uncovered a real defect or broken flow, stop the evaluation and hand off to `comprehensive-systematic-debugging`.

## Required Evaluation Output

Every evaluation must produce these sections.

### Reviewed Inputs

List exactly what you reviewed:

- Approved plan path
- Code/diff/branch reviewed
- Test commands or evidence reviewed
- Runtime evidence reviewed

#### Example

```markdown
## Reviewed Inputs

- Approved plan: `docs/plans/user-storage/2026-03-21-user-storage-signup-verification-implementation.md`
- Code reviewed: current branch diff plus touched files in `services/platform-api`, `supabase/migrations`, and `web/src`
- Tests reviewed: `pytest services/platform-api/tests/storage -q`, `vitest run web/src/components/storage`
- Runtime evidence reviewed: storage traces and admin policy update structured logs
```

### Approved Contract Summary

Restate the approved shape of the implementation in compact form so the reader knows what "correct" means.

#### Example

```markdown
## Approved Contract Summary

- New superuser storage administration endpoints must exist in `platform-api`
- Browser uploads must use `/storage/uploads`, not the legacy `ingest` edge path
- Source uploads must preserve precomputed `source_uid`
- `source_documents` remains the visible assets compatibility spine in this phase
- Quota-aware traces, metrics, and admin audit logs must emit
```

### Compliance Verdict

Choose exactly one:

| Verdict | When to use |
|---------|-------------|
| `Compliant` | ~90%+ locked items match, zero critical deviations, completion evidence sufficient |
| `Compliant With Minor Deviations` | ~90%+ locked items match, zero critical deviations, but minor deviations are noted for the record |
| `Non-Compliant` | Critical deviations exist, or overall compliance is below threshold |
| `Defect Found — Switch To Debugging` | Evaluation uncovered an actual bug, broken flow, or unexplained runtime failure |

#### Example

```markdown
## Compliance Verdict

**Verdict:** `Non-Compliant`

**Compliance rate:** 14 of 18 locked contract items verified (78%).

**Critical deviations (2):**
1. `GET /admin/storage/provisioning/recent` — declared in plan, endpoint missing entirely
2. Provisioning monitor frontend panel — declared in plan, component missing

**Minor deviations (2):**
1. `storage.upload.reserve` trace span uses `upload.storage.reserve` name — reversed prefix order
2. Frontend component count is 4 instead of declared 3 — extra `StorageQuotaBar` helper component

The implementation built the superuser policy endpoints and quota UI correctly, but it omitted the declared provisioning monitor endpoint and its frontend panel. The approved completion criteria are therefore not satisfied.
```

### Manifest Audit

Audit each manifest area directly:

- Platform API
- Observability
- Database Migrations
- Edge Functions
- Frontend Surface Area

For each area, state whether it matches the approved contract and name any divergence.

#### Example

```markdown
## Manifest Audit

### Platform API

- `GET /admin/storage/policy`: compliant
- `PATCH /admin/storage/policy`: compliant
- `GET /admin/storage/provisioning/recent`: missing
- `POST /storage/uploads`: partially compliant — new fields exist, but `source_uid` is still computed server-side instead of being required from the caller

### Observability

- `storage.upload.reserve`: compliant
- `admin.storage.policy.update`: compliant
- `admin.storage.provisioning.recent`: missing
```

### Higher-Rigor Contract Audit

Audit every higher-rigor section that appears in the approved plan.

#### Example

```markdown
## Higher-Rigor Contract Audit

### Locked Product Decisions

- Superuser storage controls remain inside `SuperuserWorkspace.tsx`: compliant
- `source_documents` remains the visible compatibility spine: compliant

### Locked Acceptance Contract

- New user quota display after signup: not yet proven
- `1 GB` upload through migrated storage path: proven
- Provisioning monitor shows clean signup state: not possible because the monitor endpoint is missing
```

### Missing Planned Work

List every approved item that is absent, partial, or unproven.

### Undeclared Additions

List every addition that was implemented but not declared in the approved plan.

Undeclared additions are not automatically acceptable just because they seem useful.

### Verification Evidence

State what evidence proves or fails to prove completion:

- tests run
- acceptance steps executed
- runtime observability checked
- migration or schema verification performed

### Approval Recommendation

State the next action explicitly:

| Recommendation | When |
|----------------|------|
| `Approve` | Compliant, no deviations worth noting |
| `Approve With Noted Deviations` | Compliant, minor deviations logged but not blocking |
| `Approve After Plan Update` | Implementation is correct but diverged from plan in ways that should be reflected — update the plan to match reality, then approve |
| `Reject — Remediation Required` | Critical deviations or below-threshold compliance — remediation list provided |
| `Switch To Debugging` | Actual defect discovered during evaluation |

#### Example

```markdown
## Approval Recommendation

**Recommendation:** `Reject — Remediation Required`

**Remediation list:**
1. Implement `GET /admin/storage/provisioning/recent` as declared in the plan
2. Implement the provisioning monitor frontend panel in `SuperuserWorkspace.tsx`
3. Add the declared `admin.storage.provisioning.recent` trace span and metric
4. Re-run the locked acceptance contract end-to-end after remediation
```

## Manifest Compliance Review

Use these checks when auditing the manifest.

### Platform API

For each endpoint declared in the plan, verify:

- endpoint exists at the declared verb and path
- auth requirement matches
- request contract matches
- response contract matches
- touched tables, RPCs, or services match the plan
- frontend or backend callers use the endpoint correctly

An endpoint that exists with the wrong auth, wrong shape, or wrong behavior is not compliant.

### Observability

For each trace, metric, and structured log declared in the plan, verify:

- name matches exactly
- emitter location matches or is explicitly updated and approved
- runtime emission actually occurs when the flow runs
- allowed attributes are present as needed
- forbidden attributes are not leaking into traces or metrics

"Some tracing exists" is not enough.

### Database Migrations

For each migration declared in the plan, verify:

- file exists at the declared filename
- schema effect matches what the plan said
- policies, helper functions, triggers, or RPCs exist as declared
- declared data impact matches reality

If the plan said "No database migrations," prove that the delivered feature truly required none.

### Edge Functions

Verify either:

- the plan correctly left edge functions untouched
- or any declared edge-function reuse/modification happened exactly as approved

An unexpected new or modified edge function is non-compliant unless explicitly approved.

### Frontend Surface Area

Verify:

- exact counts match the approved plan
- exact files exist and are mounted where the plan says
- pages, components, hooks, and services use the correct backend contracts
- user-visible behavior matches the locked acceptance flow

The frontend is not compliant if it looks right but is wired to the wrong runtime seam.

## Higher-Rigor Contract Review

When the approved plan includes higher-rigor sections, verify them with the same strictness:

### Locked Product Decisions

Confirm the implementation did not silently move the UI, change the system of record, relocate admin controls, or shift ownership of a compatibility bridge.

### Locked Acceptance Contract

Walk through the declared end-to-end acceptance path. If a declared acceptance step cannot be proven true, the implementation is not ready for approval.

### Locked Platform API Surface

Check endpoint counts and categories:

- new endpoints
- modified endpoints
- reused-as-is endpoints

Undeclared added endpoints or missing declared endpoints are non-compliant.

### Locked Observability Surface

Check counts, names, and attribute rules. Missing declared observability is non-compliant even if the feature "works."

### Locked Inventory Counts

Count drift matters. If the approved plan said `3` new components and `2` new test modules, verify those counts.

### Locked File Inventory

Verify the declared new and modified files. Undeclared file expansion is scope drift until documented and approved.

### Frozen Seam Contract

Verify the implementation preserved the compatibility-sensitive seam and avoided the wrong implementation paths the plan explicitly ruled out.

### Explicit Risks Accepted In This Plan

Confirm the implementation did not silently introduce new risks beyond the ones the plan explicitly accepted.

### Completion Criteria

All declared completion criteria must be true before approval.

## Quick Reference

| Verdict | Meaning |
|---------|---------|
| `Compliant` | ~90%+ locked items match, zero critical deviations, completion evidence sufficient |
| `Compliant With Minor Deviations` | ~90%+ locked items match, zero critical deviations, minor items noted for the record |
| `Non-Compliant` | Critical deviations exist, or overall compliance below threshold — remediation list provided |
| `Defect Found — Switch To Debugging` | Evaluation found an actual defect, failing flow, or unexplained runtime problem |

## Common Mistakes

- Approving because tests pass without re-reading the approved plan
- Checking only that an endpoint or component exists, not whether it is the correct one
- Treating undeclared additions as harmless
- Ignoring missing observability because the feature "works"
- Skipping locked acceptance steps because the UI looks plausible
- Trusting commit messages or agent summaries instead of reading the implementation
- Calling work compliant when the plan itself was never updated after drift
- Letting "close enough" replace exact contract review

## What This Prevents

- Approving an endpoint that exists but has the wrong auth or wrong response shape
- Approving observability that emits the wrong names or leaks forbidden attributes
- Approving a UI that mounted in the wrong place or uses the wrong backend seam
- Approving an implementation that skipped part of the completion criteria
- Approving undeclared scope expansion that will confuse the next phase of work
- Treating a partial implementation as complete because the happy path mostly works

## Red Flags — STOP and Tighten the Audit

If you catch yourself thinking:

- "The endpoint exists, that's good enough"
- "The response shape is basically the same"
- "Tests passed, so we can approve it"
- "The trace name is close enough"
- "The extra file is probably fine"
- "I don't need to walk the acceptance contract"
- "I'll approve it and fix the plan later"
- "This feels right even though I can't restate the approved contract"

**ALL of these mean: STOP. Return to the approved plan and prove the contract again.**

## Skill Family

This skill is part of a lifecycle family:

| Skill | Timing | Purpose |
|-------|--------|---------|
| `brainstorming` | Before design | Clarify intent before the shape is decided |
| `investigating-and-writing-plan` | Before build | Lock the contract before implementation starts |
| `taking-over-investigation-and-plan` | During handoff/recovery | Verify and re-lock a drifting or inherited plan |
| `evaluating-implemented-plan` | After execution, before approval | Audit whether completed work matches the approved plan |
| `comprehensive-systematic-debugging` | After drift/failure | Find root cause when reality is broken or unexplained |

## Related Skills

- `investigating-and-writing-plan` defines the greenfield contract this skill audits after execution.
- `taking-over-investigation-and-plan` is the sibling for inherited or stale plan situations before implementation continues.
- `comprehensive-systematic-debugging` is the next skill when evaluation discovers an actual bug, failing flow, or unexplained runtime problem.
