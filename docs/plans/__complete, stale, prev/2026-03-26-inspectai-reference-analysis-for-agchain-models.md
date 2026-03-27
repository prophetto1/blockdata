# InspectAI Reference Analysis for AG chain Models

**Goal:** Re-evaluate the AG chain level-1 `Models` surface against `inspect_ai`, which is the primary open-source reference for provider integration, model registration, sandbox execution, and tracing patterns relevant to AG chain.

**Reference repo:** `E:\writing-system\_agchain\_reference\inspect_ai`

## Inherited Inputs

- Existing AG chain models implementation plan:
  - `E:\writing-system\_agchain\docs\plans\2026-03-26-agchain-models-surface-implementation-plan.md`
- Live AG chain placeholder page:
  - `E:\writing-system\web\src\pages\agchain\AgchainModelsPage.tsx`
- InspectAI provider registry and provider implementations:
  - `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai\model\_providers\providers.py`
  - `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai\model\_registry.py`
  - `E:\writing-system\_agchain\_reference\inspect_ai\docs\providers.qmd`
  - `E:\writing-system\_agchain\_reference\inspect_ai\docs\models.qmd`
- InspectAI tracing, events, and sandbox references:
  - `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai\event\__init__.py`
  - `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai\event\_timeline.py`
  - `E:\writing-system\_agchain\_reference\inspect_ai\docs\tracing.qmd`
  - `E:\writing-system\_agchain\_reference\inspect_ai\docs\sandboxing.qmd`
  - `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai\util\_sandbox\registry.py`
  - `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai\util\_sandbox\environment.py`
  - `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai\util\_sandbox\service.py`

## Key InspectAI Findings

1. InspectAI models are organized around a code-level provider registry, not around free-text provider names. `@modelapi(name="...")` in `providers.py` registers provider adapters that are then resolved through the registry layer in `_registry.py`.
2. InspectAI distinguishes provider family, provider qualifier, model name, auth variables, and provider-specific model args. Examples include `openai/azure/...`, `anthropic/bedrock/...`, and `google/vertex/...`.
3. InspectAI exposes a broad provider catalog in docs and code. The repo currently shows roughly 26 registered provider entry points in `providers.py`, with dozens of provider-specific implementation/support files under `_providers`.
4. InspectAI's `get_model(role="...")` and model-role support confirm the architectural split between:
   - global model/provider support
   - task or benchmark-local role assignment
5. InspectAI tracing is not only route timing. It records action/anomaly-oriented runtime traces for model calls, subprocesses, tool calls, docker-compose controls, remote storage writes, and spawned subtasks. The event surface is strongly typed and timeline-oriented.
6. InspectAI sandboxing is a separate registry-backed subsystem. It is relevant to AG chain's eventual runner/tooling architecture, but it should not be collapsed into the initial level-1 `Models` page.

## Trust Matrix

| Inherited claim | Classification | Notes |
|---|---|---|
| Level-1 `Models` is a global platform registry, not a benchmark-local picker | Verified | InspectAI model roles strongly reinforce this split. |
| Benchmark-local evaluated and judge-model assignment is out of scope for the level-1 page | Verified | InspectAI separates global model availability from role assignment at eval/task runtime. |
| A single flat `agchain_model_targets` table with free-text `provider` is enough for the first implementation | Contradicted | InspectAI makes provider family and adapter identity first-class. AG chain needs a provider-registry seam, not only target rows. |
| A `transport_kind` enum is the right primary abstraction for provider support | Contradicted | InspectAI organizes around provider adapters and qualifiers. Transport/protocol is secondary metadata, not the identity model. |
| CRUD plus one probe endpoint is enough backend contract for `Models` | Unverified | It is enough only if AG chain also exposes the supported provider catalog to drive creation and validation. |
| Route-level OpenTelemetry spans alone adequately capture the observability story for model support | Contradicted | The first phase can still use OTel, but probe actions must be modeled as provider/adaptor-specific runtime actions with outcome details suitable for later anomaly/debug workflows. |
| Sandbox integration belongs in the `Models` page scope now | Obsolete | InspectAI shows sandboxing is adjacent but separate. It should influence future runner design, not this page's immediate scope. |

## Plan Drift Findings

1. The existing AG chain models plan is too target-row-centric. It treats provider support as a few string fields rather than as a validated adapter catalog.
2. The existing plan under-specifies the "Add Model" path. Without a supported-provider catalog, the create flow would be forced into ad hoc provider strings and ambiguous validation.
3. The existing migration contract stores `transport_kind` as a durable first-class enum, but InspectAI's architecture suggests the durable identity should be `provider_slug` plus optional qualifier, with transport/probe behavior resolved through a provider registry seam.
4. The existing observability contract is adequate for basic CRUD but too weak for provider health and debugging. It needs probe-specific traces/logs with provider/adaptor attributes and explicit outcome classification.
5. The existing plan correctly keeps benchmark-local model assignment out of scope. That decision should remain locked.

## Salvage or Rewrite Decision

**Decision:** Salvage by rewriting the affected sections of the existing AG chain models implementation plan.

**Why:** The plan's high-level product boundary is still correct:

- level-1 `Models` stays global
- benchmark-local assignment stays out of scope
- Supabase remains the persisted system of record for this phase
- `services/platform-api` remains the only owned runtime/backend surface

But the provider identity model, API surface, migration contract, and observability contract need to be re-locked around an InspectAI-informed provider registry seam before implementation continues.

## Required Changes to the Models Plan

1. Add a supported-provider catalog seam to `platform-api`.
2. Add `GET /agchain/models/providers` to the locked API surface.
3. Replace free-text provider identity with a canonical `provider_slug` plus optional qualifier model.
4. Replace transport-first validation with provider-registry validation in backend code.
5. Expand the observability contract for probe actions so provider health can be debugged later without guessing.
6. Keep sandbox integration out of this page's direct implementation scope, but record it as a future dependency for runtime execution architecture.
