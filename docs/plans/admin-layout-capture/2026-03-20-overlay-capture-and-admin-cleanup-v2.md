# Overlay Capture & Admin Cleanup — Version 2 Final Plan

> I'm using the writing-plans skill to create this implementation plan.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task.

**Goal:** complete phase-2 overlay capture with durable state, re-capture preservation, and admin action menu UX while eliminating v2 regressions.

**Architecture:**  
The existing frontend/server architecture is preserved. The UI sends typed capture requests to the filesystem-backed capture server. The server orchestrates optional overlay capture as a second deterministic capture step and persists only the true artifact state.

**Tech Stack:** React + TypeScript, Ark UI, Tabler icons, Node.js HTTP server, Playwright.

**Version:** 2.2

---

## Task 0: Confirm legacy cleanup status

The v1 plan file is already removed in this repo (`legacy missing`). If it exists in another branch, remove it before continuing.

```bash
git status --short | Select-String "2026-03-19-overlay-capture-and-admin-cleanup.md"
```

---

## Task 1: Data contract changes (`design-captures.types.ts`)

**File:** `web/src/pages/superuser/design-captures.types.ts`

### 1.1 Remove `both` theme and add overlay intent fields

Replace the entire file with:

```ts
export type CaptureStatus = 'pending' | 'auth-needed' | 'capturing' | 'complete' | 'failed';

export type PageType = 'settings' | 'editor' | 'dashboard' | 'workbench' | 'marketing';

export type ThemeRequest = 'light' | 'dark';

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
  hasOverlay?: boolean;
  overlayRequested?: boolean;
};

export type CaptureRequest = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
  pageType: PageType;
  forceAuth?: boolean;
  needsOverlayCapture?: boolean;
};
```

### 1.2 Commit

```bash
git add web/src/pages/superuser/design-captures.types.ts
git commit -m "feat(types): drop both theme and track overlay request/success"
```

---

## Task 2: Admin UI — `DesignLayoutCaptures.tsx`

**File:** `web/src/pages/superuser/DesignLayoutCaptures.tsx`

### 2.1 Import block (must include all current dependencies)

Replace the import block at the top with:

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconDots,
  IconTrash,
} from '@tabler/icons-react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Checkbox } from '@ark-ui/react/checkbox';
import { Pagination } from '@ark-ui/react/pagination';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MenuContent,
  MenuItem,
  MenuPositioner,
  MenuPortal,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
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

### 2.2 Theme badge cleanup

Replace `THEME_BADGE` with:

```tsx
const THEME_BADGE = {
  light: 'default',
  dark: 'dark',
} as const satisfies Record<ThemeRequest, string>;
```

### 2.3 Capture state includes overlay intent

When initializing `captureForm`, include:

```tsx
const [captureForm, setCaptureForm] = useState<CaptureRequest>({
  url: '',
  width: 1920,
  height: 1080,
  theme: 'light',
  pageType: 'settings',
  needsOverlayCapture: undefined,
});
```

### 2.4 Re-capture handler preserves overlay intent

Replace `handleReCapture` with:

```tsx
const handleReCapture = async (row: CaptureEntry, options?: { forceAuth?: boolean }) => {
  const [w, h] = row.viewport.split('x').map(Number);
  const req: CaptureRequest = {
    url: row.url,
    width: w,
    height: h,
    theme: row.theme,
    pageType: row.pageType,
    forceAuth: options?.forceAuth,
    needsOverlayCapture: row.overlayRequested ?? row.hasOverlay,
  };

  if (options?.forceAuth) {
    setPreviewLoadFailed((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  }

  try {
    const result = await requestCapture(req);
    if (result.status === 'auth-needed') {
      setCaptureForm(req);
      setModalStatus({
        state: 'auth-needed',
        captureId: result.id,
        message: result.message ?? 'Browser opened. Complete login, then click "Auth Complete".',
      });
      setShowAddNew(true);
    } else {
      void loadData();
    }
  } catch (err) {
    setCaptureForm(req);
    setModalStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
    setShowAddNew(true);
  }
};
```

### 2.5 Keep `handleStartCapture` request shape intact

This is a one-line behavior check, not a rewrite:

