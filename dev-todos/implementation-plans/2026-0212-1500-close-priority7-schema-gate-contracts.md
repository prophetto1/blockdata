# 2026-0212-1500-close-priority7-schema-gate-contracts

filename (UID): `2026-0212-1500-close-priority7-schema-gate-contracts.md`
problem: Priority 7 schema workflow contracts are defined, but gate closure is incomplete because several required contracts are only partially implemented and evidence is not fully captured.
solution: Close Priority 7 as one implementation slice by finishing missing schema-creation contract work (upload classifier routing, wizard parity, JSON escape hatch, save semantics, and gate evidence) while preserving the existing runtime baseline.
scope: Priority 7 gate-critical schema contracts only (wizard-first flow, advanced escape hatch, deterministic `POST /schemas`, worker/grid compatibility, and gate evidence).

## Included Implementation Rules

1. Schema creation remains wizard-first, with advanced editor as escape hatch, and all branches must save through `POST /schemas`.
2. `schemas` persistence contract requires owner-scoped `schema_ref` and `schema_uid` uniqueness plus deterministic `schema_uid` hashing from canonicalized JSON.
3. Priority 7 gate-critical outcomes are mandatory: wizard operational, advanced save operational, deterministic conflict/idempotency behavior, worker/grid compatibility via top-level `properties`, and reproducible evidence.
4. `schema_ref` format must match `^[a-z0-9][a-z0-9_-]{0,63}$`.
5. Upload JSON branch must parse and classify input deterministically to wizard-compatible vs advanced-required handling.
6. Wizard preview must surface explicit compatibility pass/warn status.
7. Wizard JSON escape hatch must enforce parse-error blocking and unknown-key preservation (no silent data loss when switching views).
8. Priority 7 excludes template CMS lifecycle and schema-assist/copilot implementation.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Preserve and, where needed, patch the single-save boundary contract by validating `POST /schemas` behavior for create (`200`), idempotent same-ref/same-content (`200`), ref/content conflict (`409`), and owner duplicate-content-under-new-ref conflict (`409`), including deterministic `$id/title/fallback` ref derivation and stable hash generation. | Updated `supabase/functions/schemas/index.ts` plus regression test coverage file under `supabase/functions/schemas/` (repo state: endpoint exists, duplicate-content conflict handling is partial) |
| 2 | Complete upload JSON branch (`Path D`) end-to-end so start-page upload parsing/classification routes users to wizard or advanced editor with persisted session draft and visible classification warnings. | Updated `web/src/lib/schemaUploadClassifier.ts`, `web/src/pages/SchemaStart.tsx`, and `web/src/pages/SchemaWizard.tsx` upload-prefill path (repo state: mostly implemented, requires gate validation and parity check) |
| 3 | Close wizard authoring parity gaps by ensuring nullable union authoring (`type: [base, "null"]`), nested-object handling parity (author directly when supported or route with explicit non-destructive warning), and compatibility pass/warn output in preview. | Updated `web/src/pages/SchemaWizard.tsx` with parity behavior and preview status checks (repo state: nullable + compatibility exist; nested-object parity needs explicit closure behavior) |
| 4 | Implement in-wizard JSON escape hatch contract with parse-error gating for navigation/save and explicit unknown-key preservation guarantees when toggling between visual and JSON editing modes. | Updated `web/src/pages/SchemaWizard.tsx` JSON editor tab/logic and associated tests (repo state: missing) |
| 5 | Re-verify branch controller and route/menu contracts (`/app/schemas/start`, `/wizard`, `/advanced`, `/templates`, `/apply`) including local schema workflow nav and left-rail active-state behavior that avoids double highlight between `Schemas` and `Schema Library`. | Updated `web/src/router.tsx`, `web/src/components/schemas/SchemaWorkflowNav.tsx`, `web/src/components/shell/nav-config.ts`, and `web/src/components/shell/LeftRail.tsx` with verification notes in code comments/tests (repo state: routes and nav mostly exist) |
| 6 | Re-verify advanced-editor embed contract by confirming CSS/JS asset loading, mount API usage (`getSchemaJson`, `setSchemaJson`, `destroy`), unmount cleanup, and host persistence through `POST /schemas` only. | Updated `web/src/pages/SchemaAdvancedEditor.tsx` and `web/src/lib/metaConfiguratorEmbed.ts` with passing lifecycle checks (repo state: implemented, requires explicit gate evidence rerun) |
| 7 | Execute and document Priority 7 gate-required evidence: scratch wizard save, existing-schema fork save, advanced-editor save, full `409` matrix including rename retry/idempotent path, and run/grid compatibility assertions for `properties`-derived columns and staged/confirmed semantics. | `dev-todos/_complete/2026-0212-priority7-schema-gate-evidence.md` (repo state: missing) |
| 8 | Publish one closure artifact that links all Priority 7 evidence, states binary pass/fail for each gate-critical requirement, and records any unresolved blocker that prevents gate closure. | `dev-todos/_complete/2026-0212-priority7-gate-pass-confirmation.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Save-boundary lock: `POST /schemas` deterministic create/idempotency/conflict behavior is verified for both unique-key paths.
2. Upload-path lock: JSON upload classification routes and prefill behavior are deterministic and reproducible.
3. Wizard-parity lock: nullable, nested-object handling, and compatibility pass/warn contracts are met.
4. JSON-escape lock: parse errors block forward/save and unknown keys are preserved across mode switches.
5. Route-nav lock: schema workflow routes and active-state behavior match contract without double-highlight regression.
6. Advanced-embed lock: mount/unmount lifecycle contract is verified and save boundary remains host-controlled.
7. Evidence lock: gate-required evidence file exists with command/test outputs for all required scenarios.
8. Final-output lock: `dev-todos/_complete/2026-0212-priority7-gate-pass-confirmation.md` exists with binary gate outcome.
