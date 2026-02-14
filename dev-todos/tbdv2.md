- Document Name: Master Spec Reconciliation (D1-D8)
- Document Objective: one canonical extraction of implementable actions, specification decisions, and operational policies across D1-D8.
- Source Document scope: D1 ~ D8.

---

- Source Document / Key:
  - D1: D1.md
  - D2: D2.md
  - D3: D3.md
  - D4: D4.md
  - D5: D5.md
  - D6: D6.md
  - D7: D7.md
  - D8: D8.md

---

- Depth Definition
  - Depth 1: Document-level intent and authority (status, scope, purpose, tie-breakers).
  - Depth 2: Section-level contracts (goals, SRLs, architecture, rollout blocks, findings).
  - Depth 3: Atomic normative statements (shall, must, required, acceptance, checklist, open decision).
  - Depth 4: Execution-ready units grouped into exactly three extraction types:
    - Action: directly implement/verify/change something.
    - Decision: explicit design choice, contract boundary, or unresolved sign-off choice.
    - Policy: operating rule, governance rule, security rule, sequencing rule, or rollout gate.

---

## Atomic Inventory by Source

### D1 - Superuser System AI Connectors Spec

- Actions
  - [ ] D1-A01: Add superuser-manageable system AI connector settings in Superuser Settings (`D1` section 2).
  - [ ] D1-A02: Implement two independent slots: `runtime_primary` and `assistant_primary` (`D1` section 2, SRL-2).
  - [ ] D1-A03: Restrict `runtime_primary` provider to `anthropic` and reject non-anthropic values (`D1` SRL-3).
  - [ ] D1-A04: Validate `assistant_primary` provider set and require valid `http/https` `base_url` for `custom` (`D1` SRL-4).
  - [ ] D1-A05: Implement signed-off worker key precedence across `user_api_keys`, `runtime_primary`, and env fallback (`D1` SRL-5).
  - [ ] D1-A06: Document and test behavior when configured sources decrypt/validate fail (`D1` SRL-6).
  - [ ] D1-A07: Encrypt credentials at rest; never expose plaintext secrets in API responses (`D1` SRL-7).
  - [ ] D1-A08: Build `/app/settings/superuser` connector cards with set/rotate/clear actions and status metadata (`D1` SRL-8).
  - [ ] D1-A09: Persist full audit fields `changed_by`, `changed_at`, `old_value`, `new_value`, `reason` (`D1` SRL-9).
  - [ ] D1-A10: Keep model/default parameter ownership outside connector records (`D1` SRL-10).
  - [ ] D1-A11: Create `public.system_ai_connectors` table with the defined columns and slot constraint (`D1` section 6).
  - [ ] D1-A12: Enforce RLS and superuser edge-function mediated writes only (`D1` section 6 Security).
  - [ ] D1-A13: Implement `superuser-ai-connectors` edge API: `GET`, `PUT/PATCH`, `DELETE` (`D1` section 7).
  - [ ] D1-A14: Apply rollout sequence: migration -> edge function -> UI section -> worker precedence wiring -> runtime rotation verification (`D1` section 9).
  - [ ] D1-A15: Execute acceptance matrix tests 1-10 (`D1` section 10).

- Decisions
  - D1-D01: Final credential precedence choice: Option A `user_api_keys -> runtime_primary -> env` vs Option B `runtime_primary -> user_api_keys -> env` (`D1` section 11.1).
  - D1-D02: Invalid highest-priority source behavior: Option A fail closed vs Option B mark invalid and continue (`D1` section 11.2).
  - D1-D03: `assistant_primary` phase-1 scope: Option A Anthropic-only vs Option B multi-provider (`D1` section 11.3).
  - D1-D04: Audit storage target: dedicated connector-audit table vs shared admin-policy audit (`D1` section 11.4).
  - D1-D05: Include or defer "Test connection" action in this phase (`D1` section 11.5).

