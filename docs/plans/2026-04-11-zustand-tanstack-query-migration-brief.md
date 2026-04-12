# Development Brief: Zustand + TanStack Query Migration

**Date:** 2026-04-11
**Status:** DRAFT — awaiting discussion and confirmation
**Scope:** Frontend state management migration (web/)

---

## 1. Executive Summary

Migrate the frontend from raw `useState` + `useEffect` + `useCallback` patterns to **Zustand** (client/UI state) + **TanStack Query** (server/API state). Add a **superuser State Observatory page** that surfaces query cache health, store state, and mutation activity as an internal devtool.

### Why now

- 18+ hooks follow identical fetch-loading-error boilerplate
- Permission groups hook has **18 useState calls**
- 4 context/singleton providers have ~300 lines of hand-rolled cache/dedup logic each
- No data caching between navigations — every page mount re-fetches
- No mutation→refetch coordination — manual `await loadItems()` after every create/update

### What we get

- **Eliminated boilerplate:** ~36 files rewritten, ~2000 lines of state wiring removed
- **Automatic caching:** navigate away and back → instant render from cache + background refetch
- **Mutation→invalidation:** create a benchmark → list auto-refetches, no manual wiring
- **Deduplication:** two components using same data → one API call
- **Observable state:** superuser page showing live query cache, store snapshots, and mutation history

---

## 2. New Dependencies

| Package | Size | Purpose |
|---------|------|---------|
| `zustand` | ~2KB gzip | Client/UI state stores |
| `@tanstack/react-query` | ~13KB gzip | Server state management |
| `@tanstack/react-query-devtools` | ~40KB (dev only, lazy) | Floating devtools panel |
| `@sucoza/zustand-devtools-plugin` | ~2KB | Bridges Zustand stores into TanStack DevTools panel |

**Total production bundle impact:** ~15KB gzip

---

## 3. Infrastructure Changes

### 3.1 New files (scaffolding)

| File | Purpose |
|------|---------|
| `web/src/lib/queryClient.ts` | QueryClient singleton with default options |
| `web/src/stores/README.md` | Convention doc for Zustand stores |
| `web/src/stores/benchmarkStepsStore.ts` | Example: first Zustand store (Cat B) |
| `web/src/stores/permissionGroupsUIStore.ts` | UI state for permission groups page |
| `web/src/stores/assistantChatStore.ts` | Streaming chat state |
| `web/src/pages/superuser/StateObservatory.tsx` | NEW: Internal devtools surface |
| `web/src/pages/superuser/StateObservatory.test.tsx` | Tests for observatory page |

### 3.2 Modified files (App wiring)

| File | Change |
|------|--------|
| `web/src/App.tsx` | Wrap tree with `<QueryClientProvider>`, add `<ReactQueryDevtools>` in dev |
| `web/src/router.tsx` | Add route for `/app/superuser/state-observatory` |
| `web/src/components/admin/AdminLeftNav.tsx` | Add nav entry for State Observatory |
| `web/package.json` | Add 4 dependencies |

---

## 4. Migration Inventory — Complete File-by-File

### Category A: Pure Server-State → TanStack Query replaces entirely

These hooks currently manage `useState(data) + useState(loading) + useState(error) + useEffect(fetch)`. TanStack Query eliminates the state management — the hook becomes a thin `useQuery` wrapper or is inlined at the call site.