```tsx
const result = await requestCapture(captureForm);
```

Do not strip `needsOverlayCapture` before submit.

### 2.6 Use normalized preview row in URL builders

- Replace `row.theme === 'both' ? 'light' : row.theme` with `row.theme`.
- Use normalized output dir row wrapper in all file opens:

```tsx
captureFileUrl(makeCaptureEntryForPreview(row), row.theme, 'viewport.png')
captureFileUrl(makeCaptureEntryForPreview(row), row.theme, 'report.json')
captureFileUrl(makeCaptureEntryForPreview(row), row.theme, 'overlay-report.json')
```

### 2.7 Row action menu + re-capture availability (all statuses)

Replace current row action cell with:

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
                      window.open(
                        captureFileUrl(makeCaptureEntryForPreview(row), row.theme, 'overlay-report.json'),
                        '_blank',
                      )
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

### 2.8 Add overlay checkbox

Inside the modal `DialogBody`, insert after `Page Type` block (or before status feedback):

```tsx
<label className="mt-2 flex items-center gap-2">
  <input
    type="checkbox"
    checked={!!captureForm.needsOverlayCapture}
    onChange={(e) => {
      const checked = e.currentTarget.checked;
      setCaptureForm((f) => ({ ...f, needsOverlayCapture: checked || undefined }));
    }}
    className="h-4 w-4 rounded border-input"
  />
  <span className="text-sm font-medium">Capture overlay component</span>
</label>
```

### 2.9 Theme options remove `both`

In the Theme `<select>`, remove:

```tsx
<option value="both">Both (light + dark)</option>
```

### 2.10 Commit

```bash
git add web/src/pages/superuser/DesignLayoutCaptures.tsx
git commit -m "feat(admin): add menu actions and overlay-capture re-capture preservation"
```

---

## Task 3: Add overlay capture script

**File to add:** `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs`

Create this implementation (with optional override support):

```javascript
#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function resolvePlaywright(repoRoot) {
  const candidates = [process.cwd(), repoRoot, path.join(repoRoot, 'web'), path.join(repoRoot, 'web-docs')];
  for (const basePath of candidates) {
    try {
      return require(require.resolve('playwright', { paths: [basePath] }));
    } catch {
      // keep trying
    }
  }
  throw new Error("Unable to resolve 'playwright'. Install dependencies in workspace.");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toTextCandidates(input) {
  return Array.isArray(input)
    ? input
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : [];
}

async function waitForPageReady(page) {
  await page.waitForLoadState('load');
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // best effort
  }
}

function candidateSelectorsFromOptions(overlayOptions) {
  const raw = toTextCandidates(overlayOptions.triggerTextCandidates);
  const normalized = raw.length
    ? raw
    : ['Add New', 'Add new', 'Create New', 'Create new', 'New', 'Add', 'Create'];
  return normalized;
}

async function findPrimaryActionButton(page, overlayOptions = {}) {
  const names = candidateSelectorsFromOptions(overlayOptions);
  for (const name of names) {
    const locator = page.getByRole('button', { name, exact: false });
    const count = await locator.count();
    if (count > 0) {
      const first = locator.first();
      if (await first.isVisible().catch(() => false)) return first;
    }
  }

  const generic = page.locator('button, [role="button"], [role="link"], [role="menuitem"]');
  const count = await generic.count();
  for (let i = 0; i < count; i += 1) {
    const el = generic.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;

    const label = ((await el.getAttribute('aria-label')) || '').toLowerCase();
    if (/(add|new|create|open|upload|import|configure|add new|create new)/i.test(label)) {
      return el;
    }
  }

  return null;
}

function resolveDialogSelector(overlayOptions = {}) {
  const forced = String(overlayOptions.overlaySelector || '').trim();
  return forced || overlayOptions.dialogSelector || overlayOptions.modalSelector || '[role="dialog"]';
}

export async function measureOverlay(options) {
  const {
    url,
    width = 1920,
    height = 1080,
    storageStatePath,
    outputDir,
    repoRoot = process.cwd(),
    overlayOptions = {},
  } = options;

  const playwright = resolvePlaywright(repoRoot);
  const dialogSelector = resolveDialogSelector(overlayOptions);
  const contextOptions = {
    viewport: { width: Number(width), height: Number(height) },
    deviceScaleFactor: 1,
  };

  if (storageStatePath && fs.existsSync(storageStatePath)) {
    contextOptions.storageState = path.resolve(storageStatePath);
  }

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await waitForPageReady(page);

    const trigger = await findPrimaryActionButton(page, overlayOptions);
    if (!trigger) {
      throw new Error(
        `No primary action button found on ${url}. Provide overlayOptions.triggerTextCandidates for deterministic capture.`,
      );
    }

    const triggerText = (await trigger.innerText().catch(() => 'unknown')).trim() || 'unknown';
    await trigger.click();
    await page.waitForSelector(dialogSelector, { state: 'visible', timeout: 10000 });

    const dialogElement = page.locator(dialogSelector).first();
    const boundingBox = await dialogElement.boundingBox();
    const computedStyles = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        padding: style.padding,
      };
    }, dialogSelector);

    const report = {
      capture: {
        type: 'overlay',
        url,
        triggerText,
        dialogSelector,
        capturedAt: new Date().toISOString(),
        viewport: { width: Number(width), height: Number(height) },
      },
      dialog: {
        rect: boundingBox,
        style: computedStyles,
      },
      options: {
        triggerTextCandidates: toTextCandidates(overlayOptions.triggerTextCandidates),
        triggerSelector: overlayOptions.triggerSelector,
        dialogSelector: overlayOptions.dialogSelector,
      },
    };

    ensureDir(outputDir);
    const reportPath = path.join(outputDir, 'overlay-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    await context.close();
    return { reportPath };
  } finally {
    await browser.close();
  }
}
```