- Policies
  - D1-P01: Credential precedence must be explicitly signed off across all three sources (`D1` section 0).
  - D1-P02: Assistant provider scope must be fixed or provisional, not both (`D1` section 0).
  - D1-P03: Failure behavior for configured-invalid connectors must be explicit (`D1` section 0, SRL-6).
  - D1-P04: Audit trail must include full before/after + reason (`D1` section 0, SRL-9).
  - D1-P05: Connector records are auth/endpoint authority only; model defaults remain runtime-policy authority (`D1` SRL-10).
  - D1-P06: UX copy must distinguish platform connectors from user provider keys and define slot usage text (`D1` section 8).

### D2 - Consolidated Remaining Actions

- Actions
  - [ ] D2-A01: Define downstream adapter interface and profile versioning (`D2` section 2.1).
  - [ ] D2-A02: Build deterministic reference adapter `docling -> KG flatten v1` (`D2` section 2.1).
  - [ ] D2-A03: Add deterministic output tests for adapter outputs (`D2` section 2.1).
  - [ ] D2-A04: Pin Pandoc package version in conversion-service Dockerfile (`D2` section 2.2).
  - [ ] D2-A05: Lock intended production values for temporary runtime rollout policy flags (`D2` section 2.2).
  - [ ] D2-A06: Document `prompt_config` convention in schema spec (`D2` section 3.1).
  - [ ] D2-A07: Confirm deployed `ANTHROPIC_API_KEY` for live worker path (`D2` section 3.1).
  - [ ] D2-A08: Verify concurrent worker invocations do not double-process blocks (`D2` section 3.1).
  - [ ] D2-A09: Verify full run flow from create-run to rollup updates (`D2` section 3.1).
  - [ ] D2-A10: Add document delete storage cleanup or formal deferred policy + cleanup job (`D2` section 3.1).
  - [ ] D2-A11: Implement export variants (confirmed/all/CSV/per-document) (`D2` section 3.2).
  - [ ] D2-A12: Implement `reconstruct` edge function using confirmed revised content (`D2` section 3.2).
  - [ ] D2-A13: Add reconstructed markdown download in `DocumentDetail` toolbar (`D2` section 3.2).
  - [ ] D2-A14: Build `/app/integrations` page with integration cards (`D2` section 3.3).
  - [ ] D2-A15: Implement Neo4j integration (config, mapping, overlay push) (`D2` section 3.3).
  - [ ] D2-A16: Implement webhook integration triggered on run confirmation (`D2` section 3.3).
  - [ ] D2-A17: Implement DuckDB/Parquet export integration (`D2` section 3.3).
  - [ ] D2-A18: Revalidate/fix conversion-service access-policy `Cloud Run 403` if still present (`D2` section 3.4).
  - [ ] D2-A19: Add code-splitting with `React.lazy` and AG Grid chunk isolation (`D2` section 3.4).
  - [ ] D2-A20: Add testing baseline (Vitest + RTL + initial suite) (`D2` section 3.4).
  - [ ] D2-A21: Add React error boundary and realtime reconnection handling (`D2` section 3.4).
  - [ ] D2-A22: Add CI/CD baseline (lint/typecheck/build) (`D2` section 3.4).
  - [ ] D2-A23: Complete auth lifecycle features (email confirm, password reset, OAuth) (`D2` section 3.4).
  - [ ] D2-A24: Add account settings page for lifecycle/admin controls (`D2` section 3.4).
  - [ ] D2-A25: Complete security hardening pass (CSP, rate limiting, session expiry) (`D2` section 3.4).

- Decisions
  - D2-D01: Recommended execution sequence: immediate hardening -> core export/reconstruct value -> integrations -> ops polish (`D2` section 4).

- Policies
  - D2-P01: This file is the active consolidated tracker for only migrated remaining actions (`D2` section 1).
  - D2-P02: Revalidate 0209-derived checklist items before execution due date drift (`D2` section 1 Notes).
  - D2-P03: Keep historical implementation details in source docs while updating status here (`D2` section 5).
  - D2-P04: Update this consolidated file first when items complete, then back-reference evidence docs (`D2` section 5).

### D3 - Config Source Authority Reconciliation