| # | Hook file | Current useState count | After Z+T | Stores needed |
|---|-----------|----------------------|-----------|---------------|
| 1 | `hooks/useDocuments.ts` | 3 | `useQuery` one-liner, file shrinks to ~5 lines | None |
| 2 | `hooks/useBlocks.ts` | 4 | `useQuery` with `keepPreviousData` for pagination | None |
| 3 | `hooks/useRuns.ts` | 3 | `useQuery` one-liner | None |
| 4 | `hooks/useProjectDocuments.ts` | 3 | `useQuery` one-liner | None |
| 5 | `hooks/useExtractionSchemas.ts` | 3 (+mutations) | `useQuery` + `useMutation` × 3. Realtime sub → `invalidateQueries` on change | None |
| 6 | `hooks/agchain/useAgchainBenchmarks.ts` | 5 | `useQuery` for list + `useMutation` for create. Pagination via query key params | None |
| 7 | `hooks/agchain/useAgchainDatasets.ts` | 4 | `useInfiniteQuery` for cursor pagination — eliminates manual `setItems(prev => [...prev])` | None |
| 8 | `hooks/agchain/useAgchainDatasetDetail.ts` | 10 | 6× `useQuery` (detail, versions, source, mapping, validation, samples). Each tab loads independently with own cache key | None |
| 9 | `hooks/agchain/useAgchainTools.ts` | 10 | `useQuery` × 3 (list, bootstrap, secrets) + `useMutation` × 5 (create, update, archive, publish, preview). Selected detail → `useQuery({ enabled: !!toolKey })` | None |
| 10 | `hooks/agchain/useAgchainOrganizationMembers.ts` | ~6 | `useQuery` for members/invites + `useMutation` for invite/remove/role-change | None |
| 11 | `hooks/agchain/useAgchainPermissionGroups.ts` | **18** | `useQuery` × 5 (groups, permissions, detail, members, available-members) + `useMutation` × 3 (create-group, add-members, remove-member). Search/memberSearch → local useState (only 2 left) | `permissionGroupsUIStore` for search + selected group |
| 12 | `hooks/agchain/useAgchainAdminRegistry.ts` | ~4 | `useQuery` for registry list | None |
| 13 | `hooks/useIndexBuilderList.ts` | 3 | `useQuery` with `select` transform | None |
| 14 | `hooks/useLoadRun.ts` | ~4 | `useQuery` for run detail | None |
| 15 | `hooks/useStorageQuota.ts` | shared singleton | `useQuery({ staleTime: 30_000 })` — TQ handles singleton dedup automatically. Deletes ~60 lines of manual useSyncExternalStore | None |
| 16 | `hooks/useOperationalReadiness.ts` | **12+** | `useQuery` for bootstrap/snapshot/summary/surfaces + `useMutation` for verify-check. Nested checkDetails → `useQuery({ queryKey: ['readiness-check', checkId] })` per check | None |
| 17 | `hooks/useExtractRuntimeReadiness.ts` | ~3 | `useQuery` one-liner | None |
| 18 | `hooks/useSuperuserProbe.ts` | ~3 | `useMutation` — fire-and-get-result | None |

**Subtotal: 18 hooks. Zustand needed for: 1 (permission groups UI). TanStack Query handles the rest.**

### Category B: Server-State + Complex UI State → TQ + Zustand

These hooks manage both API data AND meaningful UI state (selections, dirty flags, draft forms, coordinated panels).

| # | Hook file | Current useState count | Server state → TQ | UI state → Zustand store |
|---|-----------|----------------------|-------------------|-------------------------|
| 19 | `hooks/agchain/useAgchainBenchmarkSteps.ts` | **11** | `useQuery` × 4 (detail, steps, toolBag, availableTools) + `useMutation` × 5 | `benchmarkStepsStore`: selectedStepId, dirtyOrder, dirtyToolBag |
| 20 | `hooks/agchain/useAgchainDatasetDraft.ts` | 8 + polling | `useQuery` for draft + `useMutation` for create/update/commit/preview. Polling → `useQuery({ refetchInterval: 3000, enabled: !!operationId })` | Minimal: diffSummary display |
| 21 | `hooks/useIndexBuilderJob.ts` | 6+ | `useQuery` for existing job + `useMutation` for save/download | `indexBuilderStore`: jobName, savedSnapshot |
| 22 | `hooks/usePipelineSourceSet.ts` | ~5 | `useQuery` for source set list | UI: activeSourceSetId, sourceSetLabel |
| 23 | `hooks/usePipelineJob.ts` | ~4 | `useQuery` for job status | Transient job config |
| 24 | `hooks/useAssistantChat.ts` | 5 + streaming | `useQuery` for threads + messages | `assistantChatStore`: threadId, isStreaming, messages (streaming appends) |
| 25 | `pages/superuser/usePlanTracker.tsx` | (delegates) | If fetches plan data from API | Workbench pane layout, editor state |