### 3.1 Make executable

```bash
npm pkg set scripts.measure-overlay="node docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs"
```

### 3.2 Commit

```bash
git add docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs
git commit -m "feat(overlay): add overlay capture script with selector overrides"
```

---

## Task 4: Wire overlay intent into capture server

**File:** `scripts/capture-server.mjs`

### 4.1 Add overlay-module loader

After `loadMeasureModule`, add:

```js
async function loadOverlayModule() {
  return import(pathToFileURL(path.join(skillScriptsDir, 'measure-overlay.mjs')).href);
}
```

### 4.2 Parse overlay intent in `startCapture`

In `startCapture`, destructure and persist this intent:

```js
const {
  url,
  width = 1920,
  height = 1080,
  theme = 'light',
  pageType = 'settings',
  forceAuth = false,
  needsOverlayCapture = false,
} = body;
const requestedOverlayCapture = parseBoolean(needsOverlayCapture);
```

When building entry:

```js
const entry = {
  id,
  name: slug,
  url,
  viewport: `${width}x${height}`,
  theme,
  pageType,
  capturedAt: null,
  outputDir: path.relative(path.join(repoRoot, 'docs', 'design-layouts'), outputDir).replace(/\\/g, '/'),
  status: 'pending',
  hasOverlay: false,
  overlayRequested: requestedOverlayCapture,
};
```

### 4.3 Carry intent through auth session

Update auth session map usage:

- comment / type note:

```js
// Map<captureId, { context, page, storageStatePath, cleanup, tempProfileRoot?, entry, requestedOverlayCapture, overlayOptions? }>
```

- `startAuthSession` signature and write:

```js
async function startAuthSession(id, entry, targetUrl, storageStatePath, width, height, requestedOverlayCapture, overlayOptions = {}) {
  // ...existing launch...
  authSessions.set(id, {
    context,
    page,
    storageStatePath,
    cleanup,
    tempProfileRoot,
    entry,
    requestedOverlayCapture,
    overlayOptions,
  });
}
```

- In `startCapture` auth-required branch:

```js
await startAuthSession(id, entry, url, storageStatePath, width, height, requestedOverlayCapture, body?.overlayOptions);
```

### 4.4 Extend `/auth-complete` to preserve overlay request

Call `runCapture` with request intent from session record:

```js
const requestedOverlayCapture = Boolean(session.requestedOverlayCapture);
const result = await runCapture(id, entry, {
  url: entry.url,
  width: w,
  height: h,
  theme: entry.theme,
  storageStatePath: session.storageStatePath,
  outputDir,
  overlayOptions: session.overlayOptions || {},
}, requestedOverlayCapture);
```

