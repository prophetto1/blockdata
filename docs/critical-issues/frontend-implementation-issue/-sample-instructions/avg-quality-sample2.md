You are starting the actual frontend design process for an already approved implementation plan.

Inputs:
- Approved implementation plan: [PASTE PATH]
- Repo root: [PASTE PATH]
- Target route/surface: [PASTE ROUTE OR FILE]
- Current implementation files: inspect them directly before proposing changes

Core rule:
Treat the approved implementation plan as a contract. Do not change, weaken, reinterpret, or expand any locked backend/API/database/edge-function contract. Preserve all locked entities, states, transitions, metadata, and scope boundaries exactly as approved.

Frontend-first design law:
Persistent structure first. Placeholder content second. Live data last.
Data may be conditional. Pane identity may not be conditional.

That means:
- If the plan already defines panes, sections, states, controls, metadata, and workflow areas, render their visual structure now.
- Do not gate whole panes behind selection/data if the pane’s identity is already known.
- Empty states must live inside persistent product-specific scaffolding.

Required workflow:
1. Read the approved plan fully and extract:
   - locked backend contracts and out-of-scope boundaries
   - locked frontend layout/section/state/action/metadata contracts
   - required user-visible surfaces
2. Inspect current implementation and existing design system sources in this order:
   - existing tokens/themes/contracts
   - existing component libraries
   - existing layout/workbench/pane patterns
   - existing editor/document surfaces
   - existing verification patterns
3. Default to reuse:
   - prefer existing tokens over raw CSS values
   - prefer existing components over custom markup
   - prefer existing layout/pane patterns over freestyle HTML/CSS
   - only introduce new structure when required by the approved plan
4. Validate visually with Playwright before claiming the design is locked.

Output rules:
- First output a “Design Outputs / Deliverables Plan” in 3-5 phases depending on scope size.
- Then immediately start Phase 1 and produce actual design deliverables. Do not stop after planning.
- Communication must be direct, implementation-ready, and structured for handoff.

Deliverables Phase 1 must include actual outputs such as:
- frontend structural contract
- pane-by-pane wireframe/spec
- component/token/pattern reuse inventory
- placeholder-state contract
- disabled/enabled control contract
- visual verification checklist

Design requirements to enforce:
- adherence to existing tokens/contracts/component libraries
- no backend contract changes
- no generic shell-only output
- no pane collapse into generic empty states
- clear product-specific scaffolding visible at page load
- center pane must read as a real document/editor workspace
- right pane must read as a real metadata/workflow inspector
- left pane must read as the actual navigator for this product

Verification requirements:
- include Playwright-based visual checks for no-selection, placeholder, and selected states
- confirm the page could not plausibly be mistaken for a different feature

Start now by:
1. extracting the locked contract from the approved plan
2. producing the phased design deliverables plan
3. immediately executing Phase 1 with real design outputs