- Actions
  - [ ] D3-A01: Confirm final baseline for `models.platform_default_max_tokens` (`D3` section 6).
  - [ ] D3-A02: Confirm whether `CFG-004` is `Implemented` or remains `Proposed` (`D3` section 6).
  - [ ] D3-A03: Backfill labels on older implementation docs to mark non-authoritative historical baselines (`D3` section 6).

- Decisions
  - D3-D01: Root cause: no enforced source-authority hierarchy across legacy docs, phase lock docs, decision log statuses, and live code (`D3` section 3).
  - D3-D02: Proposed authority order is 4-tier with implemented artifacts highest (`D3` section 4).

- Policies
  - D3-P01: No config default change should merge without authority citation block (tier-1 + tier-2 where available), explicit precedence, migration/runtime/UI alignment proof, done-log, and changelog (`D3` section 5).
  - D3-P02: Proposed decision-log entries are non-authoritative for current behavior unless implemented (`D3` section 4).
  - D3-P03: Historical docs are reference-only when conflicting with higher authority layers (`D3` section 4).

### D4 - Config Appropriateness and Utility Review

- Actions
  - [ ] D4-A01: Execute `AGT-006` by consolidating user provider editor surface into `/app/agents` (`D4` section 5).
  - [ ] D4-A02: Execute `AGT-007` by fixing deterministic card-state semantics and CTA gating (`D4` section 5).
  - [ ] D4-A03: Execute `AGT-008` by locking defaults precedence across docs/UI/runtime (`D4` section 5).
  - [ ] D4-A04: Execute `AGT-009` by explicitly splitting Google auth method presentation (`D4` section 5).
  - [ ] D4-A05: Execute `SUP-001` by implementing working superuser connector management (`D4` section 5).
  - [ ] D4-A06: Execute `SUP-002` by finalizing/testing user-system-env key precedence (`D4` section 5).

- Decisions
  - D4-D01: Findings severity and content are explicit: F1/F2/F3 high; F4/F5/F6 medium (`D4` section 4).
  - D4-D02: Config appropriateness is defined by the five review-standard conditions (`D4` section 2).

- Policies
  - D4-P01: Review cannot close until all exit criteria are satisfied (single editor, working superuser connectors, visible value provenance, deterministic state/action matrix, backlog evidence closure) (`D4` section 6).

### D5 - Agents + MCP Foundation Dev Smoke Runbook

- Actions
  - [ ] D5-A01: Ensure preconditions before smoke run: authenticated user, deployed `agent-config` and `provider-connections` in same dev branch, feature flags off unless intentionally testing UI (`D5` Preconditions).
  - [ ] D5-A02: Verify migration state: table existence, index existence, grants posture, and seed rows (`D5` Migration Checks).
  - [ ] D5-A03: Run deterministic smoke sequence steps 1-9 (`D5` Deterministic API Smoke Sequence).
  - [ ] D5-A04: Validate keyword normalization to `/claude` and authenticated-user scoping during patch (`D5` step 2).
  - [ ] D5-A05: Validate duplicate keyword failure path (`D5` step 3).
  - [ ] D5-A06: Validate malformed and valid Vertex service-account connect paths with secret non-disclosure (`D5` steps 4-5).
  - [ ] D5-A07: Validate status endpoint excludes encrypted credential data (`D5` step 6).
  - [ ] D5-A08: Validate disconnect and post-disconnect readiness behavior (`D5` steps 7-8).
  - [ ] D5-A09: Validate custom readiness contract (base_url only false; base_url+api_key true) (`D5` step 9).

- Decisions
  - D5-D01: Readiness matrix is normative for rollback/promotion decisions (`D5` steps 8-9, Rollback Criteria).

- Policies
  - D5-P01: Do not promote from dev branch if rollback criteria fail (direct browser mutation, secret leakage, default uniqueness violations, readiness divergence) (`D5` Rollback Criteria).

### D6 - Agents + MCP Configuration Foundation

