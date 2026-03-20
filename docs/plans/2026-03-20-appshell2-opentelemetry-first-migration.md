# AppShell2 OpenTelemetry MVP Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a focused observability shell (`AppShell2`) with production-ready traces and logs experiences first, built on your existing React shell patterns, and backed by a backend-agnostic telemetry adapter so SignalR can be plugged in without UI rewrites.

**Architecture:** Keep the current `/app` shell structure and add a dedicated observability branch under it (`/app/observability/*`). Introduce a strict data adapter (`ObservabilityProvider` + domain adapters) that converts backend payloads into frontend telemetry models. Build pages directly against the models, not backend APIs.

**Tech Stack:** React Router, React 19, TypeScript, Vitest, existing shared shell components (`AppLayout`, `LeftRailShadcn`, `TopCommandBar`), OpenTelemetry payload adapters, optional `@microsoft/signalr` transport.

---

## Migration Scope Decision (v1)

- In scope:
  - `AppShell2` route and nav shell for observability
  - Core traces page (`/app/observability/traces`) with list + detail view
  - Core logs page (`/app/observability/logs`) with query + streaming/live updates path via adapter
  - Telemetry landing status (`/app/observability/telemetry`) with backend availability checks
  - Small shared types + adapter layer and tests
- Out of scope for v1:
  - Full dashboards module
  - Non-core SIEM/security admin capabilities
  - Full parity with all SigNoz pages

## Task 1: Add OpenTelemetry domain types, adapters, and a stable service contract

**Files:**
- Create: [e:/writing-system/web/src/components/observability/types.ts](e:/writing-system/web/src/components/observability/types.ts)
- Create: [e:/writing-system/web/src/components/observability/realtime/types.ts](e:/writing-system/web/src/components/observability/realtime/types.ts)
- Create: [e:/writing-system/web/src/components/observability/realtime/adapter.ts](e:/writing-system/web/src/components/observability/realtime/adapter.ts)
- Create: [e:/writing-system/web/src/components/observability/realtime/httpAdapter.ts](e:/writing-system/web/src/components/observability/realtime/httpAdapter.ts)
- Create: [e:/writing-system/web/src/components/observability/realtime/signalrAdapter.ts](e:/writing-system/web/src/components/observability/realtime/signalrAdapter.ts)
- Create: [e:/writing-system/web/src/components/observability/api.ts](e:/writing-system/web/src/components/observability/api.ts)
- Modify: [e:/writing-system/web/src/lib/featureFlags.ts](e:/writing-system/web/src/lib/featureFlags.ts) (add `observabilityShellV2` toggle if absent)
- Add test: [e:/writing-system/web/src/components/observability/realtime/adapter.test.ts](e:/writing-system/web/src/components/observability/realtime/adapter.test.ts)

**Step 1: Write the failing test**
- Add unit tests for:
  - Parsing/normalizing a trace payload into `Trace`, `Span`, and `TraceTimelinePoint`.
  - Parsing/normalizing a log payload into `LogRecord` with optional correlation IDs.
  - Runtime transport abstraction: adapter exposes `connect`, `subscribe`, and `disconnect`, with one in-memory/mock test transport.

**Step 2: Run it to make sure it fails**
- Run: `npm -C web test web/src/components/observability/realtime/adapter.test.ts -t observability`
- Expected: test failure on missing module and contract mismatches.

**Step 3: Write the minimal implementation**
- Define canonical models:
  - `TenantContext`, `Span`, `Trace`, `LogRecord`, `MetricPoint`, `ServiceSummary`, `ObservabilityStatus`.
- Add adapter interface in `realtime/types.ts` and default noop-safe implementations.
- Add `httpAdapter.ts` that hits your existing `platformApiFetch` plus existing `/api/v1/.../logs`, `/api/v1/.../metrics` endpoints where present.
- Add `signalrAdapter.ts` behind feature/availability check (do not require backend yet).
- Export a single `createObservabilityApiClient()` from `api.ts` used by pages.

**Step 4: Run it to make sure it passes**
- Run: `npm -C web test web/src/components/observability/realtime/adapter.test.ts -t observability`
- Expected: PASS with adapter contract validation.

