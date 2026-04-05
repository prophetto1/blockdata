---
name: executing-approved-plans
description: >
  Use when you have an approved implementation plan ready for execution — especially when
  the plan has a locked manifest, locked decisions, inventory counts, or acceptance contract
  that must be tracked during the build. Trigger when the plan has passed evaluation and
  received approval, and you are about to start writing code against it.
---

# Executing Approved Plans

## Overview

Contract-aware plan execution. Load the approved plan, internalize its contract, execute tasks precisely as written, track manifest compliance throughout, and collect evidence for the post-implementation audit.

**Core principle:** The plan is not a task list — it is a contract. Execute the contract, not just the tasks.

**Announce at start:** "I'm using the executing-approved-plans skill to implement this approved plan with contract tracking."

**REQUIRED READ:** Read this file in full before starting execution. Do not treat this as a simple task runner.

## The Rules

### Scope Discipline

Implement precisely as planned. The implementation plan is the single source of truth for what you build.

- Follow the plan exactly. Every task, every file path, every endpoint shape, every locked decision.
- **Never extend the implementation beyond the scope of what the plan assigns.** Do not refactor code that was not part of the plan. Do not add features, helpers, or "improvements" that were not declared. This must NEVER occur.
- **The only exception:** low-level verification confirms something drastically different from what the plan expected — a file doesn't exist, an API shape is wrong, a table is missing. Even then, you do not silently fix it.
- **If you discover something that needs modification outside the plan's scope,** you MUST introduce the issue to your human partner and receive confirmation before modifying it. No exceptions.
- **If the plan says to do X, do X.** Not X-plus-a-little-cleanup. Not X-but-I-also-noticed-Y. Just X.

### Contract Fidelity

The plan's locked manifest, locked decisions, frozen seam contracts, and completion criteria are binding. They are not suggestions. They are not guidelines. They are the contract you execute against.

- A trace span named `storage.upload.reserve` in the plan cannot become `upload.storage.reserve` in the code. That is a contract violation, not an implementation detail.
- An endpoint declared as `GET /admin/storage/policy` cannot become `GET /api/admin/storage-policy`. The plan locked it.
- A component count of `3` in the locked inventory means `3`. Not `4` because you added a helper. Not `2` because you combined two.

### Drift Is Not Innovation

If you find yourself thinking "the plan says X but Y would be better" — stop. You are not authorized to make that call during execution. Raise it, get confirmation, then proceed. The plan was investigated, written, evaluated, and approved. It earned the benefit of the doubt.

---

## Process

### Phase 0: Contract Internalization

Before writing any code, extract and internalize the contract from the approved plan.

1. **Read the full plan.** Not just the tasks — the entire document including manifest, locked sections, and completion criteria.

2. **Extract the contract elements:**
   - Manifest: Platform API, Observability, Database Migrations, Edge Functions, Frontend Surface Area
   - Locked decisions (if present)
   - Locked acceptance contract (if present)
   - Locked inventory counts (if present)
   - Locked file inventory (if present)
   - Frozen seam contracts (if present)
   - Completion criteria

3. **Build your tracking ledger.** Initialize a manifest tracker using TodoWrite or inline:

   ```
   ## Contract Tracking Ledger

   ### Manifest Progress
   Platform API:     0/N endpoints
   Observability:    0/N items
   Database:         0/N migrations
   Edge Functions:   0/0 (zero-case)
   Frontend:         0/N components, 0/M modified files

   ### Inventory Counts (plan vs. actual)
   New files:        0/N
   Modified files:   0/M
   New test modules: 0/T

   ### Locked Decisions: [list from plan]
   ### Completion Criteria: [list from plan]
   ```

4. **If you cannot restate the contract, you are not ready to execute.** Re-read the plan.

5. **If you have concerns about the plan,** raise them now — before writing code. This is your last chance to flag issues cheaply.

### Phase 1: Execute Task Batch

**Default: First 3 tasks** (unless your partner specifies a different batch size).

For each task:

1. **Mark as in_progress** in your todo tracker.
2. **Check locked decision alignment.** Before implementing anything that touches a locked product decision, frozen seam, or explicit risk boundary — verify the task's instructions match the lock.
3. **Execute each step exactly as written.** The plan has bite-sized steps. Follow them.
4. **Run verifications as specified.** Do not skip test commands or expected output checks.
5. **Update the tracking ledger.** Record which manifest items were built, which files were created/modified.
6. **Collect evidence.** Save test output, note files touched, record verification results.
7. **Mark as completed.**

**During execution, if you encounter:**

| Situation | Action |
|-----------|--------|
| File doesn't exist where plan says it should | Phase 3: Drift Detection |
| Desire to refactor nearby code | **STOP. Out of scope.** |
| API shape differs from plan's assumption | Phase 3: Drift Detection |
| Opportunity to "improve" something not in plan | **STOP. Out of scope.** |
| Test failure you can't resolve | Escalate to `comprehensive-systematic-debugging` |
| Something outside scope needs modification | **STOP. Introduce issue to partner. Wait for confirmation.** |

### Phase 2: Checkpoint Report

When batch completes, report with contract awareness — not just "here's what I did":

```markdown
## Checkpoint: Tasks [X-Y] Complete

### What Was Implemented
- [task summaries]

### Manifest Progress
Platform API:     2/5 endpoints built
Observability:    3/9 items emitting
Database:         1/2 migrations applied
Frontend:         1/3 new components, 0/2 modified pages

### Inventory Tracking
New files created: 4 (plan declares 6)
Modified files:    2 (plan declares 3)

### Locked Decision Compliance
- [decision]: compliant
- [decision]: compliant

### Drift Detected
- None / [describe any drift encountered and how it was handled]

### Evidence Collected
- Test output: [summary]
- Files created: [list]
- Verifications passed: [list]

Ready for feedback.
```