**Subtotal: 7 hooks. New Zustand stores: ~4-5 small stores.**

### Category C: Pure UI-State / Utility → Leave as-is

| # | Hook file | Reason to leave |
|---|-----------|-----------------|
| 26 | `hooks/useOverlays.ts` | Simple modal open/close — no store needed |
| 27 | `hooks/useDebouncedValue.ts` | Utility, not state management |
| 28 | `hooks/useDraggable.ts` | DOM interaction helper |
| 29 | `hooks/useMonacoTheme.ts` | Single derived value |
| 30 | `hooks/useTheme.tsx` | Could become tiny store if needed for sharing |
| 31 | `hooks/use-mobile.tsx` | Media query hook |
| 32 | `hooks/useBlockTypeRegistry.ts` | Static registry lookup |
| 33 | `hooks/useExternalScript.ts` | Script loader utility |

**Subtotal: 8 hooks. No changes.**

### Category D: Context Providers / Singletons → TQ + thin Zustand

These are the most complex state code today — hand-rolled `useSyncExternalStore` with manual inflight tracking, dedup, and broadcast. Most dramatic simplification.

| # | File | Current complexity | After Z+T |
|---|------|--------------------|-----------|
| 34 | `contexts/AgchainWorkspaceContext.tsx` | ~200 lines: manual useSyncExternalStore + inflight map + request token dedup + error preservation + localStorage persistence | `useQuery({ queryKey: ['workspace', orgId] })` for orgs+projects. Zustand `persist` store for selectedOrgId/selectedProjectId. **~150 lines deleted** |
| 35 | `hooks/useProjectFocus.ts` | ~180 lines: module-level singleton + useSyncExternalStore + CustomEvent broadcast + inflight dedup | `useQuery({ queryKey: ['project-catalog'] })` + Zustand for focusedProjectId. Broadcast → `invalidateQueries`. **~140 lines deleted** |
| 36 | `hooks/agchain/useOrganizationModelProviders.ts` | ~80 lines: manual singleton + useSyncExternalStore | `useQuery({ queryKey: ['org-providers', orgId] })`. **Hook becomes 10 lines** |
| 37 | `hooks/agchain/useProjectModelProviders.ts` | ~80 lines: manual singleton + useSyncExternalStore | `useQuery({ queryKey: ['project-providers', projectId] })`. **Hook becomes 10 lines** |

**Subtotal: 4 providers. ~540 lines of manual cache/dedup logic eliminated.**

### Category E: Pages with Significant Inline State → TQ replaces

| # | Page file | Current useState count | After Z+T |
|---|-----------|----------------------|-----------|
| 38 | `pages/superuser/CoordinationRuntime.tsx` | 7 | 3× `useQuery`. Page drops to ~20 render lines |
| 39 | `pages/PipelineServicesPage.tsx` | 4 | `useQuery` + 2× `useMutation` for probes |
| 40 | `pages/superuser/DesignLayoutCaptures.tsx` | ~5 | `useQuery` for list + `useMutation` for create |
| 41 | `pages/ObservabilityTelemetry.tsx` | ~4 | `useQuery` |
| 42 | `pages/ObservabilityTraces.tsx` | ~4 | `useQuery` |
| 43 | `pages/superuser/SuperuserApiEndpoints.tsx` | ~3 | `useQuery` |
| 44 | `pages/FlowsList.tsx` | ~3 | `useQuery` |

**Subtotal: 7 pages rewritten.**

### Category F: Special Cases

