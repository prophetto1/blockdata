---
name: blind-implementation-review
description: >
  Use when you need an independent, plan-agnostic assessment of recently implemented work — the reviewer
  comes in cold with no spec, no plan file, and no prior context. They must reconstruct what was built
  from the code itself and form their own engineering judgment about whether it's correct, safe, and solid.
  This is the counterweight to the plan-driven skill chain (investigating-and-writing-plan,
  evaluating-implemented-plan, comprehensive-systematic-debugging) — those skills treat the plan as the
  source of truth; this skill deliberately ignores it. Trigger when the user says things like: "review this
  implementation", "look at what was built on this branch", "do a cold review", "tell me what you think
  of this code", "is this implementation solid", "go in blind and assess this", or any situation where
  independent technical judgment is needed without reference to a specification. Also trigger when the user
  wants a second opinion that isn't contaminated by the original plan's assumptions.
---

# Blind Implementation Review

## Overview

An independent technical assessment of implemented work, performed without access to the implementation
plan, spec, or requirements document. The reviewer reconstructs what was built from the code itself and
evaluates it on its own engineering merits.

This skill exists as a deliberate counterweight to the plan-driven workflow. The plan-driven chain
(investigating-and-writing-plan → evaluating-implemented-plan → comprehensive-systematic-debugging)
treats the plan as the source of truth. Every skill in that chain asks: "Does reality match the plan?"
That's valuable, but it has a blind spot — the plan is never questioned. If the plan itself was flawed,
the entire chain will faithfully verify compliance with a bad contract.

This skill asks a different question: **"Is what was built any good?"**

The moment a plan is introduced, the reviewer's independent judgment collapses into compliance
checking. They stop seeing the code for what it is and start seeing it through the plan's lens. This
skill prevents that contamination by design.

**Announce at start:** "I'm doing a blind implementation review — no plan, no spec. I'll reconstruct
what was built from the code and form my own assessment."

**CRITICAL RULE:** Do not read, request, or reference the implementation plan at any point during this
review. If the plan file is offered, decline it. If you accidentally encounter it, stop reading
immediately. The value of this review depends entirely on the independence of the assessment.

## When to Use

- After implementation is complete and you want an independent second opinion
- When you want to catch things the plan-driven evaluation would miss
- When you suspect the plan itself may have been flawed
- When a different agent or developer did the implementation and you want fresh eyes
- When you want to verify that the code communicates its own intent clearly
- As a complement to (not replacement for) plan-driven evaluation

## When NOT to Use

- When the goal is to verify compliance with a specific plan — use `evaluating-implemented-plan`
- When debugging a known defect — use `comprehensive-systematic-debugging`
- When you need to write or verify a plan — use `investigating-and-writing-plan`

---

## Phase 1: Discover What Changed

The reviewer starts with nothing. First task: figure out the scope of the work.

### 1.1 — Identify the change boundary

```bash
# What branch are we on? What's the base?
git log --oneline -20
git branch -a

# What files changed relative to main (or whatever the base branch is)?
git diff main --stat
git diff main --name-only
```

Record:
- Total files changed
- Total lines added/removed
- Which directories are touched (this reveals the layers: SQL, backend, frontend, tests, config)

### 1.2 — Read the commit history

```bash
git log main..HEAD --oneline
git log main..HEAD --format="%h %s" --reverse
```

Commit messages are the implementer's own narrative of what they built and in what order. Read them
chronologically. Don't just skim — the sequence reveals the implementation strategy.

### 1.3 — Categorize the changed files

Group the changed files by layer. For a typical full-stack feature, you'll see something like:

| Layer | Files | Example patterns |
|-------|-------|-----------------|
| Database | SQL migrations, schema files | `migrations/`, `*.sql` |
| Backend | API routes, services, models | `routes/`, `services/`, `models/`, `*.py` |
| Frontend | Pages, components, hooks, services | `pages/`, `components/`, `hooks/`, `lib/`, `*.tsx` |
| Tests | Test files for any layer | `tests/`, `*.test.*`, `*.spec.*` |
| Config | Environment, build, deploy | `.env*`, `docker*`, `*.config.*`, CI files |
| Types/Contracts | Shared types, API contracts | `types/`, `*.d.ts`, schema definitions |

