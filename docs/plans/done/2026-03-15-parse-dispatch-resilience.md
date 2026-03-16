# Parse Dispatch Resilience — Interim Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Immediately fix three user-facing bugs — document status not auto-updating, batch parse overwhelming the conversion service, and no retry for failed parses — with minimal changes to existing code while the full server-side queue architecture (see `2026-03-15-parse-batch-runtime-hardening.md`) is developed.

**Architecture:** Add conditional polling fallback to `useProjectDocuments` so status updates appear without manual refresh. Harden `useBatchParse` with inter-wave delay and automatic retry with backoff on overload errors. Add a "Retry Failed" button to `ParseConfigColumn`. Three existing files modified, no new files, no new tables, no backend changes.

**Tech Stack:** React hooks, Supabase JS client, existing component patterns.

**Relationship to server-side queue plan:** This is Phase 0 — immediate user relief. The durable server-side parse queue (`parse_batches` + `parse_batch_items` + `parse-worker`) in `2026-03-15-parse-batch-runtime-hardening.md` is the proper long-term fix. When that ships, it replaces `useBatchParse` entirely and the polling fallback becomes a secondary safety net rather than the primary mechanism.

---

## Root Cause

1. **Conversion service overload:** `useBatchParse` dispatches waves of 3 `trigger-parse` calls. The conversion service processes ~3 concurrent jobs. When the first wave is still running, subsequent waves hit the busy service and get 502s or ACK timeouts that resolve as failures.

2. **No auto-refresh:** `useProjectDocuments` subscribes to Realtime on `source_documents`, which should deliver status updates. But Realtime can silently fail to connect (auth timing, network issues), and there is no fallback. The user sees stale state until they manually reload.

3. **No retry:** When files fail, the user must refresh the page and re-select files. The dispatch error state is ephemeral browser memory with no recovery path.

## What This Fix Does NOT Address

- **Browser queue is still ephemeral.** Closing the tab loses queued files. The server-side queue plan fixes this.
- **Dispatch rate is heuristic.** The 1.5s inter-wave delay and concurrency=3 are educated guesses, not capacity-aware. The server-side queue plan adds policy-controlled dispatch rates.
- **Realtime root cause is not diagnosed.** Polling works around it. A proper Realtime investigation is separate.

---

### Task 1: Add Conditional Polling to `useProjectDocuments`

**Files:**
- Modify: `web/src/hooks/useProjectDocuments.ts`

**Context:** The hook has a Realtime subscription (lines 40–66) on `source_documents` UPDATE events filtered by `project_id`. When Realtime delivers, the merge at line 55 updates the doc in state. But if Realtime silently fails, the UI is stuck. The fix: poll every 5 seconds while any document is in a transitional state.

**Step 1: Add the polling effect**

After the existing Realtime subscription effect (after line 66), add:

```typescript
  // Polling fallback: refetch docs while any are in a transitional state.
  // Realtime should handle updates, but polling ensures the UI reflects
  // status changes even if the Realtime connection drops.
  useEffect(() => {
    if (!projectId) return;
    const hasTransitional = docs.some((d) => d.status === 'converting');
    if (!hasTransitional) return;

    const interval = setInterval(() => {
      void loadDocs(projectId);
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, docs, loadDocs]);
```

This effect:
- Activates only when at least one doc has `status === 'converting'`
- Polls every 5 seconds (full refetch from `view_documents`)
- Stops automatically when all docs reach terminal state
- Coexists with Realtime — if Realtime works, the poll just confirms

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

**Step 3: Commit**

```bash
git add web/src/hooks/useProjectDocuments.ts
git commit -m "fix: add polling fallback for document status while converting"
```

---

### Task 2: Add Inter-Wave Delay and Retry to `useBatchParse`

**Files:**
- Modify: `web/src/hooks/useBatchParse.ts`

**Context:** The current `dispatchOne` (lines 36–59) fires one `trigger-parse` call with no retry. The queue runner `start` (lines 61–97) calls `next()` immediately when a dispatch finishes. This overwhelms the conversion service. The fix: add retry with backoff on overload errors, space out dispatches, and expose a `retryFailed` function.

**Step 1: Add delay helper and retry logic to `dispatchOne`**

Replace the `dispatchOne` function (lines 36–59) with:

```typescript
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const dispatchOne = async (sourceUid: string, attempt = 0): Promise<void> => {
    if (cancelledRef.current) return;
    updateStatus(sourceUid, 'dispatching');
    try {
      const resp = await edgeFetch('trigger-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_uid: sourceUid,
          profile_id: profileId,
          pipeline_config: pipelineConfig,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        // Retry on 502/503/429 (service overloaded) up to 2 times
        if (attempt < 2 && (resp.status === 502 || resp.status === 503 || resp.status === 429)) {
          const backoff = (attempt + 1) * 3000; // 3s, 6s
          updateStatus(sourceUid, 'queued');
          await wait(backoff);
          return dispatchOne(sourceUid, attempt + 1);
        }
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
      }
      updateStatus(sourceUid, 'dispatched');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateStatus(sourceUid, 'dispatch_error');
      updateError(sourceUid, message);
    }
  };
```

