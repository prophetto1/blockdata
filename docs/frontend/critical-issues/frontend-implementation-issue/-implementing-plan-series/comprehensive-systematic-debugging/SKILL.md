---
name: comprehensive-systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes — especially when implementation plan compliance is uncertain
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues. Bugs come from two sources: code defects AND plan-reality divergence — endpoints declared but never built, observability skipped, frontend reading from tables the backend writes differently.

**Core principle:** ALWAYS find root cause before attempting fixes. Root causes include code bugs AND violations of the implementation plan that produced the code. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues
- Frontend-backend mismatches
- Missing or silent observability
- Features that "don't work" despite code looking correct

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue
- The feature was built from an implementation plan (check plan compliance)
- Frontend calls an endpoint that returns 404 or wrong shape
- A trace span or metric you expected to see is missing

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- Manager wants it fixed NOW (systematic is faster than thrashing)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Review the Implementation Plan**

   **WHEN the buggy feature was built from a plan (check `docs/plans/`):**

   Find the plan and check its manifest against reality. Many bugs are plan-reality divergence — something was declared but never built, or built differently than declared.

   Run through the **Plan Compliance Checklist** (see full section below):
   - Platform API: Do declared endpoints exist with correct verb, path, auth, shapes?
   - Observability: Are declared traces, metrics, and logs actually emitting?
   - Database Migrations: Did declared migrations run? Do tables/columns/policies exist?
   - Edge Functions: Are declared functions deployed with correct auth?
   - Frontend Surface Area: Do declared pages, components, hooks, routes exist?

   **If no plan exists:** The absence of a plan is itself a finding. The feature was built without declaring its surface area — scope and integration bugs are likely.

   **Flag every plan-reality divergence as a potential root cause.**

5. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

6. **Trace Data Flow**

   **WHEN error is deep in call stack:**

   See **Escalation Technique: Root Cause Tracing** below. You MUST read `root-cause-tracing.md` before applying.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?

2. **Compare Against References**
   - If implementing pattern, read reference implementation COMPLETELY
   - Don't skim — read every line
   - Understand the pattern fully before applying
   - **Compare against the implementation plan manifest** — does the working code match what was declared? Does the broken code diverge from the plan?

3. **Identify Differences**
   - What's different between working and broken?
   - What's different between plan and reality?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?
   - What does the plan say this depends on — does that dependency exist?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - Ask for help
   - Research more

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - Use the `superpowers:test-driven-development` skill for writing proper failing tests

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring
   - **If the fix adds new endpoints, migrations, components, or observability** → update the implementation plan manifest to reflect reality