This categorization tells you the shape of the feature before you read a single line of code.

---

## Phase 2: Reconstruct Intent

Before evaluating quality, understand what was built. The reviewer must form their own mental model
from the code alone.

### 2.1 — Write a one-paragraph summary

After reading the diff, commit messages, and file groupings, write down in your own words:

> "This implementation appears to [do what]. It adds [data layer changes], exposes [API surface],
> and provides [frontend surface] for [user-facing purpose]."

This is the **intent reconstruction**. It's the reviewer's independent understanding, not a
compliance check. If the implementer were to read this summary and say "no, that's not what it does,"
that itself is a finding — the code failed to communicate its purpose.

### 2.2 — Map the data flow

Trace how data moves through the system for the primary use case:

```
User action → Frontend component → API call → Backend route → Database operation
                                                      ↓
Database result → Backend response → Frontend state → UI update
```

Identify every boundary crossing. Each one is a potential failure point and a place where contracts
can break.

### 2.3 — Identify the key behaviors

List the 3-7 most important things this feature does from a user's perspective:

- "A user can [action] and sees [result]"
- "An admin can [action] which causes [effect]"
- "When [condition], the system [behavior]"

These become your test targets in Phase 4.

---

## Phase 3: Layer-by-Layer Code Assessment

Now evaluate the implementation quality at each layer. Work bottom-up: data first, then backend,
then frontend. Problems at lower layers cascade upward.

### 3.1 — Data layer

Read every migration and schema change. Ask:

- **Correctness:** Are column types appropriate? Are constraints present (NOT NULL, UNIQUE, FK, CHECK)?
  Are defaults sensible?
- **Safety:** Does this migration handle existing data correctly? Could it fail on a populated table?
  Is it reversible?
- **Indexes:** Are there indexes on columns that will be queried or joined? Will this be slow at scale?
- **Policies:** If RLS or access policies exist, are they correct? Do they leak data across users?
- **Naming:** Are table and column names consistent with the rest of the schema?

If there are stored procedures, RPCs, or triggers:
- Do they do what their name suggests?
- Are they safe against concurrent execution?
- Do they handle edge cases (null inputs, empty sets, zero values)?

### 3.2 — Backend

Read every new or modified route, service, and model. Ask:

- **Auth:** Is every endpoint properly authenticated? Are admin-only routes actually restricted?
  Could a regular user hit an admin endpoint?
- **Input validation:** Is every user-supplied value validated before use? Are types enforced?
  What happens with missing fields, wrong types, or malicious input?
- **Error handling:** What happens when things fail? Are errors caught and returned with useful
  messages? Or do they bubble up as 500s with stack traces?
- **Data access:** Does the backend query the right tables? Are queries efficient? Is there
  N+1 query risk? Are results properly scoped to the authenticated user?
- **Response shape:** Are responses consistent with each other and with what the frontend expects?
  Are there fields that are always null, or fields missing that the frontend needs?
- **Side effects:** Does this endpoint modify data it shouldn't? Are writes properly transactional?
  Could partial failure leave the system in a bad state?
- **Edge cases:** What happens with empty inputs, zero-length strings, very large payloads,
  duplicate requests, concurrent requests?

### 3.3 — Frontend

Read every new or modified page, component, hook, and service. Ask:

- **Rendering:** Does the component handle all states — loading, empty, error, populated, edge cases?
  Or does it only handle the happy path?
- **API integration:** Is it calling the right endpoints with the right shapes? Does it handle API
  errors gracefully? What does the user see when the backend returns an error?
- **State management:** Is state managed at the right level? Is there stale state risk? Are
  optimistic updates handled correctly (or avoided)?
- **User experience:** Are loading indicators present? Can the user accidentally submit twice?
  Are form validations client-side and server-side consistent?
- **Accessibility basics:** Are interactive elements keyboard-accessible? Do images have alt text?
  Are form labels associated with inputs?

