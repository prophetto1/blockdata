# Implementation Audit Against tbdv2 Actions

Date: 2026-02-13  
Scope: `E:\writing-system\-personal-\master-spec\tbdv2.md` action IDs only (`D1-A*`..`D8-A*`).

## Status Legend
- `Implemented`: code/docs/tests for the action are present in current repo.
- `Partial`: significant parts are present, but required scope is incomplete.
- `Missing`: no implementation evidence for required scope.
- `Blocked`: cannot be verified from repo alone (environment/runtime execution/sign-off required).

## Summary
| Source | Implemented | Partial | Missing | Blocked | Total |
|---|---:|---:|---:|---:|---:|
| D1 | 0 | 0 | 15 | 0 | 15 |
| D2 | 1 | 5 | 15 | 4 | 25 |
| D3 | 1 | 0 | 2 | 0 | 3 |
| D4 | 1 | 1 | 4 | 0 | 6 |
| D5 | 0 | 7 | 0 | 2 | 9 |
| D6 | 12 | 2 | 1 | 0 | 15 |
| D7 | 0 | 2 | 2 | 0 | 4 |
| D8 | 10 | 4 | 2 | 1 | 17 |
| **Total** | **25** | **21** | **41** | **7** | **94** |

## Evidence Anchors (high-signal)
- No D1 connector implementation found: `system_ai_connectors|superuser-ai-connectors|runtime_primary|assistant_primary` -> `NO_MATCH` across `supabase/migrations`, `supabase/functions`, `web/src`.
- Worker still uses env Anthropic key directly: `supabase/functions/worker/index.ts:618`.
- D6 DB/API foundation exists: `supabase/migrations/20260213180000_021_agents_config_foundation.sql:4`, `supabase/migrations/20260213181000_022_provider_connections.sql:3`, `supabase/functions/agent-config/index.ts:102`, `supabase/functions/provider-connections/index.ts:113`.
- D6 /app/integrations parity not implemented: only marketing route exists `web/src/router.tsx:50`, no `/app/integrations` route.
- D8 save algorithms exist: `supabase/functions/schemas/index.ts:16`, `supabase/functions/schemas/index.ts:27`, `supabase/functions/schemas/index.ts:45`, `supabase/functions/schemas/index.ts:93`.
- D8 grid/review semantics exist: `web/src/components/blocks/BlockViewerGrid.tsx:321`, `web/src/components/blocks/BlockViewerGrid.tsx:399`, `web/src/components/blocks/BlockViewerGrid.tsx:451`, `web/src/components/blocks/BlockViewerGrid.tsx:498`.
- D8 compatibility pass/warn exists: `web/src/pages/SchemaWizard.tsx:261`, `web/src/pages/SchemaWizard.tsx:847`.
- D8 JSON escape hatch still missing (read-only preview only): `web/src/pages/SchemaWizard.tsx:891`.
- D8 source doc still marks gate evidence incomplete: `dev-todos/dev-todos/0212-priority7-schema-contracts-master-spec.md:174`.
- D7 template foundation exists partially: `web/src/lib/schemaTemplates.ts:2`, `web/src/pages/SchemaTemplates.tsx:6`, `web/src/pages/SchemaTemplateDetail.tsx:44`; apply flow scaffold still placeholder `web/src/pages/SchemaApply.tsx:42`.
- Web test baseline not present: no `*.test.ts(x)` under `web/src`.
- CI/CD baseline not present: no `.github/workflows` directory in repo root.

## Action-by-Action Status

### D1
- Missing: `D1-A01..D1-A15`.
- Notes:
  - Superuser system connector table/API/UI/worker precedence/audit rollout from D1 are not implemented.
  - Current worker credential path remains env-based (`supabase/functions/worker/index.ts:618`).

### D2
- Implemented:
  - `D2-A06` (prompt_config convention is defined in canonical schema contract docs): `dev-todos/dev-todos/0212-priority7-schema-contracts-master-spec.md:318`.
- Partial:
  - `D2-A11` (export exists but not full variant set): `supabase/functions/export-jsonl/index.ts:53`.
  - `D2-A20` (edge tests exist, frontend baseline absent): `supabase/functions/agent-config/index.test.ts:12`, `supabase/functions/provider-connections/index.test.ts:10`.
  - `D2-A23` (email confirmation flows exist; reset password/OAuth incomplete): `web/src/pages/Login.tsx:43`, `web/src/pages/Register.tsx:39`, `web/src/pages/AuthCallback.tsx:6`.
  - `D2-A24` (settings surface exists but lifecycle/admin scope incomplete): `web/src/pages/Settings.tsx:357`.
  - `D2-A25` (security hardening exists in places, but full CSP/rate/session pass not complete): `supabase/migrations/20260210200122_user_api_keys_security_hardening.sql:1`.
