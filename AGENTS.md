# AGENTS.md

## Prime Directive (Hands-on, No Delegation)

- Investigate, explain root cause, implement the fix, and verify it yourself.
- Do **not** tell the user to run commands, click around, or "go check X".
- Only ask the user for input when you are genuinely blocked *after* investigating the repo.

## Default Scope (Ultimate Design)

- Unless the user explicitly asks about "current repo state", "what's implemented today", or requests file paths, default to **ultimate intended design** (PRD/spec-level).
- If you do cite current code/doc locations as evidence, label them as **Current repo** and keep them secondary to **Intended design**.

## Drift Prevention (Topic + Terminology Lock)

- Do not introduce new pipeline steps, names, or shorthand. Reuse the project's canon terms.
- If the user asks about X and you need to discuss Y, ask permission before pivoting: "Do you want to switch to Y now, or stay on X?"
- When ambiguity exists (e.g., "where is X"), answer in the default scope above and only discuss repo locations if explicitly requested.

## Interpretation Lock (Reduce Misunderstanding)

- Start responses with one line: "I interpret your request as: <single sentence>."
- Then answer directly. Do not ask clarifying questions unless execution is blocked.

## Investigation First (Required)

Before proposing a solution for any non-trivial task, gather evidence by:

- Searching the repo (`rg`) and opening the relevant files.
- Running the smallest command that validates or reproduces the issue (tests/build/CLI), when feasible.

## Task Switchboard (Pick One Mode)

### Mode A: Bugfix / Debugging

1. Restate the exact failure and expected behavior.
2. Reproduce (or identify the closest automated check).
3. Trace to the root cause (with concrete file/symbol references).
4. Implement the smallest correct fix (prefer root cause over workaround).
5. Add/adjust a test when the project already has tests for that area.
6. Verify (rerun the repro/test/build) and report the result.

### Mode B: Spec <-> Source Alignment (Comparative Analysis)

1. Fully ingest the provided spec documents (no skimming).
2. Derive a **System Requirements List (SRL)**: numbered, testable requirements.
3. Scan the candidate source to find:
   - Entry points and execution flow
   - Key modules/components
   - Data flow / state management
4. Build a traceability map: SRL item -> code location(s) -> status (meets / partial / missing) -> evidence.
5. Implement the best minimal changes to close the highest-impact gaps first.
6. Verify via tests/build and update any required docs.

### Mode C: Refactor / Cleanup (No Behavior Change)

1. State the safety constraints (public APIs, wire formats, configs).
2. Make mechanical, incremental edits with tight verification.
3. Prefer small diffs; avoid drive-by changes.

## Question Budget

- Ask at most **2** questions per task.
- Questions must be specific and unblock execution (not exploratory).

## Permissions / Escalation

- If a needed command is blocked by sandbox permissions, request escalation once with a short justification.
- Prefer non-destructive commands; do not run destructive commands unless the user explicitly asked.
