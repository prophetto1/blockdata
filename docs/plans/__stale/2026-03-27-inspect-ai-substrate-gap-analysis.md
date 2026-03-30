# InspectAI Substrate Gap Analysis

**Goal:** Compare the drafted AGChain runtime/environment contract docs against the local `inspect_ai` repo and identify what should be adopted, wrapped, added, combined, or directionally revised.
**Primary AGChain docs compared:**
- `E:\writing-system\docs\plans\2026-03-27-runtime-and-environment-contract-inventory.md`
- `E:\writing-system\docs\plans\2026-03-27-environment-and-runtime-profile-contract.md`
**External repo examined:** `E:\writing-system\_external\inspect_ai`
**Method:** `repo-investigator` style comparison focused on runtime, task/sample lifecycle, model execution, tools, approvals, sandboxes, logging, transcripts, and tracing.
**Date:** 2026-03-27

## Bottom Line

`inspect_ai` is a strong execution substrate for evaluation runs. It already provides the right kind of machinery for:

- eval orchestration
- task/sample abstractions
- solver composition
- model roles
- tool execution
- approval policies
- MCP integration
- sandbox lifecycle
- eval logs, transcripts, and traces

But it does **not** supply AGChain's benchmark-specific contract. It does not natively define:

- payload admission semantics
- staged message windows
- carry-forward rules
- EU-specific state sanitization
- canonical admissibility proofs
- sealed bundle semantics
- AGChain's candidate/judge separation rules

So the correct direction is:

- keep AGChain's flat contract as the primary semantic contract
- treat InspectAI as the preferred wrapped substrate for execution mechanics
- tighten the AGChain contract in a few places so the InspectAI boundary is explicit enough to implement cleanly

## Compatibility Assessment

**Fit:** Adoptable with effort
**Migration / integration effort:** Moderate

This is not a drop-in replacement for AGChain runtime semantics. It is, however, a very good substrate for the parts of the system that are generic evaluation infrastructure rather than benchmark semantics.

## What InspectAI Already Gives Us

The repo exposes the core surfaces AGChain would otherwise need to build itself:

1. **Eval orchestration**
   - `inspect_ai._eval.eval` exposes `eval(...)` with `model_roles`, `sandbox`, `approval`, `trace`, `log_format`, and concurrency controls.

2. **Task/sample lifecycle**
   - `inspect_ai` has first-class task and sample execution primitives, dataset loading, epochs, retries, limits, and scorer flows.

3. **Solver pipeline**
   - `inspect_ai.solver._solver` defines composable solver execution.
   - `inspect_ai.solver._task_state` defines the mutable per-sample state object.

4. **Model execution and model roles**
   - `inspect_ai.model` supports named model roles and provider execution.
   - The scorer stack also supports model-graded flows using explicit model roles.

5. **Tool execution and approvals**
   - `inspect_ai.approval._policy` supports approval chains by tool glob and approver config.
   - Tool calls can be auto-approved, human-approved, modified, rejected, escalated, or terminated.

6. **MCP integration**
   - `inspect_ai.tool._mcp` supports local and remote MCP servers, tool filtering, and transport configuration.

7. **Sandbox lifecycle**
   - InspectAI has task/sample/eval-level sandbox binding, Docker-backed sandboxing, and cleanup controls.

8. **Logging, transcript, and trace surfaces**
   - `inspect_ai.log._log` models eval logs and config.
   - `inspect_ai.log._transcript` and solver transcript support event-level execution traces.
   - Native log formats include `.eval` and `.json`.

## What AGChain Must Keep Owning

These should remain AGChain-owned even if execution runs on InspectAI:

1. **Payload admission**
   - InspectAI approval policies govern tool calls, not benchmark payload visibility.
   - AGChain still needs the explicit `inject_payloads` / admitted-by-step contract.

2. **Structured message windows**
   - AGChain's `ENV`, `ANCHOR_PACK`, `EVIDENCE_PACK`, `CARRY_FORWARD`, `TASK`, and `OUTPUT_GUARD` windows are benchmark semantics, not generic solver semantics.

