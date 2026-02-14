# 2026-0213-0905-implement-superuser-ai-connectors-end-to-end

filename (UID): `2026-0213-0905-implement-superuser-ai-connectors-end-to-end.md`
problem: Superuser-owned system connector configuration is not fully implemented end to end, so credential control, runtime behavior, and auditability are incomplete.
solution: Implement superuser connectors as a complete vertical slice: database schema, secured API, worker credential resolution, superuser UI, audit trail, and verification evidence.
scope: Build and verify system AI connector management for `runtime_primary` and `assistant_primary`, including storage, APIs, UI controls, runtime consumption, and audit visibility.

## Included Implementation Rules

1. The system manages exactly two connector slots: `runtime_primary` and `assistant_primary`.
2. `runtime_primary` accepts provider `anthropic` only.
3. `assistant_primary` accepts `anthropic`, `openai`, `google`, and `custom`; when provider is `custom`, `base_url` is required and must be `http` or `https`.
4. Runtime credential resolution order is `runtime_primary -> user_api_keys -> env`.
5. If a higher-priority configured source is invalid or decrypt-failed, mark that source invalid and continue to the next source.
6. Connector changes must write audit records with before value, after value, actor, timestamp, and reason.
7. API responses never return encrypted key material.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Create a migration that adds `public.system_ai_connectors` and `public.system_ai_connectors_audit`, applies slot/provider/base-url checks, enables RLS, and inserts two baseline rows for `runtime_primary` and `assistant_primary` so the system starts with visible managed slots. | New migration file in `supabase/migrations/` and two rows present in `public.system_ai_connectors` (repo state: missing) |
| 2 | Implement `superuser-ai-connectors` edge API with `GET`, `PUT/PATCH`, and `DELETE` handlers that enforce superuser authorization, enforce all Included Implementation Rules, encrypt incoming keys before write, and return sanitized connector payloads only. | `supabase/functions/superuser-ai-connectors/index.ts` (repo state: missing) |
| 3 | Add shared connector-policy and validation modules that define the allowed slot/provider matrix, runtime precedence order, invalid-key continuation behavior, and custom base-url requirements so worker and API paths consume one policy source. | `supabase/functions/_shared/system-ai-connectors-policy.ts` (repo state: missing) |
| 4 | Update worker credential resolution to consume the shared policy module, resolve keys in `runtime_primary -> user_api_keys -> env` order, continue on invalid/decrypt-failed higher-priority source, and persist validity updates and audit metadata for failed configured sources. | Updated `supabase/functions/worker/index.ts` and supporting helper modules under `supabase/functions/worker/` (repo state: worker entry exists, connector policy wiring missing) |
| 5 | Implement the superuser UI section for system connectors with two slot cards, provider/base-url form controls, set/rotate/clear key actions, validation messages, status metadata (configured state, key suffix, updated timestamp), and copy that separates system connectors from user-level provider keys. | Updated `web/src/pages/SuperuserSettings.tsx` plus connector components under `web/src/` wired to `superuser-ai-connectors` (repo state: superuser page exists, connector slot UI/API wiring missing) |
| 6 | Add an audit retrieval path and UI audit panel that shows recent connector changes with before/after summary, actor, timestamp, and reason so superusers can verify every connector update from the interface. | Updated API and UI files under `supabase/functions/superuser-ai-connectors/` and `web/src/` with a rendered connector audit list (repo state: missing) |
| 7 | Add automated tests that cover authorization, slot/provider validation, custom base-url requirement, sanitized responses, worker precedence behavior, invalid-key continuation behavior, and audit record creation for connector updates. | New or updated test files under `supabase/functions/superuser-ai-connectors/` and `supabase/functions/worker/` (repo state: connector test suite missing) |
| 8 | Execute a smoke run that configures both slots, rotates a runtime key, runs the worker path, confirms connector resolution and audit behavior, and publishes a dated evidence record with commands, request/response snippets, and pass/fail status per Included Implementation Rule. | `dev-todos/_complete/2026-0213-superuser-connectors-smoke-evidence.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Schema lock: the two connector tables exist with enforced slot/provider/base-url constraints and baseline rows for both slots.
2. API lock: superuser-only connector endpoints are deployed and return sanitized payloads without encrypted secrets.
3. Runtime lock: worker code resolves credentials in `runtime_primary -> user_api_keys -> env` order and continues after invalid/decrypt-failed higher-priority sources.
4. UI lock: superuser settings renders both connector slots with edit, validate, and clear flows wired to the connector API.
5. Audit lock: every connector mutation produces a visible audit row with before/after, actor, timestamp, and reason.
6. Verification lock: automated tests for API, worker policy, and audit behavior pass and smoke evidence is published.
7. Final output lock: the smoke evidence file confirms all Included Implementation Rules as pass or explicitly records any failure.
