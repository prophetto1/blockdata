# Parse Preview Tab Latency Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Parse workbench's `Docling MD`, `DoclingJson`, and `Blocks` tabs feel instant after first load for the currently selected document.

**Architecture:** Do not pull Astro into the Parse workbench and do not change the parse pipeline. Keep the current React-based Parse UI, add an in-memory per-document preview cache keyed by document identity, prefetch preview payloads when a document becomes active, and stop the JSON viewer from doing repeated whole-document work after the data is already loaded. Leave `Workbench` tab mounting behavior unchanged; solve the lag at the data and rendering layer instead.

**Tech Stack:** React 19, TypeScript, Supabase storage signed URLs, existing Parse workbench components, Ark JSON tree viewer

---

## Why This Plan

The current lag is not parse-time lag. It is view-time lag:

- `Workbench` only renders the active tab, so inactive preview tabs unmount.
- `DoclingMdTab` and `DoclingJsonTab` fetch again on every remount.
- `DoclingJsonTab` parses a large JSON payload every time.
- `JsonViewer` stringifies large tree-mode objects for copy support even when the JSON is already available as raw text.

The cleanest fix is not `keep every tab mounted forever`. That would hide the symptom by increasing memory and DOM cost. The cleaner fix is:

1. cache preview payloads after first fetch
2. reuse cached payloads on tab return
3. prefetch likely-next payloads on document selection
4. avoid redundant JSON stringify work

---

### Task 1: Add a small Parse preview cache utility

**Files:**
- Create: `web/src/lib/parsePreviewCache.ts`
- Create: `web/src/lib/parsePreviewCache.test.ts`

**Step 1: Write the failing test**

Create `web/src/lib/parsePreviewCache.test.ts` covering:

- cache key isolation by `kind + sourceUid + convUid`
- cache hit when the same document/tab is revisited
- cache miss when `conv_uid` changes for the same `source_uid`
- overwrite semantics when a newer entry is written

Example test shape:

```ts
import { describe, expect, it } from 'vitest';
import {
  createParsePreviewCache,
  getParsePreviewCacheKey,
} from '@/lib/parsePreviewCache';

describe('parsePreviewCache', () => {
  it('returns a cached value for the same tab/document identity', () => {
    const cache = createParsePreviewCache();
    const key = getParsePreviewCacheKey('docling-md', 'source-1', 'conv-1');
    cache.set(key, { markdown: '# Hello' });
    expect(cache.get(key)).toEqual({ markdown: '# Hello' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/lib/parsePreviewCache.test.ts`

Expected: fail because the cache module does not exist yet.

**Step 3: Write the minimal implementation**

Create `web/src/lib/parsePreviewCache.ts` with:

- `ParsePreviewKind = 'docling-md' | 'docling-json' | 'blocks'`
- `getParsePreviewCacheKey(kind, sourceUid, convUid)`
- `createParsePreviewCache()` returning `{ get, set, delete, clear }`

Keep it as a tiny in-memory `Map<string, unknown>` wrapper. Do not add TTL logic in v1. Invalidation by `conv_uid` is sufficient for this feature.

Example shape:

```ts
export type ParsePreviewKind = 'docling-md' | 'docling-json' | 'blocks';

export function getParsePreviewCacheKey(
  kind: ParsePreviewKind,
  sourceUid: string,
  convUid: string | null | undefined,
): string {
  return `${kind}:${sourceUid}:${convUid ?? 'no-conv'}`;
}

export function createParsePreviewCache() {
  const store = new Map<string, unknown>();
  return {
    get<T>(key: string): T | null {
      return store.has(key) ? (store.get(key) as T) : null;
    },
    set<T>(key: string, value: T) {
      store.set(key, value);
    },
    delete(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/lib/parsePreviewCache.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/lib/parsePreviewCache.ts web/src/lib/parsePreviewCache.test.ts
git commit -m "feat: add parse preview cache utility"
```

---