| # | Hook file | Decision | Reason |
|---|-----------|----------|--------|
| — | `hooks/useCoordinationStream.ts` | **Keep as-is** | SSE/EventSource stream — not request/response |
| — | `hooks/useDirectUpload.ts` | **Zustand store** | Upload progress, file queue, abort — imperative UI state |
| — | `hooks/useBatchParse.ts` | **useMutation** | Fire-and-track pattern |
| — | `hooks/useDropboxChooser.ts` | **Keep as-is** | SDK wrapper |
| — | `hooks/useGoogleDrivePicker.ts` | **Keep as-is** | SDK wrapper |
| — | `hooks/useAdminSurfaceAccess.ts` | **Keep as-is** | Pure derivation from auth |
| — | `hooks/usePlatformApiDevRecovery.ts` | **Keep as-is** | Dev utility |
| — | `hooks/agchain/useAgchainProjectFocus.ts` | **Thin wrapper** | Changes with Cat D workspace migration |
| — | `hooks/agchain/useAgchainScopeState.ts` | **Keep as-is** | Pure derivation |

---

## 5. Metrics Summary

| Metric | Count |
|--------|-------|
| Total state areas audited | 52 |
| Files modified | 36 |
| Files left untouched | 16 |
| New files created | ~8 |
| New Zustand stores | ~5 |
| Lines of boilerplate removed (est.) | ~2,000 |
| Lines of manual cache/dedup removed (est.) | ~540 |
| New dependencies | 4 (2 production, 2 dev) |
| Production bundle increase | ~15KB gzip |
| New superuser page | 1 (State Observatory) |

---

## 6. State Observatory — Superuser Internal Devtools Page

### 6.1 What exists in the ecosystem

| Tool | What it does | Our usage |
|------|-------------|-----------|
| `@tanstack/react-query-devtools` → `ReactQueryDevtoolsPanel` | Embeddable panel showing all query keys, their status (fresh/stale/fetching/inactive), data previews, cache timings | Embed as a section in our custom page |
| `@sucoza/zustand-devtools-plugin` | Bridges Zustand store snapshots into TanStack DevTools panel | Register all stores for unified view |
| Zustand `devtools` middleware | Sends actions to Redux DevTools Extension | Use for time-travel debugging in browser |
| `queryClient.getQueryCache().getAll()` | Programmatic access to all cached queries — keys, state, dataUpdatedAt, fetchStatus | Build custom table/dashboard |

### 6.2 Custom State Observatory page design

**Route:** `/app/superuser/state-observatory`
**Guard:** SuperuserGuard (existing pattern)

**Sections:**

#### Panel 1: Query Cache Health
- Table of all active query keys with columns: Key, Status (fresh/stale/fetching/inactive/error), Last Updated, Fetch Count, Data Size
- Color-coded status badges (green/yellow/blue/gray/red)
- Actions: Invalidate single query, Invalidate all, Refetch
- Auto-refresh every 2s via `useQuery({ queryKey: ['observatory-cache'], queryFn: () => queryClient.getQueryCache().getAll(), refetchInterval: 2000 })`

#### Panel 2: Mutation Log
- Rolling list of recent mutations with: Key, Status (idle/pending/success/error), Variables, Timestamp
- Uses `queryClient.getMutationCache().getAll()`
- Filterable by status

#### Panel 3: Zustand Store Snapshots
- Table of registered stores with current state preview (JSON tree)
- Uses Zustand's `getState()` on each registered store
- Expandable rows for full state inspection

#### Panel 4: Embedded TanStack DevTools
- Full `ReactQueryDevtoolsPanel` embedded inline (not floating)
- Toggle to show/hide
- Uses the documented embedded mode pattern

#### Panel 5: Diagnostics
- Total queries in cache, total active, total stale, total errored
- Cache hit rate (queries that rendered from cache vs fresh fetch)
- Largest cached payloads
- Stores registered count, total store state size

### 6.3 Implementation pattern

