# Platform — Runtime Engine & Runner Specifications

Specifications for the runtime infrastructure that executes evaluation chains.
Covers: state management, staging/isolation, message assembly, audit, orchestration.

## Reading Order

For the 3-step MVP runner, read in this order:

1. `inter-step-requirements.md` — **95 numbered requirements** (IS-1.1.1 through IS-7.3.7). Densest requirements document. Covers state management, payload admission, staging/isolation, message assembly, audit, orchestration, post-chain operations.
2. `pdrunner-inspect-ai.md` — **40 requirements** (R1.1 through R8.4). Runner architecture spec based on Inspect AI integration pattern.
3. `statefulness-context-persistence.md` — State providers (Type 0-III), isolation invariant, session strategies (Replay_Full vs Replay_Minimal).
4. `prompt-messages.md` — Fenced window format (`<<<BEGIN_{NAME}>>>...<<<END_{NAME}>>>`), window ordering (ENV → ANCHOR_PACK → EVIDENCE_PACK → CARRY_FORWARD → TASK → OUTPUT_GUARD), system message spec.
5. `prompts-v1.0.md` — Concrete prompt templates version 1.0.

## Concern Overlap Warning

These documents were written at different stages and **overlap significantly**:

| Concern | inter-step-requirements | pdrunner | statefulness | prompt-messages |
|---------|------------------------|----------|-------------|-----------------|
| State management | IS-1.x | R4.x | Full doc | — |
| Payload admission | IS-2.x | R3.x | — | — |
| Staging/isolation | IS-3.x | R2.x | — | — |
| Message assembly | IS-4.x | R5.x | — | Full doc |
| Audit | IS-5.x | R7.x | — | — |
| Orchestration | IS-6.x | R1.x | — | — |
| Post-chain | IS-7.x | R6.x | — | — |

When requirements conflict, **inter-step-requirements.md** takes precedence (most recent, most granular).

## Source Code Mapping

| Concern | Implementation |
|---------|---------------|
| State management | `runspecs/3-STEP-RUN/runtime/state.py` |
| Payload admission | `runspecs/3-STEP-RUN/runtime/payload_gate.py` |
| Staging/isolation | `runspecs/3-STEP-RUN/runtime/staging.py` |
| Message assembly | `runspecs/3-STEP-RUN/runtime/input_assembler.py` |
| Audit | `runspecs/3-STEP-RUN/runtime/audit.py` |
| Orchestration | `runspecs/3-STEP-RUN/run_3s.py` |
| Model adapters | `runspecs/3-STEP-RUN/adapters/model_adapter.py` |

## Not in This Folder

- Langfuse integration (`langfuse-integration.md`) — observability/tracing, not core runner. Included here for proximity but not required for MVP.