**Step 5: Commit**
- Run:
  - `git add web/src/components/observability web/src/lib/featureFlags.ts`
  - `git commit -m "feat(observability): add OpenTelemetry domain models and adapter contract"`

## Task 2: Introduce AppShell2 navigation + route scaffold for observability

**Files:**
- Modify: [e:/writing-system/web/src/components/shell/nav-config.ts](e:/writing-system/web/src/components/shell/nav-config.ts)
- Modify: [e:/writing-system/web/src/router.tsx](e:/writing-system/web/src/router.tsx)
- Create: [e:/writing-system/web/src/pages/observability/ObservabilityLayout.tsx](e:/writing-system/web/src/pages/observability/ObservabilityLayout.tsx)
- Create: [e:/writing-system/web/src/pages/observability/ObservabilityIndexRedirect.tsx](e:/writing-system/web/src/pages/observability/ObservabilityIndexRedirect.tsx)
- Create: [e:/writing-system/web/src/pages/observability/TelemetryStatusPage.tsx](e:/writing-system/web/src/pages/observability/TelemetryStatusPage.tsx) (lightweight shell landing)
- Add test: [e:/writing-system/web/src/components/shell/nav-config-observability.test.ts](e:/writing-system/web/src/components/shell/nav-config-observability.test.ts)

**Step 1: Write the failing test**
- Add assertions:
  - `Observability` is present in appropriate shell mode (pipeline classic).
  - `observability` drill config exposes `Telemetry`, `Traces`, `Logs`, and optional `Metrics`.
  - Route mapping contains `/app/observability` landing and nested route contracts.

**Step 2: Run it to make sure it fails**
- Run: `npm -C web test web/src/components/shell/nav-config-observability.test.ts`
- Expected: fail because expected paths/items don’t exist yet.

**Step 3: Write the minimal implementation**
- Keep existing existing `AppLayout` unchanged.
- Add an observability route group:
  - `/app/observability` -> redirect to `/app/observability/telemetry`
  - `/app/observability/telemetry`
  - `/app/observability/traces`
  - `/app/observability/logs`
- Add nav config entry in `PIPELINE_NAV` (and keep existing global `/app/logs` flow log page untouched for now).
- Add `ObservabilityLayout` wrapper that:
  - sets page shell title/crumbs (`useShellHeaderTitle`)
  - preserves current style tokens and container spacing.

**Step 4: Run it to make sure it passes**
- Run: `npm -C web test web/src/components/shell/nav-config-observability.test.ts web/src/pages/observability/ObservabilityLayout.test.tsx`
- Expected: PASS for config and basic route/shell behavior.

**Step 5: Commit**
- Run:
  - `git add web/src/components/shell/nav-config.ts web/src/router.tsx web/src/pages/observability web/src/components/shell/nav-config-observability.test.ts`
  - `git commit -m "feat(observability): add AppShell2 route shell and nav wiring"`

## Task 3: Implement Observability Traces v1 (list + detail) for OpenTelemetry semantics

**Files:**
- Create: [e:/writing-system/web/src/pages/observability/ObservabilityTracesPage.tsx](e:/writing-system/web/src/pages/observability/ObservabilityTracesPage.tsx)
- Create: [e:/writing-system/web/src/pages/observability/ObservabilityTraceDetailPage.tsx](e:/writing-system/web/src/pages/observability/ObservabilityTraceDetailPage.tsx)
- Create: [e:/writing-system/web/src/components/observability/TracesTable.tsx](e:/writing-system/web/src/components/observability/TracesTable.tsx)
- Create: [e:/writing-system/web/src/components/observability/TraceDetailsPanel.tsx](e:/writing-system/web/src/components/observability/TraceDetailsPanel.tsx)
- Add test: [e:/writing-system/web/src/components/observability/TracesTable.test.tsx](e:/writing-system/web/src/components/observability/TracesTable.test.tsx)
- Add test: [e:/writing-system/web/src/pages/observability/ObservabilityTracesPage.test.tsx](e:/writing-system/web/src/pages/observability/ObservabilityTracesPage.test.tsx)

**Step 1: Write the failing test**
- Add component tests for:
  - trace list renders rows from fixture payload.
  - clicking row routes to `/app/observability/traces/:traceId`.
  - detail page renders service/latency/status/chunk summary from adapter.