- Missing:
  - `D2-A01`, `D2-A02`, `D2-A03` (adapter interface/reference adapter/deterministic tests).
  - `D2-A04` (Pandoc package not version-pinned): `services/conversion-service/Dockerfile:17`.
  - `D2-A05` (runtime policy lock task not evidenced as completed).
  - `D2-A10` (document delete storage cleanup policy/job not implemented).
  - `D2-A12`, `D2-A13` (`reconstruct` function + toolbar download not implemented).
  - `D2-A14`, `D2-A15`, `D2-A16`, `D2-A17` (integrations page + Neo4j/webhook/DuckDB-Parquet integrations not implemented).
  - `D2-A19` (code-splitting pass not implemented).
  - `D2-A21` (error boundary + reconnection handling not implemented).
  - `D2-A22` (CI/CD baseline missing; no workflows dir).
- Blocked:
  - `D2-A07` (deployed secret verification requires env access).
  - `D2-A08`, `D2-A09` (runtime concurrency/E2E verification requires execution environment).
  - `D2-A18` (`Cloud Run 403` revalidation requires environment).

### D3
- Implemented:
  - `D3-A01` (max tokens baseline migration): `supabase/migrations/20260213204000_024_default_max_tokens_4096.sql:1`.
- Missing:
  - `D3-A02` (`CFG-004` still Proposed): `dev-todos/dev-todos/config-decision-log.md:106`.
  - `D3-A03` (historical baseline label backfill not evidenced).

### D4
- Implemented:
  - `D4-A04` (Google auth method split exists): `web/src/components/agents/forms/GoogleAuthPanel.tsx:100`.
- Partial:
  - `D4-A02` (card semantics improved with configured/needs setup badges, but deterministic full matrix closure not evidenced): `web/src/components/agents/AgentCard.tsx:38`.
- Missing:
  - `D4-A01` (duplicate provider editors still exist in Settings and Agents): `web/src/pages/Settings.tsx:55`, `web/src/pages/Agents.tsx:12`.
  - `D4-A03` (defaults precedence lock across docs/UI/runtime not finalized; CFG-004 still Proposed).
  - `D4-A05`, `D4-A06` (system connectors + final key precedence contract are not implemented).

### D5
- Partial:
  - `D5-A02` (migration requirements are implemented in SQL artifacts): `supabase/migrations/20260213180000_021_agents_config_foundation.sql:36`, `supabase/migrations/20260213182000_023_agents_config_security_hardening.sql:5`.
  - `D5-A04` (keyword normalization implemented and tested): `supabase/functions/agent-config/index.ts:27`, `supabase/functions/agent-config/index.test.ts:19`.
  - `D5-A05` (duplicate keyword guard implemented): `supabase/functions/agent-config/index.ts:201`, `supabase/migrations/20260213182000_023_agents_config_security_hardening.sql:5`.
  - `D5-A06` (connect validation + encrypted storage + non-disclosure tests): `supabase/functions/provider-connections/index.ts:156`, `supabase/functions/provider-connections/index.test.ts:93`.
  - `D5-A07` (status endpoint metadata-only behavior): `supabase/functions/provider-connections/index.ts:113`.
  - `D5-A08` (disconnect/status/readiness logic implemented): `supabase/functions/provider-connections/index.ts:122`, `supabase/functions/agent-config/index.ts:68`.
  - `D5-A09` (custom readiness rule implemented): `supabase/functions/agent-config/index.ts:57`.
- Blocked:
  - `D5-A01` (precondition confirmation requires live dev branch environment).
  - `D5-A03` (deterministic smoke sequence execution not evidenced in repo artifacts).

### D6
- Implemented:
  - `D6-A01`, `D6-A01a`: migration + capability columns + types (`supabase/migrations/20260213180000_021_agents_config_foundation.sql:4`, `supabase/migrations/20260213180000_021_agents_config_foundation.sql:10`, `web/src/lib/types.ts:106`).
  - `D6-A02`: provider connections migration + uniqueness (`supabase/migrations/20260213181000_022_provider_connections.sql:3`).
  - `D6-A03`: `agent-config` GET/PATCH + readiness (`supabase/functions/agent-config/index.ts:102`, `supabase/functions/agent-config/index.ts:154`).
  - `D6-A04`: `provider-connections` connect/disconnect/status (`supabase/functions/provider-connections/index.ts:113`, `supabase/functions/provider-connections/index.ts:148`).
  - `D6-A06`: routes/nav for agents/mcp/commands (`web/src/router.tsx:102`, `web/src/router.tsx:122`, `web/src/router.tsx:126`, `web/src/components/shell/nav-config.ts:38`).
  - `D6-A07`: Agents page search/cards/configure (`web/src/pages/Agents.tsx:30`, `web/src/components/agents/AgentCard.tsx:38`).
  - `D6-A08`: onboarding route/flow exists (`web/src/router.tsx:106`, `web/src/pages/AgentOnboardingSelect.tsx:21`).
  - `D6-A09`: provider config modal framework exists (`web/src/components/agents/AgentConfigModal.tsx:23`).
  - `D6-A10`: save/test/connect flow wiring exists (`web/src/components/agents/forms/ProviderCredentialsModule.tsx:84`, `web/src/components/agents/forms/GoogleAuthPanel.tsx:45`).
  - `D6-A11`: MCP placeholder catalog/cards exists (`web/src/components/mcp/mcp-catalog.ts:10`, `web/src/pages/McpServers.tsx:37`).
  - `D6-A14`: rollout flags implemented (`web/src/lib/featureFlags.ts:11`).
