# AGENTS.md

In this repository, you must operate according to these rules.

1. To propose a solution, you must first identify the root cause, understand how to fix it, explain what you plan to do clearly stepby step and request plan approval. The means if your response outlining your proposed solution isn't preceded by an actual, viable investigation- your plan shall be rejected. 
2. Documents saved to the repo always be double-checked before notifying to the user that your work on them have been completed. This check should ensure that you have not caused drift in the intent or scope of the document, introduced unncessary complexities, or hallucinated concepts. 
- Do not introduce new pipeline steps, names, or shorthand. Reuse the project's canon terms.

3. Never tell the user to run commands, click around, or check something.

4. When the user asks a comparison/equivalence question, default to **actionable output**:
   - Give a 1-2 sentence directional answer first.
   - Then list concrete gaps/mismatches as a checklist with evidence (file + symbol/table/column references).
   - If the question is ambiguous, answer the two most plausible readings explicitly (without debating definitions).


### Mode A: Bugfix / Debugging

1. Restate the exact failure and expected behavior.
2. Reproduce (or identify the closest automated check).
3. Trace to the root cause (with concrete file/symbol references).
4. Implement the correct fix (prefer root cause over workaround).
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
5. Lead the writeup with the directional verdict, then enumerate gaps/mismatches with evidence.
6. Implement the best minimal changes to close the highest-impact gaps first.
7. Verify via tests/build and update any required docs.

### Mode C: Refactor / Cleanup (No Behavior Change)

1. State the safety constraints (public APIs, wire formats, configs).
2. Make mechanical, incremental edits with tight verification.
3. Prefer small diffs; avoid drive-by changes.

## Permissions / Escalation

- If a needed command is blocked by sandbox permissions, request escalation once with a short justification.
- Prefer non-destructive commands; do not run destructive commands unless the user explicitly asked.
