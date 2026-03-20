# Overlay Capture v2 Plan — Consolidated Review & Required Fixes

**Plan under review:** `docs/plans/2026-03-20-overlay-capture-and-admin-cleanup-v2.md`

**Reviewers:** Two independent passes plus cross-verification against codebase.

**Verdict:** v2 is materially better than v1. All seven v1 issues are resolved. Six new issues found in v2 — two HIGH (build failures / behavioral regression), two MEDIUM (logic bugs), two LOW (clarity). All are fixable within the existing task structure.

---

## Quick Reference

| # | Severity | Issue | Plan Tasks Affected |
|---|----------|-------|---------------------|
| 1 | HIGH | Incomplete import block — won't compile | Task 2.1 |
| 2 | HIGH | Re-capture gated behind `complete` status — lost for failed rows | Task 2.7 |
| 3 | MEDIUM | Auth-complete route loses overlay intent | Task 4.4, 4.6 |
| 4 | MEDIUM | Re-capture reads success flag (`hasOverlay`), not request intent | Task 1, Task 2.4, Task 4.3 |
| 5 | LOW | `updateCaptureEntryById` / `updateCaptureStatus` coexistence unclear | Task 4.5 |
| 6 | LOW | Task 5 final commit re-adds already-committed files | Task 5 |

---

## Issue 1 — HIGH: Incomplete import block

### Problem

Task 2.1 says "Use this exact import block" (plan line 86-120) but omits three import groups the component still uses:

```tsx
// MISSING — used at DesignLayoutCaptures.tsx:30
import { cn } from '@/lib/utils';

// MISSING — used at DesignLayoutCaptures.tsx:31-36 (search icon sizing)
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';

// MISSING — used throughout component for CaptureEntry, CaptureRequest, PageType, ThemeRequest
import type { CaptureEntry, CaptureRequest, PageType, ThemeRequest } from './design-captures.types';
```

### Evidence

- `cn` used at line 528: `cn('border-b border-border/60 ...', selected.has(row.id) && 'bg-accent/20')`
- Icon-contract used at lines 246-247 for `utilityIconSize` / `utilityIconStroke`, rendered in search input at line 438
- Type import used in state declarations, function signatures, and constants throughout
- `noUnusedLocals: true` in `web/tsconfig.app.json` means missing imports = build failure

### Fix

Append these three blocks to the Task 2.1 import list, after the ScrollArea import:

```tsx
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';
import type { CaptureEntry, CaptureRequest, PageType, ThemeRequest } from './design-captures.types';
```

### TDD verification

Before any other Task 2 changes, apply the import block alone and run:

```bash
cd web && npx tsc --noEmit
```

Expect: type errors from later changes (removed `'both'` theme), but no "cannot find module" or "unused import" errors from the import block itself.

---

## Issue 2 — HIGH: Re-capture gated behind `complete` status

### Problem

Task 2.7 (plan line 209) wraps the entire `<MenuRoot>` in `{row.status === 'complete' && (...)}`. The "Re-capture" and "Re-capture (fresh auth)" menu items are inside this gate. This means rows with status `failed`, `pending`, or `auth-needed` lose all re-capture actions.

The current UI (DesignLayoutCaptures.tsx lines 617-636) renders re-capture buttons independently of completion status — they are always visible.

This is a behavioral regression. A failed capture is the most common reason to re-capture.

### Evidence

Current code — re-capture always available:
```tsx
// Lines 617-636: These render for ALL rows, not just complete ones
<Button ... onClick={() => void handleReCapture(row)}>
  <IconCamera size={14} />
</Button>
<Button ... onClick={() => void handleReCapture(row, true)}>
  <IconRefresh size={14} />
</Button>
```

Plan v2 — re-capture only for complete:
```tsx
// Plan line 209: gate blocks everything
{row.status === 'complete' && (
  <MenuRoot>
    ...
    <MenuItem value="re-capture" ... >Re-capture</MenuItem>
    <MenuItem value="re-capture-fresh-auth" ... >Re-capture (fresh auth)</MenuItem>
  </MenuRoot>
)}
```

### Fix

Always render the `<MenuRoot>`. Gate only the view-artifact items on `complete`:

```tsx
<td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
  <div className="flex items-center justify-end gap-1">
    <MenuRoot>
      <MenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Actions"
          title="Actions"
        >
          <IconDots size={14} />
        </Button>
      </MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuContent>
            {row.status === 'complete' && (
              <>
                <MenuItem
                  value="view-screenshot"
                  onClick={() =>
                    window.open(captureFileUrl(makeCaptureEntryForPreview(row), row.theme, 'viewport.png'), '_blank')
                  }
                >
                  View Screenshot
                </MenuItem>
                <MenuItem
                  value="view-json"
                  onClick={() =>
                    window.open(captureFileUrl(makeCaptureEntryForPreview(row), row.theme, 'report.json'), '_blank')
                  }
                >
                  View JSON
                </MenuItem>
                {row.hasOverlay && (
                  <MenuItem
                    value="view-overlay-json"
                    onClick={() =>
                      window.open(captureFileUrl(makeCaptureEntryForPreview(row), row.theme, 'overlay-report.json'), '_blank')
                    }
                  >
                    View Overlay JSON
                  </MenuItem>
                )}
              </>
            )}
            <MenuItem
              value="re-capture"
              onClick={() => void handleReCapture(row)}
            >
              Re-capture
            </MenuItem>
            <MenuItem
              value="re-capture-fresh-auth"
              onClick={() => void handleReCapture(row, { forceAuth: true })}
            >
              Re-capture (fresh auth)
            </MenuItem>
          </MenuContent>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
      aria-label="Delete capture"
      title="Delete capture and artifacts"
      onClick={() => void handleDelete(row)}
      disabled={deleting.has(row.id)}
    >
      <IconTrash size={14} />
    </Button>
  </div>
</td>
```