- Actions
  - [ ] D6-A01: Implement migration `021_agents_config_foundation` and types updates for `agent_catalog` and `user_agent_configs` (`D6` Task 1).
  - [ ] D6-A01a: In `agent_catalog`, include explicit capability columns `supports_api_key`, `supports_provider_connections`, `supports_mcp_bindings`, and `supports_mode` (`D6` Task 1 step 2).
  - [ ] D6-A02: Implement migration `022_provider_connections` and types updates for `user_provider_connections` (`D6` Task 2).
  - [ ] D6-A03: Implement `agent-config` edge API with GET/POST/PATCH and readiness computation matrix (`D6` Task 3).
  - [ ] D6-A04: Implement `provider-connections` API for Google Vertex service-account connect/disconnect/status with encryption and validation (`D6` Task 4).
  - [ ] D6-A05: Fix `/app/integrations` authenticated route parity and placeholder (`D6` Task 4A).
  - [ ] D6-A06: Add `/app/agents`, `/app/mcp`, `/app/commands` routes and flag-aware nav ordering (`D6` Task 5).
  - [ ] D6-A07: Build Agents page with search/filter, readiness badges, and configure action (`D6` Task 6).
  - [ ] D6-A08: Build first-time onboarding wizard `/app/onboarding/agents` with 3-step flow and default persistence (`D6` Task 6A).
  - [ ] D6-A09: Build provider-specific configure modal framework (`D6` Task 7).
  - [ ] D6-A10: Wire test/save/connect flows across `test-api-key`, `agent-config`, and `provider-connections` (`D6` Task 8).
  - [ ] D6-A11: Build MCP placeholder catalog cards and optional `mcp_server_ids` persistence (`D6` Task 9).
  - [ ] D6-A12: Implement security/UX hardening: secret masking/no logs, input normalization, keyword normalization, model validation, keyboard focus, `aria-label`, and input-linked errors (`D6` Task 10).
  - [ ] D6-A13: Add frontend and edge/API tests plus deterministic manual smoke checks (`D6` Tasks 11-12).
  - [ ] D6-A14: Add feature flags (`agentsConfigUI`, `mcpPlaceholderUI`, `providerConnectionFlows`) with staged rollout controls (`D6` Task 13).

- Decisions
  - D6-D01: Build-only foundation scope; runtime chat/tool execution integration deferred (`D6` Canonical Tracking and Rollout Constraints).
  - D6-D02: Provider capability matrix in v1 is fixed: Anthropic/OpenAI API key; Google API key OR Vertex service account; Custom OpenAI-compatible base_url + API key (`D6` Provider Capability Matrix).
  - D6-D03: On first-time entry, redirect from `/app/agents` when no default-ready config exists (`D6` Task 6A).
  - D6-D04: Open decision - Custom provider strict OpenAI compatibility vs broader self-hosted API scope (`D6` Open Decisions).
  - D6-D05: Open decision - MCP page persists global connections now vs placeholder-only (`D6` Open Decisions).
  - D6-D06: Open decision - Google labeling strategy (`Google (Gemini)` with Vertex advanced auth vs separate Vertex card mapped to same provider) (`D6` Open Decisions).

- Policies
  - D6-P01: Keep `agentsConfigUI`, `mcpPlaceholderUI`, and `providerConnectionFlows` disabled by default until rollout approval (`D6` Canonical Tracking and Rollout Constraints).
  - D6-P02: Never leave side-rail links pointing to missing `/app/*` routes (`D6` Task 4A guardrail).
  - D6-P03: Preserve `/app/integrations` shell route parity while this plan remains behind flags (`D6` constraints).
  - D6-P04: Secret material must never be returned in plaintext via API responses (`D6` Task 10 + Acceptance Criteria).

### D7 - Schema Library + Assistant Future Task

- Actions
  - [ ] D7-A01: Build phase-1 library foundation: registry + browse/filter UI + template details + apply-to-existing/new project flow (`D7` Suggested rollout phase 1).
  - [ ] D7-A02: Build phase-2 in-schema assistant panel for adaptation, prompt drafting/refinement, and change preview with explicit user approval (`D7` Suggested rollout phase 2).
  - [ ] D7-A03: Build phase-3 intelligence: recommendation ranking, closest-template suggestions, performance feedback loop (`D7` Suggested rollout phase 3).
  - [ ] D7-A04: Ensure applied templates become project-owned editable schemas compatible with existing execution pipeline (`D7` Acceptance criteria).