```tsx
// Simplified structure — full implementation in plan
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { useQueryClient } from '@tanstack/react-query';

function StateObservatory() {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  const mutations = queryClient.getMutationCache().getAll();

  return (
    <WorkbenchPage title="State Observatory">
      <QueryCacheHealthTable queries={queries} />
      <MutationLog mutations={mutations} />
      <ZustandStoreSnapshots />
      <ReactQueryDevtoolsPanel />
    </WorkbenchPage>
  );
}
```

---

## 7. QueryClient Configuration

```ts
// web/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s before data is considered stale
      gcTime: 5 * 60 * 1000,     // 5min garbage collection
      retry: 1,                    // One retry on failure
      refetchOnWindowFocus: false, // Don't refetch on tab focus (our app is long-session)
      throwOnError: false,         // Handle errors in components, not error boundaries
    },
    mutations: {
      retry: 0,                    // No retry on mutations
    },
  },
});
```

---

## 8. Zustand Store Convention

```ts
// web/src/stores/[storeName].ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ExampleUIState {
  selectedId: string | null;
  isDirty: boolean;
  // Actions
  setSelectedId: (id: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
}

export const useExampleUIStore = create<ExampleUIState>()(
  devtools(
    (set) => ({
      selectedId: null,
      isDirty: false,
      setSelectedId: (id) => set({ selectedId: id }, undefined, 'example/setSelectedId'),
      markDirty: () => set({ isDirty: true }, undefined, 'example/markDirty'),
      markClean: () => set({ isDirty: false }, undefined, 'example/markClean'),
    }),
    { name: 'ExampleUIStore' },
  ),
);
```

Convention:
- All stores in `web/src/stores/`
- Named `use[Domain]Store`
- `devtools` middleware always applied with named actions
- Stores hold **only** UI/client state — never server data
- Server data lives in TanStack Query cache

---

## 9. Migration Execution Order

### Phase 0: Scaffolding (1 hour)
- Install dependencies
- Create `queryClient.ts`
- Wrap App.tsx with `QueryClientProvider`
- Add `ReactQueryDevtools` in dev mode
- Create `stores/` directory

### Phase 1: Easy wins — simple fetch hooks (Cat A, simple ones) (2-3 hours)
- `useDocuments`, `useBlocks`, `useRuns`, `useProjectDocuments` — one-liner conversions
- `useExtractionSchemas` — good test of mutation+realtime pattern
- `useAgchainAdminRegistry`, `useExtractRuntimeReadiness`, `useSuperuserProbe`
- **Verify:** navigate away and back → data loads from cache

### Phase 2: List+mutation hooks (Cat A, complex) (3-4 hours)
- `useAgchainBenchmarks`, `useAgchainDatasets`, `useAgchainTools`
- `useAgchainOrganizationMembers`, `useAgchainPermissionGroups`
- `useOperationalReadiness`
- `useIndexBuilderList`, `useLoadRun`, `useStorageQuota`
- **Verify:** create an item → list auto-refetches

### Phase 3: Complex workbench hooks (Cat B) (4-5 hours)
- `useAgchainBenchmarkSteps` — first Zustand store + TQ combination
- `useAgchainDatasetDraft` — polling migration
- `useIndexBuilderJob`, `usePipelineSourceSet`, `usePipelineJob`
- `useAssistantChat` — streaming exception
- **Verify:** dirty flags, selection state, polling all work

### Phase 4: Provider/singleton rewrites (Cat D) (3-4 hours)
- `AgchainWorkspaceContext` — biggest single win
- `useProjectFocus` — module singleton → TQ
- `useOrganizationModelProviders`, `useProjectModelProviders`
- **Verify:** org/project switching, cross-component data sharing

### Phase 5: Page inline state (Cat E) (2-3 hours)
- `CoordinationRuntime`, `PipelineServicesPage`, `DesignLayoutCaptures`
- `ObservabilityTelemetry`, `ObservabilityTraces`, `SuperuserApiEndpoints`, `FlowsList`
- **Verify:** each page loads, refreshes, and handles errors