### TDD verification

Manual test: create a capture that fails (bad URL). Verify the 3-dot menu renders and contains "Re-capture" + "Re-capture (fresh auth)" but NOT the view-artifact items.

---

## Issue 3 — MEDIUM: Auth-complete route loses overlay intent

### Problem

Task 4.4 (plan line 638) derives overlay intent for the auth-complete path as:

```js
Boolean(session.entry?.needsOverlayCapture || session.entry?.hasOverlay)
```

Neither field works:
- `session.entry.needsOverlayCapture` — does not exist on entry (it's a request body field, not an entry field)
- `session.entry.hasOverlay` — always `false` (Task 4.3 initializes it that way)

Task 4.6 says to "add `needsOverlayCapture` in that map payload" but 4.4 reads it from `session.entry`, not `session`.

### Fix

**Step A:** Add `requestedOverlayCapture` as a parameter to `startAuthSession` and store it on the session:

```js
async function startAuthSession(id, entry, targetUrl, storageStatePath, width, height, requestedOverlayCapture) {
  // ... existing code ...
  authSessions.set(id, {
    context,
    page,
    storageStatePath,
    cleanup,
    tempProfileRoot,
    entry,
    requestedOverlayCapture,  // ← store it here
  });
}
```

**Step B:** In `startCapture`, pass it through:

```js
await startAuthSession(id, entry, url, storageStatePath, width, height, requestedOverlayCapture);
```

**Step C:** In the auth-complete route, read from session directly:

```js
const result = await runCapture(id, entry, {
  url: entry.url,
  width: w,
  height: h,
  theme: entry.theme,
  storageStatePath: session.storageStatePath,
  outputDir,
}, session.requestedOverlayCapture);
```

### TDD verification

Test sequence: POST `/capture` with `needsOverlayCapture: true` to a URL that requires auth → auth session created → POST `/auth-complete` → verify overlay capture runs. Check `captures.json` entry has `hasOverlay: true` (if overlay succeeds) or `hasOverlay: false` (if it fails), but NOT that overlay was silently skipped.

---

## Issue 4 — MEDIUM: Re-capture reads success flag, not request intent

### Problem

Task 2.4 (plan line 162) restores overlay intent from the success flag:

```tsx
needsOverlayCapture: row.hasOverlay,
```

`hasOverlay` is set to `true` only when overlay capture succeeds (per the v2 fix for the v1 persistence bug). If overlay was requested but failed, `hasOverlay` is `false`, so re-capture silently drops the overlay request. The user intended overlay, it failed, they hit re-capture — and overlay is gone.

### Fix

**Step A:** Add `overlayRequested` to `CaptureEntry` in Task 1 types:

```ts
export type CaptureEntry = {
  id: string;
  name: string;
  url: string;
  viewport: string;
  theme: ThemeRequest;
  pageType: PageType;
  capturedAt: string | null;
  outputDir: string;
  status: CaptureStatus;
  hasOverlay?: boolean;        // did overlay succeed?
  overlayRequested?: boolean;  // was overlay requested?
};
```

**Step B:** In Task 4.3 server entry construction, persist request intent:

```js
const entry = {
  // ... existing fields ...
  hasOverlay: false,
  overlayRequested: requestedOverlayCapture,
};
```

**Step C:** In Task 2.4 re-capture handler, read request intent:

```tsx
needsOverlayCapture: row.overlayRequested,
```

**Step D:** In Task 2.7, the "View Overlay JSON" menu item still reads `row.hasOverlay` (correct — only show when file exists).

### TDD verification

Test sequence: capture with overlay requested → overlay fails → verify `overlayRequested: true, hasOverlay: false` in `captures.json` → re-capture the entry → verify the re-capture request includes `needsOverlayCapture: true`.

---

## Issue 5 — LOW: Helper coexistence

### Problem

Task 4.5 introduces `updateCaptureEntryById` alongside the existing `updateCaptureStatus`. Both read + write `captures.json`. The plan doesn't state whether `updateCaptureStatus` stays, migrates, or is replaced.

### Fix

Add a one-line note to Task 4.5: "Keep `updateCaptureStatus` for status-only updates (auth-needed, capturing, failed). Use `updateCaptureEntryById` when updating multiple fields (status + capturedAt + hasOverlay)." No code change needed.

---

## Issue 6 — LOW: Redundant final commit

### Problem

Task 5's `git add` lists files already committed individually in Tasks 1-4. Unless fixups happen during validation, this commit has no diff.

### Fix

Change Task 5 step 6 to: "If any fixups were made during validation, commit them with specific file adds. Otherwise, no commit needed — all changes were committed in Tasks 1-4."

---

## Cross-cutting: TDD note for implementer

The v2 plan has no test files. The capture server (`scripts/capture-server.mjs`) has testable logic that should be covered before implementation:

1. **`hasOverlay` state machine:** Write a test that calls `runCapture` with overlay requested, mocks overlay failure, and asserts `hasOverlay: false` in the persisted entry. Then write the passing implementation.

2. **Auth-complete overlay passthrough:** Write a test that creates an auth session with overlay intent, completes auth, and asserts overlay runs in the subsequent capture.

3. **Re-capture intent preservation:** Write a test that constructs a `CaptureEntry` with `overlayRequested: true, hasOverlay: false` and asserts the re-capture request includes `needsOverlayCapture: true`.

These are the three behaviors most likely to regress. Write the tests first.