**Step 2: Run it to make sure it fails**
- Run: `npm -C web test web/src/pages/observability/ObservabilityTracesPage.test.tsx`
- Expected: missing components/modules until implementation.

**Step 3: Write the minimal implementation**
- Add table page that queries traces through `createObservabilityApiClient().fetchTraces`.
- Add detail panel that reads `useParams().traceId`, fetches details, and renders core fields:
  - traceId, root span, duration, status, time range, top attributes.
- If backend data not ready, show graceful "No traces yet" empty state with sample filter controls.

**Step 4: Run it to make sure it passes**
- Run: `npm -C web test web/src/components/observability/TracesTable.test.tsx web/src/pages/observability/ObservabilityTracesPage.test.tsx`
- Expected: PASS.

**Step 5: Commit**
- Run:
  - `git add web/src/pages/observability/ObservabilityTracesPage.tsx web/src/pages/observability/ObservabilityTraceDetailPage.tsx web/src/components/observability web/src/test`
  - `git commit -m "feat(observability): add trace list and detail pages"`

## Task 4: Implement Observability Logs v1 (query + replay/live)

**Files:**
- Create: [e:/writing-system/web/src/pages/observability/ObservabilityLogsPage.tsx](e:/writing-system/web/src/pages/observability/ObservabilityLogsPage.tsx)
- Create: [e:/writing-system/web/src/components/observability/LogsSearchPanel.tsx](e:/writing-system/web/src/components/observability/LogsSearchPanel.tsx)
- Create: [e:/writing-system/web/src/components/observability/LogsTable.tsx](e:/writing-system/web/src/components/observability/LogsTable.tsx)
- Create: [e:/writing-system/web/src/components/observability/LiveLogFeed.tsx](e:/writing-system/web/src/components/observability/LiveLogFeed.tsx)
- Add test: [e:/writing-system/web/src/components/observability/LogsTable.test.tsx](e:/writing-system/web/src/components/observability/LogsTable.test.tsx)
- Add test: [e:/writing-system/web/src/pages/observability/ObservabilityLogsPage.test.tsx](e:/writing-system/web/src/pages/observability/ObservabilityLogsPage.test.tsx)

**Step 1: Write the failing test**
- Add tests for:
  - filtering UI behavior (time window/search/min level).
  - static log rows render in chronological order.
  - live feed callback integration receives event payload and appends rows.

**Step 2: Run it to make sure it fails**
- Run: `npm -C web test web/src/pages/observability/ObservabilityLogsPage.test.tsx -t logs`
- Expected: FAIL on missing modules and behavior.

**Step 3: Write the minimal implementation**
- Add log query panel and table.
- Pull initial logs via adapter (`fetchLogs`), use same model types from Task 1.
- Add `LiveLogFeed` using adapter transport:
  - For v1 if SignalR unavailable, keep polling interval or SSE fallback path.
  - Ensure disconnect/cleanup on unmount.
- Reuse existing shell patterns for loading/empty/error states.

**Step 4: Run it to make sure it passes**
- Run:
  - `npm -C web test web/src/components/observability/LogsTable.test.tsx web/src/pages/observability/ObservabilityLogsPage.test.tsx`
- Expected: PASS.

**Step 5: Commit**
- Run:
  - `git add web/src/pages/observability/ObservabilityLogsPage.tsx web/src/components/observability web/src/components/ui`
  - `git commit -m "feat(observability): add logs query and live feed"`

## Task 5: Replace placeholder telemetry page with OTEL status + readiness card

**Files:**
- Modify: [e:/writing-system/web/src/pages/observability/TelemetryStatusPage.tsx](e:/writing-system/web/src/pages/observability/TelemetryStatusPage.tsx)
- Add test: [e:/writing-system/web/src/pages/observability/TelemetryStatusPage.test.tsx](e:/writing-system/web/src/pages/observability/TelemetryStatusPage.test.tsx)

**Step 1: Write the failing test**
- Add tests for:
  - page renders backend status chips (traces/logs/metrics availability).
  - empty/missing status gracefully degrades.