### Phase 3: Drift Detection

When reality diverges from the plan during execution:

1. **Stop implementation.** Do not push through.

2. **Classify the drift:**

   | Classification | Meaning | Action |
   |---------------|---------|--------|
   | **Minor detail** | Implementable detail differs but contract intent preserved (e.g., helper function name, import path) | Note it, proceed, report at checkpoint |
   | **Plan update required** | A locked contract item needs changing (e.g., endpoint shape wrong, table doesn't exist, mount point changed) | Propose specific amendment, wait for confirmation |
   | **Rethink needed** | Fundamental assumption is wrong (e.g., system of record is different, compatibility seam doesn't work as described) | Stop execution entirely, report findings, wait for plan revision |

3. **Propose a specific amendment** (for plan-update-required):
   - What the plan says
   - What reality shows
   - What should change in the plan
   - Impact on other plan sections (cross-reference check)

4. **Never silently deviate.** If you changed something from what the plan specifies, it must appear in the checkpoint report.

### Phase 4: Pre-Completion Self-Audit

After all tasks are complete, before handing off to finishing:

1. **Manifest check:** Are all declared items accounted for?
   - Every endpoint exists?
   - Every trace/metric/log emits?
   - Every migration applied?
   - Every frontend file exists at declared path?

2. **Inventory count check:** Do actual counts match locked counts?

3. **Locked decision check:** Were all preserved?

4. **Completion criteria check:** Can each criterion be proven true?

5. **Evidence sufficiency check:** Does the collected evidence allow the `evaluating-implemented-plan` skill to do its job?

If any check fails, report the gap before claiming completion.

### Phase 5: Complete Development

After self-audit passes:

- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

---

## When to Stop and Ask

**STOP executing immediately when:**

- A locked contract item cannot be implemented as declared
- A plan assumption is contradicted by reality
- A test fails and you don't understand why
- You want to modify something outside the plan's scope
- Verification reveals something drastically different from expected
- You've attempted 2+ fixes for the same issue without success

**What "stop" means:**

- Do not attempt another fix
- Do not try a workaround
- Do not silently adjust
- Report what you found and wait

## Escalation Protocols

| Situation | Escalation |
|-----------|-----------|
| Bug during execution | Hand off to `comprehensive-systematic-debugging` with task context and plan reference |
| Plan is wrong | Propose amendment with evidence, wait for confirmation |
| Scope creep temptation | Do not implement. Report the observation at checkpoint. |
| Blocked by missing dependency | Distinguish "task ordering issue" from "plan missing a dependency cascade" — report which one |
| Undeclared addition seems necessary | Introduce the need, receive confirmation, only then implement |

---

## Red Flags — STOP and Check Yourself

If you catch yourself thinking:

- "The plan says X but Y would be better" → **You are not authorized to decide this during execution**
- "While I'm here, I should also fix Z" → **Out of scope. Report it, don't fix it.**
- "This is close enough to what the plan says" → **Close enough is a contract violation**
- "I'll add a small helper that the plan didn't mention" → **Out of scope**
- "The plan didn't account for this, I'll handle it" → **Stop. Raise it.**
- "I'll clean this up since I'm touching this file" → **Out of scope**
- "Tests pass, so this is done" → **Run the self-audit first**
- "The plan says 3 components but 4 makes more sense" → **The plan says 3**

**ALL of these mean: STOP. Re-read the plan. Stay within scope.**

## Common Mistakes

- Treating the plan as a suggestion rather than a contract
- Adding "improvements" that weren't in the plan
- Refactoring nearby code while implementing a task
- Silently changing endpoint names, trace names, or file paths from what the plan declared
- Skipping the contract internalization phase and jumping straight to tasks
- Reporting "done" without running the pre-completion self-audit
- Not collecting evidence during execution, making post-implementation evaluation harder
- Continuing past a drift signal instead of stopping and classifying it

## What This Prevents

- Scope creep during execution
- Silent contract violations
- Undeclared additions that confuse post-implementation evaluation
- Drift from locked decisions that were investigated and approved for a reason
- Missing manifest items discovered only after "completion"
- Evaluators receiving work with no evidence trail
- The implementer substituting their judgment for the plan author's approved decisions

---

## Integration

**This skill can be used with:**

- **Batched human-in-loop execution** — execute tasks in batches, human reviews between batches (this skill's default mode)
- **superpowers:subagent-driven-development** — subagents execute tasks with review loops; this skill provides the contract-awareness layer on top

**This skill replaces `executing-plans` for any plan that went through the full investigation, evaluation, and approval chain.** Use `executing-plans` only for simple plans without a locked manifest or higher-rigor sections.

## Skill Family

| Skill | Timing | Purpose |
|-------|--------|---------|
| `investigating-and-writing-plan` | Before build | Lock the contract |
| `taking-over-investigation-and-plan` | Handoff/recovery | Verify and re-lock inherited plan |
| `evaluating-plan-before-implementation` | Before execution | Assess completeness and quality |
| **`executing-approved-plans`** | **During build** | **Contract-aware execution with manifest tracking** |
| `evaluating-implemented-plan` | After build | Audit implementation against approved plan |
| `blind-implementation-review` | After build | Plan-agnostic independent assessment |
| `comprehensive-systematic-debugging` | After failure | Root cause including plan-reality divergence |

## Related Skills

- `executing-plans` — the lighter predecessor for simple plans without locked contracts.
- `subagent-driven-development` — can sit on top of this skill's contract-awareness for subagent-per-task execution.
- `verification-before-completion` — the self-audit phase incorporates this skill's discipline.