**Step 2: Add inter-wave delay to queue runner**

Replace the `start` callback (lines 61–97) with:

```typescript
  const start = useCallback(
    (sourceUids: string[]) => {
      if (sourceUids.length === 0) return;
      cancelledRef.current = false;
      setIsRunning(true);
      setErrors(new Map());

      const initial = new Map<string, FileDispatchStatus>();
      for (const uid of sourceUids) initial.set(uid, 'queued');
      setDispatchStatus(initial);

      const queue = [...sourceUids];
      let active = 0;
      let idx = 0;

      const next = () => {
        while (active < concurrency && idx < queue.length) {
          if (cancelledRef.current) break;
          const uid = queue[idx++]!;
          active++;
          dispatchOne(uid).finally(() => {
            active--;
            if (cancelledRef.current || (idx >= queue.length && active === 0)) {
              setIsRunning(false);
            }
            // Space dispatches 1.5s apart to avoid overwhelming the
            // conversion service. Without this, all files in a wave
            // dispatch simultaneously and the service rejects overflow.
            setTimeout(next, 1500);
          });
        }
        if (idx >= queue.length && active === 0) {
          setIsRunning(false);
        }
      };

      next();
    },
    [profileId, pipelineConfig, concurrency],
  );
```

**Step 3: Add `retryFailed` function**

After the `cancel` callback, add:

```typescript
  const retryFailed = useCallback(() => {
    const failedUids: string[] = [];
    dispatchStatus.forEach((status, uid) => {
      if (status === 'dispatch_error') failedUids.push(uid);
    });
    if (failedUids.length > 0) start(failedUids);
  }, [dispatchStatus, start]);
```

Update the return to include it:

```typescript
  return { dispatchStatus, progress, start, cancel, retryFailed, isRunning, errors };
```

**Step 4: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

**Step 5: Commit**

```bash
git add web/src/hooks/useBatchParse.ts
git commit -m "fix: add inter-wave delay, dispatch retry with backoff, retryFailed"
```

---

### Task 3: Add "Retry Failed" Button and Filter Parse Selected

**Files:**
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`

**Context:** `ParseConfigColumn` renders batch action buttons (lines 220–261). The `batch` object from `parseTab` wraps `useBatchParse`. Two changes: add a "Retry Failed" button, and verify that `Parse Selected` only dispatches parseable files (it currently does — `selectedUids` comes from all selected rows, but the dispatch is fine because `trigger-parse` validates status server-side; however the count can be misleading).

**Step 1: Add the retry button**

After the "Cancel" `ActionButton` (after line 260), add:

```tsx
                <ActionButton
                  disabled={batch.progress.errors === 0}
                  onClick={batch.retryFailed}
                >
                  Retry Failed ({batch.progress.errors})
                </ActionButton>
```

**Step 2: Wire `retryFailed` through the parse tab if needed**

Check where `batch` originates. Read `useParseTab` or wherever `useBatchParse` is called. If it directly returns the `useBatchParse` result, `retryFailed` is already available. If it wraps the return, add `retryFailed` to the wrapper type.

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

**Step 4: Commit**

```bash
git add web/src/components/documents/ParseConfigColumn.tsx
git commit -m "feat: add Retry Failed button for batch parse errors"
```

---

## Verification

1. `cd web && npx tsc --noEmit` — PASS
2. Manual test:
   - Upload 8-10 files of mixed types
   - Select all, click "Parse Selected"
   - Observe: dispatches spaced ~1.5s apart (not all at once)
   - Observe: if a file gets 502, it retries automatically after 3s, then 6s
   - Observe: status changes from "unparsed" → "converting" → "parsed" appear within 5s without manual refresh
   - Observe: if files still fail after 2 retries, "Retry Failed (N)" button appears and works
   - Close and reopen the page: statuses reflect current server state (via initial fetch), but queued-but-undispatched files are lost (known limitation — server-side queue fixes this)

## What Ships Next

This interim fix buys time while `2026-03-15-parse-batch-runtime-hardening.md` is corrected and executed. When the server-side queue ships:
- `useBatchParse` is replaced by `useParseBatchSubmit` + `useParseBatchStatus`
- The polling fallback in `useProjectDocuments` remains as a secondary safety net
- The "Retry Failed" button is replaced by server-side automatic retry
- Dispatch rate is controlled by `parse.*` runtime policy, not hardcoded delay