### Task 2: Cache `Docling MD`, `DoclingJson`, and `Blocks` after first load

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`
- Use: `web/src/lib/parsePreviewCache.ts`

**Step 1: Write the failing test**

Create a focused preview-cache behavior test beside the page logic:

- first open of `DoclingJson` fetches and stores
- second open of the same document/tab returns cached data without re-fetch
- switching to another document does not reuse the wrong cached payload

Test file:

- Create: `web/src/pages/useParseWorkbench.preview-cache.test.tsx`

Mock:

- `resolveSignedUrlForLocators`
- `supabase.storage.from(...).createSignedUrl`
- `fetch`
- `supabase.from(...).select(...)` for blocks/json lookup

Expected assertion:

```ts
expect(fetch).toHaveBeenCalledTimes(1);
```

after opening, leaving, and returning to the same tab/document.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/pages/useParseWorkbench.preview-cache.test.tsx`

Expected: FAIL because the tabs currently fetch on every remount.

**Step 3: Add shared cache refs at the page level**

In `web/src/pages/useParseWorkbench.tsx`:

- create one cache instance per preview kind using `useRef(createParsePreviewCache())`
- compute cache keys from `doc.source_uid` and `doc.conv_uid`
- pass the cache instance into `DoclingMdTab`, `DoclingJsonTab`, and `BlocksTab`

Do not put the cache inside each tab component. The tab components unmount; the cache must live in `useParseWorkbench()`.

**Step 4: Update `DoclingMdTab` to reuse cached markdown**

Before starting any async work:

- compute `const cacheKey = getParsePreviewCacheKey('docling-md', doc.source_uid, doc.conv_uid)`
- read cached state
- if present, render it immediately and skip the loading spinner
- only fetch when the cache is empty

Cache the stable payload:

```ts
{
  markdown: string;
  error: string | null;
  downloadUrl: string | null;
}
```

Do not cache loading state.

**Step 5: Update `DoclingJsonTab` to reuse cached parsed JSON and raw text**

Cache both:

```ts
{
  content: ParsedJsonViewerContent | null;
  rawText: string;
  error: string | null;
  downloadUrl: string | null;
}
```

This avoids having to:

- re-fetch the file
- re-parse the JSON text
- re-stringify the object later

**Step 6: Update `BlocksTab` to reuse cached block rows**

Use the same pattern for:

```ts
{
  blocks: BlockRow[];
  error: string | null;
}
```

Blocks should read from cache immediately when revisiting the same document.

**Step 7: Run the focused test**

Run: `npm.cmd run test -- src/pages/useParseWorkbench.preview-cache.test.tsx`

Expected: PASS

**Step 8: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx web/src/pages/useParseWorkbench.preview-cache.test.tsx
git commit -m "feat: cache parse preview tab payloads"
```

---

### Task 3: Prefetch the likely-next preview payloads when a document becomes active

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**Step 1: Write the failing test**

Extend `web/src/pages/useParseWorkbench.preview-cache.test.tsx` with:

- selecting a parsed document triggers background fetch for `Docling MD`
- `DoclingJson` prefetch follows after markdown or runs independently
- opening the tab after prefetch does not show the long loading state

Expected behavior can be asserted by:

- waiting for the prefetch mock to resolve
- opening the tab
- asserting no second network call occurs

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/pages/useParseWorkbench.preview-cache.test.tsx`

Expected: FAIL because no prefetch exists yet.

**Step 3: Prefetch on `activeDoc` change**

In `useParseWorkbench.tsx`, add a `useEffect` keyed by `activeDoc?.source_uid` and `activeDoc?.conv_uid`.

Prefetch order:

1. `Docling MD`
2. `DoclingJson`
3. `Blocks`

Rules:

- only prefetch for `doc.status === 'parsed'`
- skip if a cache entry already exists
- do not overwrite an existing newer cached payload
- keep prefetch silent; do not surface loading UI from background work

The fetch logic should be shared with the tab loaders so there is one source of truth for each resource fetcher.

**Step 4: Run the test**

Run: `npm.cmd run test -- src/pages/useParseWorkbench.preview-cache.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx web/src/pages/useParseWorkbench.preview-cache.test.tsx
git commit -m "feat: prefetch parse preview payloads on document selection"
```