**Step 2: Run it to make sure it fails**
- Run: `npm -C web test web/src/pages/observability/TelemetryStatusPage.test.tsx`
- Expected: component not implemented fully yet.

**Step 3: Write the minimal implementation**
- Use `useShellHeaderTitle({ title: 'Telemetry', breadcrumbs: ['Observability', 'Telemetry'] })`.
- Show readiness state from adapter (or fallback `unknown` when endpoint missing).
- Add one action row: “Open traces” and “Open logs” quick links.

**Step 4: Run it to make sure it passes**
- Run: `npm -C web test web/src/pages/observability/TelemetryStatusPage.test.tsx`
- Expected: PASS.

**Step 5: Commit**
- Run:
  - `git add web/src/pages/observability/TelemetryStatusPage.tsx web/src/pages/observability/TelemetryStatusPage.test.tsx`
  - `git commit -m "feat(observability): replace placeholder telemetry with status surface"`

## Task 6: Add package/deployment + env checks

**Files:**
- Modify: [e:/writing-system/web/package.json](e:/writing-system/web/package.json) (add `@microsoft/signalr` behind v1 dependency strategy if required)
- Modify: [e:/writing-system/.env.example](e:/writing-system/.env.example)
- Modify: [e:/writing-system/web/src/lib/featureFlags.ts](e:/writing-system/web/src/lib/featureFlags.ts)

**Step 1: Write the failing test**
- Add a simple check test in `web/src/lib/featureFlags.test.ts` to verify new flags default behavior.

**Step 2: Run it to make sure it fails**
- Run: `npm -C web test web/src/lib/featureFlags.test.ts`
- Expected: failing due to missing feature flag and env docs.

**Step 3: Write the minimal implementation**
- Add flags:
  - `VITE_FF_OBSERVABILITY_SHELL_V2`
  - `VITE_OBSERVABILITY_SIGNALR_URL` (if using SignalR)
  - `VITE_OBSERVABILITY_POLL_MS`
- Add notes to `.env.example` only; do not check secrets.

**Step 4: Run it to make sure it passes**
- Run: `npm -C web test web/src/lib/featureFlags.test.ts`
- Expected: PASS.

**Step 5: Commit**
- Run:
  - `git add web/package.json .env.example web/src/lib/featureFlags.ts web/src/lib/featureFlags.test.ts`
  - `git commit -m "chore(observability): add transport + shell feature flags"`

## Task 7: End-to-end validation checklist

**Files:**
- Update: [e:/writing-system/docs/`2026-03-20-appshell2-opentelemetry-first-migration.md`](e:/writing-system/docs/2026-03-20-appshell2-opentelemetry-first-migration.md)
- Run: [e:/writing-system/web/src](e:/writing-system/web/src)

**Step 1: Write a test scenario list**
- Create a manual verification section in the plan file:
  - `/app/observability` redirects to telemetry
  - `/app/observability/traces` list + row click
  - `/app/observability/logs` filtering + live update fallback

**Step 2: Run it to make sure it fails**
- Run: `npm -C web test web/src/**/*observability*`
- Expected: known failures in optional integrations and transport if no backend is present; this is expected.

**Step 3: Write minimal implementation**
- Run app and verify:
  - left rail includes Observability section
  - top header continues existing behavior
  - no regressions on `/app/flows` and `/app/settings`
- Capture screenshots for acceptance.

**Step 4: Run it to make sure it passes**
- Run in browser against current env:
  - `npm -C web dev`
  - open:
    - `/app/observability/telemetry`
    - `/app/observability/traces`
    - `/app/observability/logs`

**Step 5: Commit**
- Run:
  - `git add docs/plans/2026-03-20-appshell2-opentelemetry-first-migration.md`
  - `git commit -m "docs(plan): record observability shell v1 validation checklist"`

Plan complete and saved to `docs/plans/2026-03-20-appshell2-opentelemetry-first-migration.md`.  

### Execution options

1. **Subagent-Driven (this session)**  
   I dispatch a fresh subagent per task, review each checkpoint, and keep you in the loop for scope/routing decisions before proceeding to the next task.

2. **Parallel Session (separate)**  
   Open a new session and execute task-by-task with `executing-plans` in checkpoint cadence.

Choose one.