- Decisions
  - D7-D01: North-star is `select + adapt + validate` rather than authoring raw schema from scratch (`D7` Why this exists + North-star).
  - D7-D02: Template minimum contract fields: `template_id`, `template_version`, `name`, `description`, `use_case_tags`, schema payload, explanation metadata (`D7` Template contract).
  - D7-D03: AI assistant responsibilities are four explicit capability categories: Intent-to-schema adaptation, field coaching, prompt-config support, validation support (`D7` AI assistant responsibilities).

- Policies
  - D7-P01: Library templates are read-only canonical assets (`D7` Critical product rules).
  - D7-P02: Apply always creates a project-owned copy; never mutate template in place (`D7` Critical product rules).
  - D7-P03: Assistant suggestions are never auto-final; user confirms before save (`D7` Critical product rules).
  - D7-P04: Schedule this work after schema-save flow, worker reliability, and review/export baseline are stabilized (`D7` Dependencies and timing note).

### D8 - Priority 7 Schema Contracts Master Spec

- Actions
  - [ ] D8-A01: Preserve gate-critical scope: wizard-first creation, advanced editor operational, deterministic save/idempotency/conflict behavior, worker/grid compatibility, and evidence capture (`D8` sections 2.1 and 22.1).
  - [ ] D8-A02: Enforce single save boundary: `POST /schemas` only (`D8` section 9).
  - [ ] D8-A03: Keep `POST /schemas` contract semantics and payload handling unchanged (`D8` section 10).
  - [ ] D8-A04: Implement `schema_ref` derivation algorithm when omitted (`$id` tail -> `title` -> `schema`; slugify; trim; collapse `_`; truncate to 64) (`D8` section 10.4).
  - [ ] D8-A05: Implement deterministic `schema_uid` derivation via canonical JSON with recursively sorted object keys and SHA-256 hex (`D8` section 10.5).
  - [ ] D8-A06: Preserve and validate route/IA contract for schema workflows, including local schema sub-nav behavior and entry/exit rules (`D8` section 11).
  - [ ] D8-A07: Enforce strict wizard output compatibility contract (`type: object`, top-level `properties`, optional `prompt_config`) (`D8` section 12.1).
  - [ ] D8-A08: Support documented visual-authoring subset, including nullable union toggle and nested object controls (`D8` section 12.2, 13.2).
  - [ ] D8-A09: Implement preview pass/warn compatibility indicator and sample-block display behavior (`D8` section 13.4).
  - [ ] D8-A10: Implement step-5 save conflict UX (`409` guidance and rename retry) (`D8` section 13.5).
  - [ ] D8-A11: Implement in-wizard JSON escape hatch: invalid JSON blocks save, unsupported constructs preserved, no silent key loss when switching views (`D8` section 13.6).
  - [ ] D8-A12: Preserve advanced editor embed contract: asset paths, mount API (`mountSchemaEditor`), returned methods (`getSchemaJson`, `setSchemaJson`, `destroy`), host unmount cleanup, host-controlled persistence (`D8` section 15).
  - [ ] D8-A13: Implement branch controller paths A-E and keep convergence on `POST /schemas` (`D8` sections 14 and 16).
  - [ ] D8-A14: Enforce grid/review semantics: value selection by status (`overlay_jsonb_confirmed` vs `overlay_jsonb_staging`), staged-only editing, `update_overlay_staging`, review RPC behaviors (`confirm_overlays`, `reject_overlays_to_pending`, `Confirm All Staged`), degradation rules when `properties` absent (`D8` section 18).
  - [ ] D8-A15: Capture gate-required evidence matrix artifacts and optional template evidence when template path ships (`D8` section 22).
  - [ ] D8-A16: Execute phase-1 closure work: upload classifier, nullable toggle, preview indicator, nested-object parity/routing, JSON escape hatch, re-verification, and reproducible evidence capture (`D8` section 23 phase 1).
  - [ ] D8-A17: Execute phase-2 template path and phase-3 post-P7 extension tasks when scheduled (`D8` section 23 phases 2-3).