### 4.5 Implement durable capture persistence helpers

Keep `updateCaptureStatus` for status-only updates and add:

```js
function updateCaptureEntryById(id, patch) {
  const captures = readCaptures();
  const idx = captures.findIndex((entry) => entry.id === id);
  if (idx >= 0) {
    captures[idx] = { ...captures[idx], ...patch };
    writeCaptures(captures);
  }
}
```

### 4.6 Update `runCapture` signature and overlay block

Change signature and call sites:

```js
async function runCapture(id, entry, options, requestedOverlayCapture = false) {
```

In `startCapture` non-auth branch:

```js
return runCapture(id, entry, { url, width, height, theme, storageStatePath, outputDir }, requestedOverlayCapture);
```

In `runCapture`:

```js
const measureOptions = {
  url: options.url,
  width: String(options.width),
  height: String(options.height),
  storageStatePath: options.storageStatePath,
  outputDir: options.outputDir,
};

if (options.theme === 'light' || options.theme === 'dark') {
  measureOptions.theme = options.theme;
}

await mod.measureLayout(measureOptions);

const capturedAt = new Date().toISOString();
const entryForPersist = { ...entry, status: 'complete', capturedAt };
updateCaptureEntryById(id, entryForPersist);

if (requestedOverlayCapture) {
  const overlayMod = await loadOverlayModule();
  try {
    const overlayThemeDir = path.join(options.outputDir, options.theme);
    const { reportPath } = await overlayMod.measureOverlay({
      url: options.url,
      width: options.width,
      height: options.height,
      storageStatePath: options.storageStatePath,
      outputDir: overlayThemeDir,
      repoRoot,
      overlayOptions: options.overlayOptions || {},
    });

    updateCaptureEntryById(id, {
      ...entryForPersist,
      hasOverlay: Boolean(reportPath && fs.existsSync(reportPath)),
    });
  } catch (overlayErr) {
    console.error(`[capture] Overlay capture failed for ${id}:`, overlayErr.message);
    updateCaptureEntryById(id, {
      ...entryForPersist,
      hasOverlay: false,
    });
  }
}

return { id, status: 'complete' };
```

In base-capture failure path keep status-only helper:

```js
updateCaptureStatus(id, 'failed');
```

### 4.7 Remove `both` branches

Delete all of:

- `if (options.theme === 'both') { measureOptions.captureBothThemes = "true"; }`
- Any `theme === "both"` or `both` UI copy.

### 4.8 Commit

```bash
git add scripts/capture-server.mjs
git commit -m "feat(capture-server): persist overlay intent and durable overlay artifact state"
```

---

## Task 5: Final execution + validation checklist

1. Start services:

```bash
cd scripts && node capture-server.mjs
cd web && npm run dev
```

2. Manual validations:
   - Add capture with overlay ON and OFF.
   - Confirm row menu exists for failed/pending/auth-needed rows and includes recapture items.
   - Confirm `Re-capture (fresh auth)` remains available in menu.
   - Confirm `View Overlay JSON` is shown only when the file exists.
   - Confirm `both` theme is removed from create form and rows render theme badge safely.
   - Confirm `overlayRequested` persists through failed + re-capture cycles.

3. API sanity:
   - POST `/capture` with `needsOverlayCapture: true`, without auth.
   - POST `/auth-complete` for that capture.
   - Confirm overlay path is attempted after auth session when requested.

### 5.1 Final commit rule

Avoid `git add -A`. If no fixups occurred after the task commits, no additional commit is required.

```bash
git add docs/plans/2026-03-20-overlay-capture-and-admin-cleanup-v2.md
git commit -m "chore(plan): finalize overlay capture v2 plan with implementation-ready corrections"
```

---

## Task 6: Known scope note

Overlay capture remains heuristic-first for broad admin usage. v2.2 explicitly supports optional overrides in request payload:

- `overlayOptions.triggerTextCandidates`
- `overlayOptions.triggerSelector`
- `overlayOptions.overlaySelector`

This makes the same mechanism configurable for non-standard popups without adding new server-side switches later.
