# Source File -> Implementation Plan Tracker

**Last updated:** 2026-02-14
**Source directory:** `E:\writing-system\dev-todos\specs\`
**Output directory:** `E:\writing-system\dev-todos\implementation-plans\`
**Guideline:** `implementation plan drafting guideline.md`

---

## Status Key

- **not started**: file has not been processed into implementation plans yet.
- **in progress**: file is being processed; some plans drafted but review incomplete.
- **done**: all actionable content converted into implementation plans; orphans documented.

---

## Source Files

| # | Source File | Status | Resulting Plans | Orphans / Notes |
|---|---|---|---|---|
| 1 | `0209-unified-remaining-work.md` | done | `2026-0209-1845-close-legacy-unified-remaining-work-migration.md` | Processed as legacy-source closure with explicit mapping of unresolved checklist items to consolidated backlog execution artifacts. |
| 2 | `0210-project-detail-layout-and-wiring.md` | done | `2026-0210-1530-fix-projectdetail-layout-and-summary-wiring.md` | Converted into one implementation slice for layout + summary + no-run UX with wiring-preservation evidence. Non-actionable screenshot narrative and baseline explanatory prose treated as context. |
| 3 | `0211-core-priority-queue-and-optimization-plan.md` | done | `2026-0214-1200-lock-core-reliability-baseline-p1-p3.md`, `2026-0214-1300-implement-optimization-controls-p4-p6.md`, `2026-0214-1400-complete-schema-review-hardening-p7-p9.md` | Rewritten to four-section format with embedded rules, repo-state-aware outputs, and completion locks. Non-actionable legends/dependency map treated as source context only. |
| 4 | `0211-shell-v2-copilot-platform-plan.md` | done | `2026-0211-1535-complete-shell-v2-copilot-platform-foundation.md` | Converted to one end-to-end shell/copilot plan with embedded product rules and repo-state-aware outputs; canonical references/progress logs treated as context. |
| 5 | `0211-worker-token-optimization-patterns.md` | done | `2026-0211-1635-complete-worker-token-optimization-architecture.md` | Converted to one worker-optimization architecture plan covering implemented baseline and missing tiers; numeric cost tables treated as analytical context. |
| 6 | `0212-priority7-schema-contracts-master-spec.md` | done | `2026-0212-1500-close-priority7-schema-gate-contracts.md` | Priority 7 gate-critical contract converted to one vertical slice plan. Non-actionable canonical-term/history sections treated as context only. |
| 7 | `0212-schema-library-and-assistant-future-task.md` | done | `2026-0212-1600-build-schema-library-assistant-rollout.md` | Future-task direction converted to one rollout plan with read-only template rules, apply-copy contract, assistant proposal-only safety, and lineage requirements. |
| 8 | `0213-agents-mcp-configuration-foundation.md` | done | `2026-0213-1835-close-agents-mcp-configuration-foundation.md` | Converted full Task 1-13 foundation plan into closure slice; remaining gaps captured as parity/test/release-gate actions. |
| 9 | `0213-agents-mcp-foundation-dev-smoke-runbook.md` | done | `2026-0213-1755-validate-agents-mcp-foundation-smoke-contract.md` | Converted runbook checks into one executable smoke-validation slice with migration/API/security gate outputs. |
| 10 | `0213-config-appropriateness-utility-review.md` | done | `2026-0213-1725-remediate-config-appropriateness-utility-gaps.md` | Converted six findings and review standards into one remediation slice with closure locks tied to AGT/SUP backlog outcomes. |
| 11 | `0213-config-source-authority-reconciliation.md` | done | `2026-0213-1710-enforce-config-source-authority-contract.md` | Converted authority-order, guardrails, and open resolutions into one source-authority contract closure plan; missing superseded path treated as repo-state gap. |
| 12 | `0213-consolidated-remaining-actions.md` | done | `2026-0213-1740-execute-consolidated-remaining-actions-backlog.md` | Converted all consolidated checklist items into one execution slice grouped by dependency order; environment-only validations explicitly preserved as evidence gates. |
| 13 | `0213-reflections.md` | done | `2026-0213-1810-harden-ingest-artifacts-and-project-ia.md` | Converted reflection directives into one implementation slice spanning project IA refactor + ingest multi-artifact/source-adapter hardening. |
| 14 | `0213-spec-enforcement-system-plan-proposed.md` | done | `2026-0213-1005-bootstrap-spec-enforcement-phase0-phase1.md`, `2026-0213-1035-enforce-spec-governance-repo-gates-phase2-phase3.md` | Rewritten to implementation-only outputs; removed process-only action drift; added embedded rules and completion locks. |
| 15 | `0213-superuser-system-ai-connectors-spec.md` | done | `2026-0213-0905-implement-superuser-ai-connectors-end-to-end.md` | Consolidated to one vertical-slice plan; deleted redundant `2026-0213-0935-implement-superuser-ai-connectors-end-to-end.md`. |
| 16 | `config-decision-log.md` | not started | - | - |

---

## Cross-File Dependencies

Some implementation plans may require content from multiple source files. Track those here:

| Plan Scope | Primary Source(s) | Supporting Source(s) | Notes |
|---|---|---|---|
| Priority 7 schema gate closure | `0212-priority7-schema-contracts-master-spec.md` | `meta-configurator-integration/status.md`, `meta-configurator-integration/spec.md` | Runtime baseline and evidence paths require cross-check against active schema workflow implementation. |
| Schema library + assistant rollout | `0212-schema-library-and-assistant-future-task.md` | `0212-priority7-schema-contracts-master-spec.md` | Apply-copy and pipeline compatibility depend on Priority 7 save and execution contracts. |
| Consolidated remaining actions execution | `0213-consolidated-remaining-actions.md` | `0209-unified-remaining-work.md`, `0213-ingest-tracks-pandoc-and-representation-artifacts-plan.md` | Consolidated backlog inherits deferred/open items from both sources; execution evidence should map back to original checklist intent. |
| Agents/MCP smoke gate | `0213-agents-mcp-foundation-dev-smoke-runbook.md` | `0213-agents-mcp-configuration-foundation.md` | Smoke runbook validates schema/API behavior introduced by the foundation plan. |

---

## Rules for Processing

1. Read the source file completely before deciding how many plans it produces.
2. Read the guideline (`implementation plan drafting guideline.md`) before drafting.
3. Check the repo for current state - if an action output already exists (migration file, edge function, UI component), note it in the action description as already present. Do not filter it out of the plan.
4. If the source file cannot produce a complete implementation plan on its own (missing information, depends on another file content), record which other file(s) are needed in Cross-File Dependencies and process them together.
5. If content in the source file is not actionable (governance boilerplate, status legends, historical notes), classify it as an orphan in this tracker. Do not force it into an action.
6. After drafting, update this tracker: set status, list resulting plans, and document orphans.
7. One plan per vertical slice. Do not split database-from-UI or API-from-tests into separate plans for the same scope.