- Decisions
  - D8-D01: Non-negotiables are binding: wizard-first, advanced escape hatch, single save endpoint, fork-by-default edits, explicit recoverable conflict behavior (`D8` section 3).
  - D8-D02: Data-model contracts are binding (`schemas` fields, `schema_ref` regex, uniqueness semantics, delete restrictions, provenance) (`D8` section 7).
  - D8-D03: Current runtime baseline must be preserved while closing remaining P7 gaps (`D8` section 8).
  - D8-D04: Route and menu contract (global + local navigation behavior) is fixed (`D8` section 11).
  - D8-D05: AI assistance (`schema-assist`) is deferred from P7 and bounded when later introduced (`D8` section 19).
  - D8-D06: SRL-1 explicit contract: users can create schemas without writing JSON (`D8` section 5).
  - D8-D07: SRL-2 explicit contract: users can edit full schema JSON through the advanced escape hatch (`D8` section 5).
  - D8-D08: SRL-3 explicit contract: saved schemas persist with stable `schema_ref` and deterministic `schema_uid` (`D8` section 5).
  - D8-D09: SRL-4 explicit contract: save is idempotent on identical tuples and conflicts are explicit/recoverable (`D8` section 5).
  - D8-D10: SRL-5 explicit contract: edits default to fork, not in-place mutation (`D8` section 5).
  - D8-D11: SRL-6 explicit contract: wizard-created schemas must match worker/grid compatibility contract (`D8` section 5).
  - D8-D12: SRL-7 explicit contract: grid columns derive from schema and staged/confirmed overlay display is correct (`D8` section 5).
  - D8-D13: SRL-8 explicit contract: future schema assistance remains isolated from user API key pathways (`D8` section 5).
  - D8-D14: SRL-9 explicit contract: advanced editor embed remains host-style/lifecycle compatible (`D8` section 5).

- Policies
  - D8-P01: Do not introduce alternate schema persistence endpoints in Priority 7 (`D8` section 9).
  - D8-P02: Editing defaults to fork; in-place mutation of in-use artifacts is non-default (`D8` sections 7.3 and 24).
  - D8-P03: Security/ownership constraints apply: authenticated flow, own-schema visibility, non-mutating template catalog, host-controlled save (`D8` section 20).
  - D8-P04: Out-of-scope guardrails remain enforced (embed-stack replacement, template CMS, in-place mutation flow for referenced artifacts, assistant/KG/vector/MCP work) (`D8` section 24).

---

## Category Grouping Map (for planning and execution)

- Category 1: Governance and Authority
  - Core sources: D2 sections 1 and 5; D3 sections 4-6; D8 section 1.
  - Primary items: D2-P01..P04, D3-D02, D3-P01..P03.

- Category 2: Goals, Scope, and Non-Goals
  - Core sources: D1 sections 1-3; D7 sections 9 and 22; D8 sections 2-3.
  - Primary items: D1-A01..A05, D1-P06, D7-D01, D8-D01.

- Category 3: Requirement Contracts
  - Core sources: D1 section 5; D8 sections 5-6, 12-13.
  - Primary items: D1-A06..A10, D8-A07..A11.

- Category 4: Data and Persistence
  - Core sources: D1 section 6; D6 tasks 1-2; D8 sections 7 and 10.
  - Primary items: D1-A11..A12, D6-A01..A02, D8-A02..A05.

- Category 5: API and Runtime
  - Core sources: D1 section 7; D5 smoke steps; D6 tasks 3-4 and 8; D8 sections 10 and 18.
  - Primary items: D1-A13, D5-A03..A09, D6-A03..A04, D6-A10, D8-A03, D8-A14.