3. **Verify Fix**
   - Test passes now?
   - No other tests broken?
   - Issue actually resolved?
   - **Plan compliance still holds?** (fix didn't create new divergence)

4. **If Fix Doesn't Work**
   - STOP
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If ≥ 3: STOP and question the architecture (step 5 below)**
   - DON'T attempt Fix #4 without architectural discussion

5. **If 3+ Fixes Failed: Question Architecture**

   **Pattern indicating architectural problem:**
   - Each fix reveals new shared state/coupling/problem in different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere

   **STOP and question fundamentals:**
   - Is this pattern fundamentally sound?
   - Are we "sticking with it through sheer inertia"?
   - Should we refactor architecture vs. continue fixing symptoms?

   **Discuss with your human partner before attempting more fixes**

   This is NOT a failed hypothesis — this is a wrong architecture.

---

## Plan Compliance Verification

When debugging a feature built from an implementation plan, verify the plan's manifest against reality. Every implementation plan should declare its full surface area per `docs/DRAFTING-NEW-IMPLEMENTATION-PLANS.md`. If any of these are missing or diverge from reality, you have found a likely root cause.

### Platform API

For each endpoint declared in the plan:

| Check | How |
|-------|-----|
| Endpoint exists | Search `services/platform-api/app/api/routes/` for the path |
| Verb matches | GET/POST/PUT/DELETE matches plan declaration |
| Auth requirement matches | Check dependency injection for auth guards |
| Request shape matches | Compare Pydantic model to plan's declared shape |
| Response shape matches | Compare return type to plan's declared shape |
| RPC/table reference correct | Verify the endpoint reads/writes the tables the plan says |

**If the plan says "No platform API changes":** verify the feature truly doesn't need any. A frontend that fetches data without a declared endpoint is a bug waiting to happen.

### Observability

For each trace span, metric, and structured log declared in the plan:

| Check | How |
|-------|-----|
| Trace span exists | Grep for the span name in the codebase |
| Trace span emits | Make a real request and check traces |
| Metric exists | Grep for the metric name |
| Metric emits | Verify with a real request or test |
| Structured log exists | Grep for the log event name |
| Log includes declared fields | Check the log call includes all declared fields (user_id, etc.) |

**If the plan says "No observability":** that itself is suspicious. Why? Was observability intentionally skipped or forgotten? Missing observability means you're debugging blind — no traces, no metrics, no structured logs to tell you what happened.

### Database Migrations

For each migration declared in the plan:

| Check | How |
|-------|-----|
| Migration file exists | Check `supabase/migrations/` for the declared filename |
| Migration ran | Query the database or check migration history |
| Tables/columns exist | Verify the schema matches what was declared |
| Policies exist | Check RLS policies if declared |
| Existing data unaffected | If plan said "no data impact," verify existing rows are intact |

**If the plan says "No database migrations":** verify the feature truly doesn't need schema changes. A feature that writes to a table that doesn't exist is a common plan-reality gap.

### Edge Functions

For each edge function declared in the plan:

| Check | How |
|-------|-----|
| Function exists | Check `supabase/functions/` for the declared function |
| Function is deployed | Verify it's accessible at the expected URL |
| Auth matches | Check auth requirement matches plan declaration |
| Modifications applied | If plan said "extend with X," verify X is present |

**Critical note:** We are moving away from edge functions. If the bug involves an edge function, consider whether it should have been migrated to platform-api. An edge function that should be a FastAPI endpoint is itself a root cause category.

### Frontend Surface Area

For each page, component, hook, library, and modified file declared in the plan:

| Check | How |
|-------|-----|
| Files exist at declared paths | Glob for the exact file paths |
| Routes are registered | Check route configuration for declared paths |
| Components render | Verify they mount without errors |
| Hooks return expected data | Check they connect to the right API/state |
| Modified files have declared changes | Read each modified file, verify the declared change is present |

**Count check:** If the plan says "3 new components," verify exactly 3 exist. Missing components = missing functionality. Extra components = scope creep that may have introduced bugs.

---

## Escalation Techniques

When Phases 1–4 do not resolve the issue, reach for these techniques. Each summary below tells you WHEN to use the technique. **You MUST read the full reference file before applying — the summary is not sufficient.**

### Root Cause Tracing

**When to reach for this:** Bug manifests deep in the call stack. Error happens far from where the bad data originated. Stack trace shows a long call chain. You need to find which code introduced the invalid value.

**Core idea:** Trace backward through the call chain — from symptom to source — asking "what called this with bad data?" at each level until you find the original trigger. Fix at the source, not where the error appears.

**YOU MUST read `root-cause-tracing.md` in this directory before applying this technique.** Do not rely on this summary — it identifies WHEN to use the technique, not HOW. The full file contains the 5-step tracing process, stack trace instrumentation patterns, and the polluter bisection workflow.

### Defense-in-Depth

**When to reach for this:** You found and fixed the root cause, but the bug could recur through a different code path, refactoring, or mocks bypassing your single validation point. You want to make the bug structurally impossible, not just fixed.

**Core idea:** Validate at EVERY layer data passes through — entry point, business logic, environment guards, and debug instrumentation. A single check can be bypassed; four layers make the bug impossible.

**YOU MUST read `defense-in-depth.md` in this directory before applying this technique.** Do not rely on this summary — it identifies WHEN to use the technique, not HOW. The full file contains the four-layer validation model with code examples for each layer.

### Condition-Based Waiting

**When to reach for this:** Tests are flaky — pass sometimes, fail under load or in CI. Tests use arbitrary delays (`setTimeout`, `sleep`, `time.sleep()`). Tests timeout when run in parallel. You're waiting for async operations with guessed timing.

**Core idea:** Wait for the actual condition you care about, not a guess about how long it takes. Poll for the condition with a timeout instead of sleeping for a fixed duration.

**YOU MUST read `condition-based-waiting.md` in this directory before applying this technique.** Do not rely on this summary — it identifies WHEN to use the technique, not HOW. The full file contains the generic polling function, domain-specific helpers, and the distinction between condition waits and justified timeouts. See also `condition-based-waiting-example.ts` for complete working code.

### Find Polluter

**When to reach for this:** Something appears during test runs (files created, state mutated, databases dirtied) but you don't know which test causes it. Tests pass individually but fail when run together. Test order affects results.

**Core idea:** Run tests one-by-one in isolation, checking for the pollution artifact after each. Stop at the first test that creates it.

**YOU MUST read `find-polluter.sh` in this directory before using this tool.** It is a ready-to-use bisection script — run it directly with the pollution artifact and test pattern as arguments.

---

## Red Flags — STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**
- "I don't need to check the plan, I can see the code"
- "The plan is probably outdated anyway"
- "Observability isn't relevant to this bug"
- Skipping plan compliance because "the bug is obviously in the code"

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** Question the architecture (see Phase 4, step 5).

## Your Human Partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" — You assumed without verifying
- "Will it show us...?" — You should have added evidence gathering
- "Stop guessing" — You're proposing fixes without understanding
- "Ultrathink this" — Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) — Your approach isn't working
- "Did you check the plan?" — You skipped plan compliance verification
- "That endpoint doesn't exist" — You didn't verify the manifest

**When you see these:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question pattern, don't fix again. |
| "I don't need to check the plan" | Plan-reality divergence is a top root cause category. Always check. |
| "The plan is outdated, skip it" | An outdated plan that was never updated IS the bug. |
| "Observability isn't related to this bug" | Missing observability means you're debugging blind. Check what's emitting. |
| "The endpoint probably exists" | "Probably" is not evidence. Verify verb, path, auth, and shapes. |
| "The summary is enough, I don't need the full file" | Summaries tell you WHEN. Full files tell you HOW. Read the file. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, review plan, gather evidence, trace data | Understand WHAT, WHY, and whether plan diverged |
| **2. Pattern** | Find working examples, compare against references and plan manifest | Identify code differences and plan-reality gaps |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix root cause, verify, maintain plan compliance | Bug resolved, tests pass, plan still accurate |
| **Escalation** | Root cause tracing, defense-in-depth, condition-based waiting, find polluter | Applied when Phases 1–4 don't resolve |

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

## Related Skills

- **superpowers:test-driven-development** — For creating failing test case (Phase 4, Step 1)
- **superpowers:verification-before-completion** — Verify fix worked before claiming success

## Real-World Impact

From debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common
