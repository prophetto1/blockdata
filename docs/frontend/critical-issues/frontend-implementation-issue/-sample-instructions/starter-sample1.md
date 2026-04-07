You are executing a frontend structural contract lock pass for a development that already has an approved implementation plan.

Your job is NOT to change backend contracts, expand scope, or reinterpret product requirements.
Your job IS to extract the frontend design contract from the approved implementation plan and materialize it into concrete, implementation-ready frontend outputs.

CORE RULES

1. Backend/workflow contracts are already locked.
   - Do not modify states, entities, metadata contracts, workflow transitions, API contracts, storage contracts, or scope boundaries.
   - If something appears unclear, preserve the approved contract and make the frontend express it more clearly; do not invent new backend behavior.

2. Reuse-first is mandatory.
   Before creating any new UI structure, you must explicitly check:
   - existing design tokens
   - existing shared UI components
   - existing layout/workbench primitives
   - existing editor surfaces
   - existing interaction patterns already present in the codebase
   Default to reusing or adapting those assets.
   Do NOT freestyle raw HTML/CSS unless you have first documented why existing primitives are insufficient.

3. Persistent pane scaffolds are mandatory.
   The product identity of the page must be visible on first load.
   - Conditional content is allowed.
   - Conditional pane identity is NOT allowed.
   Empty states must live inside persistent product-specific scaffolds, not replace them.

4. Placeholder-mode first.
   The first frontend deliverable must be a visually specific placeholder-mode implementation:
   - real page structure
   - real section headers
   - real dividers/cards/frames
   - disabled controls where appropriate
   - placeholder values/chips/rows where live data is not yet wired
   The page must already read unmistakably as the intended product before backend data is integrated.

5. Visual verification is required.
   You must define Playwright-based visual checks for:
   - first load / no selection
   - selected item state
   - disabled workflow state
   - populated workflow state
   Your goal is to verify structural invariants, not just runtime correctness.

WHAT YOU MUST PRODUCE

First, output a short “Design Output / Deliverables Plan” broken into 3–5 phases depending on scope.
Each phase must be concrete and execution-oriented.
Prefer this shape unless the feature clearly needs adjustment:

Phase 1 — Contract extraction and reuse audit
Phase 2 — Persistent scaffold / placeholder-mode composition
Phase 3 — Component-level refinement and interaction framing
Phase 4 — Visual verification and structural corrections
Phase 5 — Optional semantic/data wiring only if explicitly requested and still within approved scope

Then IMMEDIATELY begin Phase 1 in the same response.

PHASE 1 REQUIREMENTS

In Phase 1, you must:
- analyze the approved implementation plan
- extract the frontend design contract from it
- identify the page layout, pane purposes, section order, visible metadata fields, visible controls, and state-driven UI behaviors
- identify which existing tokens/components/layout primitives/editor surfaces should be reused
- identify which new frontend components, if any, are actually necessary
- explicitly note any current implementation mismatch between the approved contract and the current UI shape
- do all of this without changing backend requirements

PHASE 1 OUTPUT FORMAT

Output these sections in order:

1. Frontend Contract Summary
   - page purpose
   - page layout
   - panes and their roles
   - always-visible structures
   - conditional inner content

2. Reuse Audit
   - existing tokens to use
   - existing shared components to use
   - existing layout/workbench/editor primitives to use
   - items that must not be reinvented
   - genuinely new components that need to be created

3. Structural UI Contract
   For each pane:
   - what must always be visible
   - what may be placeholder
   - what becomes live later
   - what must never disappear entirely

4. Planned Deliverables for the next phase
   - specific components/files to create or modify
   - exact visual sections to materialize
   - expected placeholder-mode output

IMPORTANT DESIGN PRINCIPLES

- The page must visibly declare itself as the intended product before live data is present.
- The user should understand what the page is on arrival, not only after clicking something.
- Use domain-specific scaffolding early: headers, chips, metadata rows, workflow sections, note/composer framing, editor frame, navigator rows.
- Keep backend integration separate from structural UI expression.
- Do not overbuild final data logic during the placeholder-mode pass.
- Do not hide behind generic empty containers.

FAIL CONDITIONS

Your output is wrong if:
- it proposes changing backend contracts
- it skips the reuse audit
- it starts coding random components before extracting the design contract
- it replaces pane scaffolds with generic empty states
- it produces a page that could plausibly be for any unrelated feature
- it delays visible product structure until backend data exists

Now perform the work:
1. Output the 3–5 phase Design Output / Deliverables Plan.
2. Immediately execute Phase 1 and produce the required Phase 1 sections.
3. Do not stop after planning.