### Phase 6: State Observatory page (Cat new) (3-4 hours)
- Build the superuser page with all 5 panels
- Register Zustand stores for inspection
- Add route and nav entry
- **Verify:** page shows live cache state, mutations, store snapshots

### Phase 7: Cleanup (1-2 hours)
- Remove dead code (old singleton patterns, manual inflight tracking)
- Run full test suite
- Update any snapshot tests broken by provider changes

**Estimated total: 19-26 hours of implementation work across ~7 sessions.**

---

## 10. Before/After Examples

### Example 1: useDocuments (simplest case)

**BEFORE (25 lines):**
```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';

export function useDocument(sourceUid: string | undefined) {
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceUid) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from(TABLES.documents)
      .select('*')
      .eq('source_uid', sourceUid)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (!data) setError('Document not found');
        else setDoc(data as DocumentRow);
        setLoading(false);
      });
  }, [sourceUid]);

  return { doc, loading, error };
}
```

**AFTER (12 lines):**
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';

export function useDocument(sourceUid: string | undefined) {
  return useQuery({
    queryKey: ['document', sourceUid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.documents)
        .select('*')
        .eq('source_uid', sourceUid!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Document not found');
      return data as DocumentRow;
    },
    enabled: !!sourceUid,
  });
}
```

**Caller changes:** `{ doc, loading, error }` → `{ data: doc, isLoading, error }` (rename destructuring at call sites).

---

### Example 2: useAgchainBenchmarks (list + create mutation)

**BEFORE (65 lines):**
```ts
export function useAgchainBenchmarks() {
  const [items, setItems] = useState<AgchainBenchmarkRegistryRow[]>([]);
  const [pagination, setPagination] = useState<Pick<...>>({ total: 0, limit: 50, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const nextPage = await fetchAgchainBenchmarkRegistry(pagination.limit, pagination.offset);
      setItems(nextPage.items);
      setPagination({ total: nextPage.total, limit: nextPage.limit, offset: nextPage.offset });
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const createBenchmark = useCallback(async (payload) => {
    setCreating(true);
    try {
      const result = await createAgchainBenchmark(payload);
      await loadItems(); // Manual refetch
      setError(null);
      return result;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    } finally {
      setCreating(false);
    }
  }, [loadItems]);

  return { items, pagination, loading, creating, error, reload: loadItems, createBenchmark };
}
```

**AFTER (30 lines):**
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAgchainBenchmarks(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['agchain-benchmarks', { limit, offset }],
    queryFn: () => fetchAgchainBenchmarkRegistry(limit, offset),
  });

  const createMutation = useMutation({
    mutationFn: createAgchainBenchmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agchain-benchmarks'] });
    },
  });

  return {
    items: query.data?.items ?? [],
    pagination: {
      total: query.data?.total ?? 0,
      limit: query.data?.limit ?? limit,
      offset: query.data?.offset ?? offset,
    },
    loading: query.isLoading,
    creating: createMutation.isPending,
    error: query.error?.message ?? createMutation.error?.message ?? null,
    reload: () => query.refetch(),
    createBenchmark: createMutation.mutateAsync,
  };
}
```

**Key change:** `onSuccess: invalidateQueries` replaces `await loadItems()`. TQ handles the refetch automatically.

---

### Example 3: CoordinationRuntime page (inline state)

**BEFORE (~80 lines of state in the page component):**
```tsx
export function Component() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<CoordinationStatusResponse | null>(null);
  const [identities, setIdentities] = useState<CoordinationIdentityResponse | null>(null);
  const [discussions, setDiscussions] = useState<CoordinationDiscussionResponse | null>(null);

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const nextStatus = await getCoordinationStatus();
      const [nextIdentities, nextDiscussions] = await Promise.all([
        getCoordinationIdentities({ includeStale: true }),
        getCoordinationDiscussions({ status: 'all', limit: 50 }),
      ]);
      setStatus(nextStatus);
      setIdentities(nextIdentities);
      setDiscussions(nextDiscussions);
      setDisabledMessage(null);
    } catch (nextError) {
      if (nextError instanceof CoordinationRuntimeDisabledError) {
        setDisabledMessage(nextError.message);
      } else {
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  // ... 50+ lines of render
}
```

**AFTER (~25 lines of state):**
```tsx
export function Component() {
  useShellHeaderTitle({ title: 'Coordination Runtime', breadcrumbs: ['Superuser', 'Coordination Runtime'] });

  const statusQuery = useQuery({
    queryKey: ['coordination', 'status'],
    queryFn: getCoordinationStatus,
    retry: (count, error) => !(error instanceof CoordinationRuntimeDisabledError),
  });

  const identitiesQuery = useQuery({
    queryKey: ['coordination', 'identities'],
    queryFn: () => getCoordinationIdentities({ includeStale: true }),
    enabled: statusQuery.isSuccess,
  });

  const discussionsQuery = useQuery({
    queryKey: ['coordination', 'discussions'],
    queryFn: () => getCoordinationDiscussions({ status: 'all', limit: 50 }),
    enabled: statusQuery.isSuccess,
  });

  const loading = statusQuery.isLoading;
  const refreshing = statusQuery.isFetching && !statusQuery.isLoading;
  const disabledMessage = statusQuery.error instanceof CoordinationRuntimeDisabledError
    ? statusQuery.error.message : null;
  const error = !disabledMessage ? statusQuery.error?.message ?? null : null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['coordination'] });
  };

  // render stays the same — just reads from query.data instead of local state
}
```

**Key changes:**
- 7 useState → 0 useState
- Identities + discussions only fetch when status succeeds (`enabled:`)
- Parallel fetch is automatic (3 queries fire simultaneously)
- Disabled detection → retry function prevents retrying disabled errors
- Refresh button → `invalidateQueries` (one line)
- Navigate away and back → instant cache render + background refresh

---

### Example 4: useAgchainBenchmarkSteps (complex workbench — Z+T split)

**BEFORE: 11 useState + ~200 lines**

**AFTER: TanStack queries + Zustand UI store**

```ts
// stores/benchmarkStepsUIStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface BenchmarkStepsUIState {
  selectedStepId: string | null;
  dirtyOrder: boolean;
  dirtyToolBag: boolean;
  setSelectedStepId: (id: string | null) => void;
  markOrderDirty: () => void;
  markOrderClean: () => void;
  markToolBagDirty: () => void;
  markToolBagClean: () => void;
}

export const useBenchmarkStepsUIStore = create<BenchmarkStepsUIState>()(
  devtools(
    (set) => ({
      selectedStepId: null,
      dirtyOrder: false,
      dirtyToolBag: false,
      setSelectedStepId: (id) => set({ selectedStepId: id }, undefined, 'steps/selectStep'),
      markOrderDirty: () => set({ dirtyOrder: true }, undefined, 'steps/markOrderDirty'),
      markOrderClean: () => set({ dirtyOrder: false }, undefined, 'steps/markOrderClean'),
      markToolBagDirty: () => set({ dirtyToolBag: true }, undefined, 'steps/markToolBagDirty'),
      markToolBagClean: () => set({ dirtyToolBag: false }, undefined, 'steps/markToolBagClean'),
    }),
    { name: 'BenchmarkStepsUI' },
  ),
);
```

```ts
// hooks/agchain/useAgchainBenchmarkSteps.ts (rewritten)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBenchmarkStepsUIStore } from '@/stores/benchmarkStepsUIStore';
import { useAgchainProjectFocus } from './useAgchainProjectFocus';

export function useAgchainBenchmarkSteps() {
  const { focusedProject, loading: focusLoading } = useAgchainProjectFocus();
  const slug = focusedProject?.benchmark_slug;
  const projectId = focusedProject?.project_id ?? null;
  const queryClient = useQueryClient();
  const ui = useBenchmarkStepsUIStore();

  const detailQuery = useQuery({
    queryKey: ['benchmark', slug, 'detail'],
    queryFn: () => fetchAgchainBenchmarkWorkbenchDetail(slug!),
    enabled: !!slug && !focusLoading,
  });

  const stepsQuery = useQuery({
    queryKey: ['benchmark', slug, 'steps'],
    queryFn: () => fetchAgchainBenchmarkSteps(slug!),
    enabled: !!slug && !focusLoading,
  });

  const toolBagQuery = useQuery({
    queryKey: ['benchmark', slug, 'tools'],
    queryFn: () => fetchAgchainBenchmarkToolBag(slug!),
    enabled: !!slug && !focusLoading,
  });

  const availableToolsQuery = useQuery({
    queryKey: ['tools', projectId],
    queryFn: () => listAgchainTools(projectId!),
    enabled: !!projectId,
  });

  const createStepMutation = useMutation({
    mutationFn: (payload: AgchainBenchmarkStepWrite) => createAgchainBenchmarkStep(slug!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['benchmark', slug] }),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => deleteAgchainBenchmarkStep(slug!, stepId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['benchmark', slug] }),
  });

  // ... similar for update, reorder, saveToolBag

  return {
    detail: detailQuery.data ?? null,
    stepsDetail: stepsQuery.data ?? null,
    toolRefs: toolBagQuery.data?.bindings ?? [],
    resolvedTools: toolBagQuery.data?.resolved ?? [],
    availableTools: availableToolsQuery.data ?? [],
    loading: detailQuery.isLoading || stepsQuery.isLoading,
    mutating: createStepMutation.isPending || deleteStepMutation.isPending,
    error: detailQuery.error?.message ?? stepsQuery.error?.message ?? null,
    // UI state from Zustand
    selectedStepId: ui.selectedStepId,
    dirtyOrder: ui.dirtyOrder,
    dirtyToolBag: ui.dirtyToolBag,
    setSelectedStepId: ui.setSelectedStepId,
    // Mutations
    createStep: createStepMutation.mutateAsync,
    deleteStep: deleteStepMutation.mutateAsync,
    reload: () => queryClient.invalidateQueries({ queryKey: ['benchmark', slug] }),
  };
}
```

**Key insight:** The consumer hook's return shape stays nearly identical — pages don't need to change their destructuring. The internals go from 11 useState + manual fetch orchestration to queries + mutations + a tiny store.

---

## 11. Open Questions for Discussion

1. **staleTime default:** 30s proposed. Should specific queries (workspace, project catalog) have longer staleness (e.g., 5 minutes)?

2. **Error boundary strategy:** Should we add React error boundaries at the route level that catch TanStack Query errors, or keep inline error handling?

3. **Optimistic updates:** For mutations like reorderBenchmarkSteps, should we do optimistic UI (update immediately, rollback on error) or keep the current wait-for-confirmation pattern?

4. **State Observatory access:** Superuser-only, or should admins also see a simplified version?

5. **Migration rollout:** Big bang (one PR) or incremental (Phase 0-1 first, then phases 2-7 in subsequent PRs)?

6. **Test strategy:** Vitest mocks for `useQuery`/`useMutation` — do we want a shared test utility (`createTestQueryClient()`) or per-test setup?

---

## 12. Risks

| Risk | Mitigation |
|------|------------|
| Breaking change in return shape (`loading` → `isLoading`) | Migration script to find/replace at call sites. Or: keep wrapper hooks that translate shape |
| Bundle size increase (~15KB) | Acceptable — TQ devtools is dev-only and lazy-loaded |
| Learning curve for team | Zustand is trivial. TQ query keys and invalidation need ~2 hours of study |
| Test breakage from Provider requirement | Shared `createTestQueryWrapper()` utility |
| Race conditions during migration (half old, half new) | Phase-by-phase migration — each phase is independently deployable |
