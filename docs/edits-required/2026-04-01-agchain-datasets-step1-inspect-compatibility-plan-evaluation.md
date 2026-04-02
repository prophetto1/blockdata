# 2026-04-01 AGChain Datasets Step 1 Inspect Compatibility Plan Evaluation

## Plan Reviewed

Plan: `E:\writing-system\docs\plans\2026-04-01-agchain-datasets-step1-inspect-compatibility-plan.md`

This plan proposes completing the AGChain Datasets menu as a project-scoped, Inspect-aligned frontend surface over the already-landed dataset backend: registry, create wizard, detail workspace, version drafts, router integration, and one small backend observability cleanup.

## Structural Verdict

**Structurally Complete With Gaps**

All required major sections are present, the inventory counts and file inventory are internally consistent, and the plan does a good job locking the compatibility-sensitive seam through `Locked AGChain-to-Inspect Mapping Boundary` even though it does not use the literal `Frozen Seam Contract` heading.

The main structural softness is that `Locked Observability Surface` is written as a grouped inventory rather than a fully explicit proof contract. It names the spans, counters, and histograms, but the acceptance item that they must “emit correctly” is not paired with a concrete verification path beyond code inspection and rerunning tests.

## Quality Findings

### Critical

- **`shuffle_choices` is simultaneously declared supported and declared unverified** — the plan says Step 1 supports `shuffle_choices` and that this matches Inspect materialization behavior (`Supported Inspect Subset`, lines 149-151), but it also says target-letter remapping is “Not verified” and could produce incorrect scoring for multiple-choice tasks (`Locked AGChain-to-Inspect Mapping Boundary`, line 132; `Explicit Risks`, line 372). For a plan whose explicit purpose is Inspect compatibility, this is a correctness blocker. The implementer would otherwise be forced to either ship a contract the backend may not actually honor or silently downscope behavior during implementation.

### Significant

- **Observability acceptance is not backed by a concrete proof path** — acceptance item 7 requires proving that dataset-specific spans, counters, and histograms emit correctly with no forbidden attributes, but the tasks only add one missing span and rerun existing tests. Existing backend tests do cover some `set_span_attributes` hygiene on dataset routes, but they do not prove the new `agchain.inspect.dataset.validation.project` span or end-to-end emit behavior. The plan should either add explicit observability verification steps/artifacts or narrow the acceptance wording to what will actually be proven.

- **The page-test contract underweights the async operation seam** — the locked product decisions rely on inline 202 polling for preview and commit, but the page-level test tasks focus mostly on navigation and happy-path rendering. At least one create/draft flow test or hook-level test should exercise the async transition from 202 operation payload to terminal success, because that is a central interaction contract rather than an incidental implementation detail.

### Minor

- **Acceptance wording understates the mapped field set** — acceptance item 2 lists `input`, `target`, `id`, `metadata`, `sandbox`, `files`, and `setup`, while the plan elsewhere says all 9 Inspect-native fields are carried through and the field-mapping editor task includes `messages` and `choices`. Tighten the wording so the acceptance contract matches the declared supported subset exactly.

### Observations

- The plan’s baseline reality checks are good. Current code matches the stated starting point: `web/src/pages/agchain/AgchainDatasetsPage.tsx` is still a placeholder `AgchainSectionPage`, `web/src/lib/agchainDatasets.ts` is still types-only, and the backend route surface already exists.

- The overall decomposition is sensible for this repo. The service-layer addition in `agchainDatasets.ts`, the three-hook split, and the page/component breakdown fit the established AGChain frontend pattern better than trying to collapse everything into a single monolithic page.

- The compatibility-boundary section is one of the stronger parts of the plan. It clearly states where AGChain intentionally diverges from Inspect and avoids pretending the current JSONPath authoring model is a literal `FieldSpec` clone.

## Approval Recommendation

**Revise — Quality**

This plan is close. The manifest, locked inventory, current-code cross-checks, and implementation tasking are all strong enough to execute against. I would not approve implementation until the `shuffle_choices` contract is reconciled and the observability proof path is made explicit, because both issues sit directly on the plan’s claimed Inspect-aligned correctness.