- Category 6: Security, Auth, and Secrets
  - Core sources: D1 SRL-7; D5 rollback; D6 task 10; D8 section 20.
  - Primary items: D1-A07, D5-P01, D6-A12, D8-P03.

- Category 7: UX and IA
  - Core sources: D1 SRL-8 + section 8; D6 tasks 4A-9; D8 sections 11 and 13.
  - Primary items: D1-A08, D1-P06, D6-A05..A11, D8-A06, D8-A10.

- Category 8: Verification and Evidence
  - Core sources: D1 section 10; D5 full runbook; D6 tasks 11-12; D8 section 22.
  - Primary items: D1-A15, D5-A01..A09, D6-A13, D8-A15.

- Category 9: Planning, Phasing, and Backlog
  - Core sources: D2 sections 2-4; D6 task 13; D7 rollout; D8 section 23.
  - Primary items: D2-A01..A25, D2-D01, D6-A14, D7-A01..A04, D8-A16..A17.

- Category 10: Findings and Open Decisions
  - Core sources: D1 section 11; D4 findings; D6 open decisions; D3 open resolution.
  - Primary items: D1-D01..D05, D4-A01..A06, D4-D01, D6-D04..D06, D3-A01..A03.

---

## Structured Action Sets

- Set S1: Decision Lock Set (blocker sign-offs)
  - Objective: eliminate unresolved precedence/scope/audit decisions before build moves.
  - Included items: D1-D01..D1-D05, D6-D04..D06, D3-A01..A02.
  - Dependencies: none.
  - Blocking effect: blocks D1-A05, D1-A06, D1-A09, D6-A03, D6-A04, D6-A14.
  - Closure evidence: signed decision record + reflected spec updates in this file.

- Set S2: Connector Foundation Build Set
  - Objective: deliver superuser connector persistence, API, UI, and runtime wiring.
  - Included items: D1-A06..A14, D1-A07, D1-A08, D1-A11..A13.
  - Dependencies: S1.
  - Closure evidence: D1 acceptance matrix items 1-10 passed.

- Set S3: Agents + Provider Foundation Set
  - Objective: deliver agents config surface and provider connection plumbing (build-only).
  - Included items: D6-A01..A14, D5-A01..A09.
  - Dependencies: S1 for open decisions; S2 independent except shared policy alignment.
  - Closure evidence: D5 migration checks + deterministic smoke sequence + D6 acceptance criteria.

- Set S4: Priority 7 Contract Closure Set
  - Objective: close all P7 gate gaps while preserving existing baseline behavior.
  - Included items: D8-A01..A16.
  - Dependencies: none for contract closure; optional dependency on template work for D8-A17.
  - Closure evidence: D8 section 22.1 complete and reproducible.

- Set S5: Consolidated Backlog Delivery Set
  - Objective: execute remaining platform/workflow backlog in recommended order.
  - Included items: D2-A01..A25 with D2-D01 sequencing.
  - Dependencies: none, but sequence should be respected.
  - Closure evidence: each checklist item marked complete with linked evidence artifact.

- Set S6: Policy Compliance Set
  - Objective: prevent drift from authority, security, and scope guardrails.
  - Included items: D2-P01..P04, D3-P01..P03, D4-P01, D5-P01, D6-P01..P04, D7-P01..P04, D8-P01..P04.
  - Dependencies: applies continuously.
  - Closure evidence: release checklist includes explicit policy conformance checks.

---

## Intermediary Reconciliation Check

- Multi-agent extraction completed and reconciled into this file.
- Previously identified high-impact omissions have now been explicitly added:
  - D2 deferred Phase-4 adapter trilogy (interface/versioning, deterministic adapter, deterministic tests).
  - D8 section 10.4-10.5 derivation algorithms.
  - D8 section 15 advanced editor mount API and lifecycle contract.
  - D8 section 18 grid/review semantics and RPC behaviors.
  - D6 column-level and accessibility normatives.
  - D7 template contract field list and AI assistant responsibility quadrants.

- This file is now the working exhaustive baseline for next-pass per-item source tagging and execution sequencing.