3. **Candidate/judge isolation**
   - InspectAI supports model roles, but AGChain still needs to define exactly what the candidate sees versus what the judge sees.

4. **State sanitization**
   - InspectAI `TaskState` and store are mutable runtime state.
   - AGChain still needs its own sanitized `candidate_state` contract and carry-forward restrictions.

5. **Canonical audit proof**
   - InspectAI logs and transcripts are useful supporting evidence.
   - AGChain `audit_log.jsonl` must remain the canonical admissibility proof surface.

6. **Bundle sealing and artifact contract**
   - Sealed bundle, manifest, signatures, RP/EU packaging, and runtime payload inventory remain AGChain concerns.

## Where The Current Drafts Are Strong

## 1. Flat inventory doc

`2026-03-27-runtime-and-environment-contract-inventory.md` is directionally stronger as the primary contract because it already locks:

- AGChain ownership over payload admission
- AGChain ownership over structured message windows
- AGChain ownership over canonical audit/provenance
- InspectAI as substrate rather than semantic owner
- explicit zero-cases for API, DB, frontend, and edge functions

This is the right primary contract shape for implementation.

## 2. Profile contract doc

`2026-03-27-environment-and-runtime-profile-contract.md` is still useful, but more as:

- a secondary modeling layer
- a possible config schema draft
- an appendix for selectable runtime modes

It should not outrank the flat inventory doc.

## What Should Be Added To The Flat Inventory

The flat inventory is the right base, but it is still missing or under-specifying several InspectAI-relevant seams that matter for implementation.

### 1. Add an explicit `Eval Runtime Config` item

The current flat list should explicitly define the wrapped runtime config surface that AGChain passes into InspectAI. It should include:

- `model`
- `model_roles`
- `approval`
- `sandbox`
- `sandbox_cleanup`
- `log_format`
- `trace` or conversation display mode
- `message_limit`
- `token_limit`
- `cost_limit`
- `time_limit`
- `working_limit`
- `max_sandboxes`

Reason: InspectAI clearly exposes these as runtime controls, and AGChain needs an explicit statement of which ones are allowed, required, or forbidden per benchmark run.

### 2. Add an explicit `Approval Policy` item

The current flat list mentions approval only at a high level. It should define:

- approval policy as tool-call governance only
- approval policy as distinct from payload admission
- default no-tools / no-approval baseline
- allowed future approval decisions
- which tool families can be gated by approval

Reason: without this, implementers may incorrectly conflate tool approval with payload safety.

### 3. Add an explicit `Sandbox Binding` item

The current flat list mentions sandbox lifecycle, but it should say more concretely:

- whether sandboxing is bound per run, per task, or per sample
- whether Legal-10 baseline uses no sandbox
- when sandbox-backed tools are permitted
- whether network access is allowed
- cleanup expectations

Reason: InspectAI supports multiple sandbox-binding levels and defaults that are broader than AGChain's current benchmark contract.

### 4. Add an explicit `Supporting Execution Logs` item

The flat inventory should distinguish:

- AGChain canonical `audit_log.jsonl`
- InspectAI eval log
- InspectAI transcript
- InspectAI trace log

Reason: these are not interchangeable. Right now the doc says Inspect logs are supporting evidence, but the artifact classes should be named separately.

### 5. Add an explicit `Tool Selection and MCP Selection` item

The flat inventory should define:

- no-tools baseline
- standard local tools
- MCP tool selection by explicit allowlist
- remote MCP default-off unless explicitly permitted

Reason: InspectAI supports both local and remote MCP execution. That is a meaningful contract boundary and currently needs a clearer AGChain stance.

### 6. Add an explicit `Runtime Limits` item

The current drafts talk about constraints, but the flat inventory should lock which limits are benchmark-valid:

- token limit
- message limit
- time limit
- working time limit
- cost limit
- retry behavior
- fail-on-error behavior

Reason: these are native InspectAI controls and should not be left implicit.

## What Should Be Added To The Profile Contract If It Is Kept

If the profile contract remains in the repo, it should be revised rather than deleted.