### 3.4 — Tests

Read the test files. Ask:

- **Coverage of intent:** Do tests cover the key behaviors identified in Phase 2? Or do they
  only test trivial cases?
- **Edge cases:** Are error paths tested? Empty states? Boundary conditions? Auth failures?
- **Independence:** Do tests depend on each other or on shared mutable state? Could they pass
  individually but fail together?
- **Realism:** Do tests use realistic data, or do they use mocks so aggressively that they test
  the mock, not the code?
- **Missing tests:** What important behavior has NO test? This is often more revealing than what
  is tested.

---

## Phase 4: Functional Verification

Don't just read the code — run it. Static analysis catches structural issues; running the code
catches behavioral ones.

### 4.1 — Run existing tests

```bash
# Run the project's test suite — look for the right command in package.json, Makefile, etc.
# Backend tests
# Frontend tests
# Integration tests if they exist
```

Record: How many pass? How many fail? Are there any skipped tests? Are there any tests that
existed before this work that now fail (regressions)?

### 4.2 — Exercise the feature manually

If possible, spin up the dev environment and walk through the key behaviors from Phase 2:

- Try the happy path end-to-end
- Try submitting with missing or invalid data
- Try accessing something you shouldn't have access to
- Try the feature in an empty state (no data yet)
- Try the feature with pre-existing data
- Check what happens if you do the same action twice

### 4.3 — Check the database directly

After exercising the feature:

- Did the expected rows get created?
- Are values what you'd expect?
- Are foreign keys intact?
- Did any unexpected tables get written to?

### 4.4 — Check logs and errors

While exercising the feature:

- Are there any console errors (frontend)?
- Are there any server errors or warnings (backend)?
- If observability exists, are traces and metrics emitting?
- Are there any silent failures (things that should work but don't, with no error)?

---

## Phase 5: Cross-Cutting Concerns

These issues span all layers and are frequently missed in plan-driven reviews because they
often aren't part of the plan's contract.

### 5.1 — Security

- **Auth boundaries:** Can an unauthenticated user reach authenticated endpoints? Can a regular
  user reach admin endpoints?
- **Data isolation:** Can User A see User B's data? Are all queries properly scoped?
- **Injection:** Are SQL queries parameterized? Is user input sanitized before rendering?
- **Secrets:** Are any API keys, tokens, or credentials hardcoded or logged?
- **Dependency risk:** Do any new dependencies have known vulnerabilities?

### 5.2 — Error resilience

- **Graceful degradation:** If a downstream service fails, does the whole feature break or does
  it degrade gracefully?
- **Partial failure:** If a multi-step operation fails midway, is the system left in a consistent
  state?
- **Retry safety:** If a request is retried (network glitch, user double-click), does it cause
  duplicate data or corruption?

### 5.3 — Codebase coherence

- **Pattern consistency:** Does the new code follow the same patterns as the rest of the codebase?
  Same file organization, same naming conventions, same error handling approach? Or does it
  introduce a "second way" of doing something that already has an established convention?
- **Dependency hygiene:** Are new dependencies justified? Do they duplicate functionality that
  already exists in the project?
- **Dead code:** Is there commented-out code, unused imports, or unreachable branches?

### 5.4 — Observability

- **Can you debug this in production?** If something goes wrong with this feature after deploy,
  do you have enough visibility (logs, traces, metrics) to diagnose the problem without
  adding more instrumentation?
- **Are errors visible?** If an operation fails silently, would anyone notice?

---

## Phase 6: Produce the Review

The output should be direct, opinionated, and actionable. The reviewer is giving their independent
engineering judgment, not checking boxes.

### Required Output Sections

#### What Was Built

The reviewer's own reconstruction (from Phase 2). This proves the reviewer understood the
implementation independently. 2-4 sentences.

#### What Works Well

Specific things the implementation does right. Not flattery — genuine engineering positives.
Name concrete examples (file, function, pattern).

#### Findings

Organized by severity. Each finding must name the specific location (file, function, line range)
and explain why it matters.

**Critical** — Must be fixed before this work can be considered done:
- Security vulnerabilities
- Data corruption risk
- Broken core functionality
- Missing auth on sensitive endpoints
- Missing migrations or schema errors that would fail in production

**Significant** — Should be fixed, creates real risk if left:
- Missing error handling on likely failure paths
- Tests that don't cover important behavior
- Performance concerns at expected scale
- State management issues that would cause bugs under real usage
- Inconsistent API contracts between frontend and backend

**Minor** — Worth noting, fix when convenient:
- Naming inconsistencies
- Missing edge case handling for unlikely scenarios
- Code style divergence from codebase conventions
- Documentation gaps

**Observations** — Not problems, but worth the implementer knowing:
- Architectural patterns the reviewer noticed (good or concerning)
- Potential future issues as the feature scales
- Things the reviewer found confusing (could indicate a code clarity problem)

#### Functional Verification Results

What did the reviewer actually run and what happened? Tests, manual exercise, database checks.
Include commands and outcomes.

#### Overall Assessment

One of:

| Assessment | Meaning |
|-----------|---------|
| **Solid** | Works correctly, handles edge cases, follows codebase patterns, no critical findings. Minor findings are acceptable. |
| **Functional but needs hardening** | Core feature works, but has significant findings that create real risk. Should be addressed before shipping. |
| **Incomplete** | Missing important functionality, broken paths, or critical findings that must be resolved. |
| **Needs rethinking** | Fundamental approach has issues that can't be fixed with patches — the architecture or strategy needs reconsideration. |

End with a brief (2-3 sentence) summary of the reviewer's overall impression.

---

## Execution Notes

- **Bottom-up, always.** Data layer → backend → frontend → cross-cutting. Problems at lower layers
  invalidate everything above them.
- **Run the code.** A code-reading-only review misses entire categories of bugs. If you can run
  tests and exercise the feature, do it.
- **Be specific.** "Error handling could be better" is useless. "The `createUpload` handler in
  `storage.py:47` catches all exceptions with a bare `except` and returns 200, masking failures"
  is actionable.
- **Be opinionated.** The value of this review is the reviewer's independent judgment. Don't
  hedge everything with "this might be fine." If something concerns you, say so directly.
- **Don't reconstruct the plan.** If you find yourself thinking "I wonder what the plan said about
  this" — stop. That thought means the review is working. Your job is to evaluate the code, not
  reverse-engineer the spec.
- **Findings are not ranked by frequency, they're ranked by impact.** One critical finding in
  a sea of clean code is still a critical finding.
- **The absence of tests for important behavior is itself a finding.** Don't skip the "missing
  tests" check just because existing tests pass.

## What This Catches That Plan-Driven Reviews Miss

- Security issues the plan didn't specify controls for
- Performance problems the plan didn't anticipate
- Error handling gaps the plan didn't declare
- Architectural choices that are technically "compliant" but wrong
- Codebase pattern violations the plan didn't address
- Edge cases the plan never considered
- Observability gaps the plan didn't require
- Code that is correct per spec but confusing, fragile, or unmaintainable

## Relationship to the Plan-Driven Chain

This skill is not a replacement for the plan-driven workflow. It's the counterweight.

| Skill | Question it answers |
|-------|-------------------|
| `evaluating-implemented-plan` | "Did you build what the plan said?" |
| `blind-implementation-review` | "Is what you built any good?" |

Both questions matter. Use them together for highest confidence. Use this one alone when you
want an uncontaminated second opinion.

## Skill Family

| Skill | Timing | Posture |
|-------|--------|---------|
| `investigating-and-writing-plan` | Before build | Plan-driven: lock the contract |
| `taking-over-investigation-and-plan` | Handoff/recovery | Plan-driven: verify inherited contract |
| `executing-plans` | During build | Plan-driven: follow the contract |
| `evaluating-implemented-plan` | After build | Plan-driven: audit against contract |
| `comprehensive-systematic-debugging` | After failure | Plan-driven: find divergence from contract |
| `blind-implementation-review` | After build | **Plan-agnostic: independent judgment** |