---

### Task 4: Stop `JsonViewer` from doing redundant whole-document work

**Files:**
- Modify: `web/src/components/json/JsonViewer.tsx`
- Modify: `web/src/pages/useParseWorkbench.tsx`
- Create: `web/src/components/json/JsonViewer.test.tsx`

**Step 1: Write the failing test**

Create `web/src/components/json/JsonViewer.test.tsx` covering:

- tree mode accepts a precomputed copy string
- component uses the provided string for clipboard value
- component does not need to build `JSON.stringify(value, null, 2)` when `copyValue` is already supplied

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/components/json/JsonViewer.test.tsx`

Expected: FAIL because `JsonViewer` does not accept `copyValue`.

**Step 3: Add a `copyValue` prop**

In `JsonViewer.tsx`:

- add optional `copyValue?: string`
- compute clipboard text as:

```ts
const textValue = copyValue ?? (typeof value === 'string' ? value : JSON.stringify(value, null, 2));
```

In `useParseWorkbench.tsx`:

- pass cached raw JSON text into `JsonViewer`

```tsx
<JsonViewer
  value={state.content?.data ?? ''}
  mode={state.content?.mode ?? 'raw'}
  copyValue={state.rawText}
/>
```

This keeps copy behavior intact while removing one expensive render-time step.

**Step 4: Run the test**

Run: `npm.cmd run test -- src/components/json/JsonViewer.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/components/json/JsonViewer.tsx web/src/components/json/JsonViewer.test.tsx web/src/pages/useParseWorkbench.tsx
git commit -m "perf: avoid redundant json stringify in parse preview"
```

---

### Task 5: Verify user-visible improvement and no regressions

**Files:**
- Verify: `web/src/pages/useParseWorkbench.tsx`
- Verify: `web/src/components/json/JsonViewer.tsx`
- Verify: `web/src/components/documents/PreviewTabPanel.tsx`

**Step 1: Run focused tests**

Run:

```bash
npm.cmd run test -- src/lib/parsePreviewCache.test.ts
npm.cmd run test -- src/pages/useParseWorkbench.preview-cache.test.tsx
npm.cmd run test -- src/components/json/JsonViewer.test.tsx
```

Expected: PASS

**Step 2: Run type/build checks**

Run:

```bash
npm.cmd run build
```

Expected:

- build succeeds
- no new type errors

**Step 3: Manual verification**

In the Parse workbench:

1. Open `Comprehensive_AI_Funding_Landscape`
2. Open `Docling MD` and wait for first load
3. Switch to `Blocks`
4. Switch to `DoclingJson`
5. Return to `Docling MD`
6. Return to `DoclingJson`

Expected:

- first load may still take noticeable time
- second visit to each tab is effectively instant
- no full-screen spinner on revisit for the same document
- selecting a different document causes a fresh first load for that new document only

**Step 4: Commit**

```bash
git add web/src/lib/parsePreviewCache.ts web/src/lib/parsePreviewCache.test.ts web/src/pages/useParseWorkbench.tsx web/src/pages/useParseWorkbench.preview-cache.test.tsx web/src/components/json/JsonViewer.tsx web/src/components/json/JsonViewer.test.tsx
git commit -m "perf: cache parse preview tabs after first load"
```

---

## Out of Scope

- Replacing the Parse markdown renderer with Astro/Starlight
- Changing the parse pipeline or regenerating Docling artifacts
- Keeping all inactive tabs mounted in `Workbench`
- Changing profile architecture or project profile storage
- Reworking the `Blocks` tab to use `/reconstruct`

## Acceptance Criteria

- Returning to `Docling MD` for the same parsed document is near-instant after the first successful load
- Returning to `DoclingJson` for the same parsed document is near-instant after the first successful load
- Returning to `Blocks` for the same parsed document is near-instant after the first successful load
- Cache entries do not leak across different documents or different `conv_uid` values
- JSON copy/download behavior still works
- The generic asset markdown preview remains unchanged