### Keep

- session strategy
- state provider
- tool strategy
- sandbox presence
- constraints block

### Add

- explicit mapping to wrapped InspectAI runtime fields
- explicit statement that approval policy is not payload admission
- explicit statement that logs/transcripts/traces are supporting evidence only
- explicit `remote_mcp: off | allowed` flag
- explicit limits block aligned to InspectAI runtime controls

### Remove or downgrade

- any implication that the profile abstraction is the primary contract

The profile doc should be secondary to the flat inventory, not a competing authority.

## What Should Be Combined

The right combination strategy is:

1. keep the flat inventory doc as the primary authority
2. salvage only the useful config-oriented parts of the profile contract
3. merge those useful parts into either:
   - an appendix in the flat inventory doc, or
   - a short companion config-schema doc

The specific pieces worth carrying forward from the profile contract are:

- the `Composed Profile Object`
- the constraints block
- the capability mapping table

Everything else that duplicates the flat inventory should be treated as secondary.

## What Should Not Be Combined

These things should stay clearly separate:

1. **Payload admission** vs **approval policy**
2. **AGChain audit proof** vs **InspectAI eval logs**
3. **Candidate-visible carry-forward** vs **generic task state / store**
4. **benchmark semantics** vs **execution substrate mechanics**

If those are merged conceptually, implementation drift is likely.

## Directional Edits Recommended Now

### Edit 1: Promote the flat inventory doc

Direction:
- make `2026-03-27-runtime-and-environment-contract-inventory.md` the primary contract

Why:
- it better matches the actual implementation boundary with InspectAI
- it avoids premature taxonomy
- it locks ownership more clearly

### Edit 2: Revise the flat inventory doc with six additional items

Add rows or short subsections for:

- Eval Runtime Config
- Approval Policy
- Sandbox Binding
- Supporting Execution Logs
- Tool Selection and MCP Selection
- Runtime Limits

### Edit 3: Downgrade the profile contract doc to secondary status

Direction:
- mark it as a modeling companion or draft schema, not the primary authority

Why:
- it is useful for configuration shape
- it is weaker as a semantic contract

### Edit 4: Explicitly default remote MCP to out of scope

Direction:
- state that remote MCP is default-off and not part of the active Legal-10 baseline

Why:
- InspectAI supports remote MCP
- remote execution materially changes the trust and no-leak model

### Edit 5: Add a direct AGChain-to-InspectAI wrapper boundary section

The docs should explicitly name the wrapper seam:

- AGChain builds sealed artifacts and runtime staging
- AGChain assembles admitted message windows
- AGChain chooses candidate/judge role mapping
- AGChain resolves allowed runtime config
- InspectAI executes model/tool/sandbox/eval mechanics
- AGChain records canonical admissibility proof

## Recommended Integration Boundary

Use InspectAI for:

- `eval()` orchestration
- task/sample execution
- solver composition
- model resolution and roles
- tool execution
- approval chains
- MCP transport
- sandbox setup/cleanup
- supporting logs, transcripts, and traces

Do not delegate these to InspectAI:

- payload admission
- staged message window construction
- candidate state sanitization
- carry-forward semantics
- judge visibility rules
- canonical AGChain audit proof
- bundle sealing / manifest / signature semantics

## Practical Direction For The Next Revision

If only one doc is going to be revised next, revise:

- `E:\writing-system\docs\plans\2026-03-27-runtime-and-environment-contract-inventory.md`

And revise it by:

1. adding the missing InspectAI-facing runtime control items
2. clarifying that approval is tool governance, not data admission
3. separating supporting execution logs from canonical AGChain audit proof
4. explicitly defaulting remote MCP and networked sandbox modes out of scope unless later enabled by contract

## Final Assessment

The current draft direction is mostly right.

The main correction is not architectural replacement. It is contract sharpening.

AGChain should not become a thin wrapper around InspectAI. It should become:

- a benchmark-semantic runtime contract
- plus a disciplined wrapper over InspectAI's execution substrate

That is the cleanest alignment between the drafted docs and the actual `inspect_ai` repo.