- Partial:
  - `D6-A12`: secret/validation improvements exist, but required accessibility details (`aria-label`, explicit input-linked errors) are not evidenced across agents forms.
  - `D6-A13`: edge tests exist, but frontend tests and runbook execution evidence are incomplete.
- Missing:
  - `D6-A05`: no authenticated `/app/integrations` route/page parity implementation (`web/src/router.tsx:50` only marketing `/integrations`).

### D7
- Partial:
  - `D7-A01`: template registry + browse/filter + detail + apply-to-wizard exist (`web/src/lib/schemaTemplates.ts:2`, `web/src/pages/SchemaTemplates.tsx:6`, `web/src/pages/SchemaTemplateDetail.tsx:50`), but apply flow is still scaffolded (`web/src/pages/SchemaApply.tsx:42`).
  - `D7-A04`: templates can prefill wizard and save through existing pipeline, but full acceptance/lineage proof is not complete.
- Missing:
  - `D7-A02`: in-schema AI assistant adaptation panel not implemented.
  - `D7-A03`: advanced intelligence (ranking/suggestions/feedback loop) not implemented.

### D8
- Implemented:
  - `D8-A02`: single save boundary through `POST /schemas` enforced (`supabase/functions/schemas/index.ts:60`).
  - `D8-A03`: save contract semantics implemented (`supabase/functions/schemas/index.ts:69`, `supabase/functions/schemas/index.ts:113`).
  - `D8-A04`: `schema_ref` derivation algorithm implemented (`supabase/functions/schemas/index.ts:16`, `supabase/functions/schemas/index.ts:45`).
  - `D8-A05`: deterministic `schema_uid` derivation implemented (`supabase/functions/schemas/index.ts:27`, `supabase/functions/schemas/index.ts:94`).
  - `D8-A06`: route/IA contract broadly implemented (`web/src/router.tsx:88`, `web/src/components/schemas/SchemaWorkflowNav.tsx:13`).
  - `D8-A07`: strict top-level wizard compatibility checks implemented (`web/src/pages/SchemaWizard.tsx:261`).
  - `D8-A10`: step-5 save conflict handling implemented (`web/src/pages/SchemaWizard.tsx:521`).
  - `D8-A12`: advanced editor embed mount API/asset contract implemented (`web/src/lib/metaConfiguratorEmbed.ts:25`, `web/src/pages/SchemaAdvancedEditor.tsx:161`).
  - `D8-A13`: branch controller paths A-E implemented (`web/src/pages/SchemaStart.tsx:38`, `web/src/pages/SchemaStart.tsx:68`).
  - `D8-A14`: grid/review semantics + RPC behavior implemented (`web/src/components/blocks/BlockViewerGrid.tsx:321`, `web/src/components/blocks/BlockViewerGrid.tsx:399`, `web/src/components/blocks/BlockViewerGrid.tsx:451`).
- Partial:
  - `D8-A01`: gate-critical scope mostly present, but source still tracks unresolved closure gaps.
  - `D8-A08`: nullable union supported (`web/src/pages/SchemaWizard.tsx:711`), nested object parity still incomplete.
  - `D8-A09`: pass/warn compatibility exists (`web/src/pages/SchemaWizard.tsx:847`), sample-block preview not implemented.
  - `D8-A16`: phase-1 closure is in progress; some required items remain open.
- Missing:
  - `D8-A11`: in-wizard editable JSON escape hatch contract not implemented (preview is read-only via `JsonViewer`): `web/src/pages/SchemaWizard.tsx:891`.
  - `D8-A15`: evidence matrix capture remains incomplete per source tracking (`dev-todos/dev-todos/0212-priority7-schema-contracts-master-spec.md:174`).
- Blocked:
  - `D8-A17`: phase-2/3 work is scheduled/deferred, not current execution scope.

## Conclusion
- `tbdv2` actions are not mostly net-new; a substantial foundation is already implemented in D6 and large parts of D8.
- Highest backlog concentration remains in D1 and D2 plus unresolved D8 closure tasks.
- Immediate backlog reduction should focus only on `Missing + Blocked` items after dependency filtering.
