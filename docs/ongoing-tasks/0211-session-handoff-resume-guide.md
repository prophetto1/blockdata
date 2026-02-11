# 0211 Session Handoff + Resume Guide

**Date:** 2026-02-11  
**Purpose:** Preserve execution continuity across account/session switches.

---

## 1) Current Truth Snapshot (as of this session)

1. Canonical admin config doc is:
   - `docs/ongoing-tasks/0211-admin-config-registry.md`
2. Duplicate file was removed:
   - `docs/ongoing-tasks/0211-admin-config-registry-and-conflicts.md` (deleted)
3. Core ordered execution queue is:
   - `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
4. Master sequencing gate doc is:
   - `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
5. Assistant work remains deferred until core gates are complete.

---

## 2) Read-First List for Any New Session

Read in this order before making changes:

1. `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
2. `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
3. `docs/ongoing-tasks/0211-admin-config-registry.md`
4. `docs/ongoing-tasks/0211-source-format-reliability-matrix.md`
5. `docs/ongoing-tasks/0211-source-format-smoke-results.md`
6. `docs/ongoing-tasks/0211-worker-token-optimization-patterns.md`
7. `docs/ongoing-tasks/meta-configurator-integration/spec.md`

---

## 3) Immediate Next Work (Do This First)

Current queue says start here:

### Priority 1: Close format reliability gate

1. Add missing smoke fixtures for `pptx` and `xlsx`.
2. Run matrix smoke:
   - `powershell -NoProfile -ExecutionPolicy Bypass -File "scripts/run-format-matrix-smoke.ps1"`
3. Update results in:
   - `docs/ongoing-tasks/0211-source-format-reliability-matrix.md`
   - `docs/ongoing-tasks/0211-source-format-smoke-results.md`
4. Do not move to Priority 2 until all required formats are verified.

---

## 4) Key Engineering Constraints (Do Not Drift)

1. One-at-a-time priority execution only.
2. No assistant/KG/vector/MCP build work until core gates are complete.
3. Preserve canonical terms already in docs:
   - run, block, overlay, prompt_config, staging/confirmed
4. Avoid new duplicate planning docs for the same topic.
5. No destructive git cleanup on unrelated workspace changes.

---

## 5) Known Risks to Watch

1. Worker default mismatch risk:
   - worker fallback temp `0.2` vs UI/DB `0.3`
2. Worker is still Anthropic-specific in runtime path.
3. Hardcoded policy values are spread across worker/UI/DB and need centralization.
4. Existing workspace has many unrelated modified/untracked files; treat carefully.

---

## 6) Recommended Session Startup Checklist

1. `git status --short`
2. Confirm canonical docs exist:
   - `docs/ongoing-tasks/0211-admin-config-registry.md`
   - `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
3. Confirm no stale reference to deleted duplicate file:
   - `rg -n "0211-admin-config-registry-and-conflicts\.md" docs -S`
4. Start Priority 1 execution and write evidence as you go.

---

## 7) Paste-Ready Context Prompt for Next Login

Use this prompt at the start of the next session:

```text
I need you to continue exactly from the current core workflow queue.

Start by reading these files in order:
1) docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md
2) docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md
3) docs/ongoing-tasks/0211-admin-config-registry.md
4) docs/ongoing-tasks/0211-source-format-reliability-matrix.md
5) docs/ongoing-tasks/0211-source-format-smoke-results.md

Constraints:
- Execute one priority at a time.
- Assistant development remains deferred.
- Do not create duplicate planning docs.
- Do not run destructive git cleanup.

Now execute Priority 1 (format reliability gate): add pptx/xlsx fixtures, run scripts/run-format-matrix-smoke.ps1, and update matrix/results docs with evidence.
```

---

## 8) Definition of Continuity Success

A resumed session is on track only if it:

1. Uses the same canonical docs.
2. Continues at Priority 1 (unless explicitly changed).
3. Produces date-stamped evidence updates after each completed step.

