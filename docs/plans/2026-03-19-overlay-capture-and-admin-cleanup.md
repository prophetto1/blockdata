# Overlay Capture & Admin Actions Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add overlay/component capture capability (boolean toggle, script-owned interaction) and clean up the admin table's row actions into a 3-dot dropdown menu with text-only buttons elsewhere.

**Architecture:** The capture server runs two independent browser sessions per capture when overlay is enabled — one for the base page (existing `measureLayout`), one for the overlay (new `measureOverlay`). The overlay produces a single `overlay-report.json` beside the existing `report.json` in the theme folder. No screenshots for overlay in v1. The admin UI replaces 5 action buttons with a context menu (2 or 3 items depending on overlay presence) plus a standalone delete button. All icon+text button combos become text-only; icon-only buttons (3-dot trigger, delete trash) stay icon-only.

**Tech Stack:** Playwright (browser automation), Node.js (capture server), React + Ark UI Menu (admin UI), TypeScript

---

## Pre-step: Fix .gitignore for skill scripts

**Files:**
- Modify: `.gitignore`

The skill scripts live in `docs/jon/skills/` which is currently gitignored by the broad `docs/jon/` rule. Add an exclusion so skill scripts are tracked.

**Step 1: Add exclusion to .gitignore**

After the `docs/jon/` line, add:

```
!docs/jon/skills/
!docs/jon/skills/**
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: track docs/jon/skills/ in git (exclude from docs/jon/ ignore)"
```

---

## Task 1: Update shared types

**Files:**
- Modify: `web/src/pages/superuser/design-captures.types.ts`

**Step 1: Rewrite types file**

```typescript
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

Key changes from v0:
- `ThemeRequest` removes `'both'` — one theme per capture
- `OverlayConfig` type removed — replaced by simple `needsOverlayCapture?: boolean`
- `CaptureEntry.overlayName` removed — overlay file is always `overlay-report.json` beside `report.json`
- `CaptureRequest.overlay` replaced by `needsOverlayCapture?: boolean`

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: Type errors in `DesignLayoutCaptures.tsx` for removed `'both'` theme — these are fixed in Task 2.

**Step 3: Commit**

```bash
git add web/src/pages/superuser/design-captures.types.ts
git commit -m "feat(types): add overlay boolean, remove 'both' theme, simplify capture types"
```

---

## Task 2: Admin UI — replace row action buttons with 3-dot dropdown + delete, clean up buttons

**Files:**
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`

**Reference:** The Menu component is at `web/src/components/ui/menu.tsx`. It exports `MenuRoot`, `MenuTrigger`, `MenuPositioner`, `MenuContent`, `MenuItem`, `MenuPortal`. `IconDots` is already used in `web/src/components/shell/LeftRailShadcn.tsx`.

**Step 1: Update imports**

Replace the icon imports block with:

```typescript
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconDots,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
```

Add Menu imports:

```typescript
import {
  MenuRoot,
  MenuTrigger,
  MenuPositioner,
  MenuPortal,
  MenuContent,
  MenuItem,
} from '@/components/ui/menu';
```

Remove: `IconCamera`, `IconDownload`, `IconEye`, `IconRefresh` (no longer used — see steps below).

**Step 2: Remove `handleReCapture` function**

Delete the entire `handleReCapture` function (lines ~305-342).

**Step 3: Remove "both" theme references**

- In `THEME_BADGE`, remove the `both: 'gray'` entry.
- In the theme `<select>` in the Add New modal, remove the `<option value="both">Both (light + dark)</option>` line.
- Anywhere `row.theme === 'both' ? 'light' : row.theme` appears, simplify to just `row.theme`.

**Step 4: Make text buttons text-only (no icons)**

Toolbar "Refresh" button — remove `<IconRefresh size={14} />`, keep text "Refresh":
```tsx
<Button variant="outline" size="sm" onClick={() => void loadData()}>
  Refresh
</Button>
```

Toolbar "Add New" button — remove `<IconPlus size={14} />`, keep text "Add New":
```tsx
<Button size="sm" onClick={() => setShowAddNew(true)}>
  Add New
</Button>
```

Modal "Capture" button — remove `<IconCamera size={14} />`, keep text "Capture":
```tsx
<Button size="sm" onClick={() => void handleStartCapture()} disabled={!captureForm.url}>
  Capture
</Button>
```

Note: After this step, `IconPlus` is also unused — remove it from the import block too. The final icon imports are: `IconArrowDown`, `IconArrowUp`, `IconArrowsSort`, `IconDots`, `IconTrash`.

**Step 5: Replace the actions cell in the table row**

Replace the current 5-button actions `<td>` with:

```tsx
<td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
  <div className="flex items-center justify-end gap-1">
    {row.status === 'complete' && (
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
              <MenuItem
                value="view-screenshot"
                onClick={() =>
                  window.open(
                    captureFileUrl(
                      makeCaptureEntryForPreview(row),
                      row.theme,
                      'viewport.png',
                    ),
                    '_blank',
                  )
                }
              >
                View Screenshot
              </MenuItem>
              <MenuItem
                value="view-json"
                onClick={() =>
                  window.open(
                    captureFileUrl(
                      makeCaptureEntryForPreview(row),
                      row.theme,
                      'report.json',
                    ),
                    '_blank',
                  )
                }
              >
                View JSON
              </MenuItem>
              {row.hasOverlay && (
                <MenuItem
                  value="view-overlay-json"
                  onClick={() =>
                    window.open(
                      captureFileUrl(
                        makeCaptureEntryForPreview(row),
                        row.theme,
                        'overlay-report.json',
                      ),
                      '_blank',
                    )
                  }
                >
                  View Overlay JSON
                </MenuItem>
              )}
            </MenuContent>
          </MenuPositioner>
        </MenuPortal>
      </MenuRoot>
    )}
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

**Step 6: Clean up unused code**

- Remove `handleReCapture` function
- Remove `deleteCapabilityCache`, `checkServerDeleteCapability`, `staleDeleteServerError` if only used by the removed re-capture flow (check first)
- Remove `Search01Icon` / `HugeiconsIcon` imports if unused after icon cleanup (check first — the search input still uses them)

**Step 7: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add web/src/pages/superuser/DesignLayoutCaptures.tsx
git commit -m "feat(admin): 3-dot dropdown menu, text-only buttons, remove recapture and 'both' theme"
```

---

## Task 3: Admin UI — add overlay toggle to Add New form

**Files:**
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`

**Step 1: Add overlay checkbox in the dialog body**

After the Theme/Page Type `grid grid-cols-2` div and before the status feedback section, add:

```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={!!captureForm.needsOverlayCapture}
    onChange={(e) => {
      const checked = e.currentTarget.checked;
      setCaptureForm((f) => ({
        ...f,
        needsOverlayCapture: checked || undefined,
      }));
    }}
    className="h-4 w-4 rounded border-input"
  />
  <span className="text-sm font-medium">Capture overlay component</span>
</label>
```

No freeform fields. The script owns the interaction logic (detecting the primary action button, using `[role="dialog"]` as the default wait selector).

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add web/src/pages/superuser/DesignLayoutCaptures.tsx
git commit -m "feat(admin): add overlay capture toggle to Add New form"
```

---

## Task 4: New script — measure-overlay.mjs

**Files:**
- Create: `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs`

This script runs its own browser session: navigates to the URL with auth, detects and clicks the primary action button, waits for the dialog, then measures the dialog element and writes `overlay-report.json`.

**Step 1: Create measure-overlay.mjs**

```javascript
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Resolve Playwright from the workspace.
 */
function resolvePlaywright(repoRoot) {
  const candidates = [process.cwd(), repoRoot, path.join(repoRoot, "web"), path.join(repoRoot, "web-docs")];
  for (const basePath of candidates) {
    try {
      return require(require.resolve("playwright", { paths: [basePath] }));
    } catch {
      // keep trying
    }
  }
  throw new Error("Unable to resolve 'playwright'. Install it in the workspace.");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Wait for page readiness using the same strategy as measure-layout.mjs:
 * "load" event first, then best-effort networkidle with a 5s cap.
 */
async function waitForPageReady(page, waitMs = 0) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // Some apps never settle — move on.
  }
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}

/**
 * Detect the primary action button on the page.
 * Looks for common patterns: "Add", "Create", "New", "Add New", etc.
 */
async function findPrimaryActionButton(page) {
  const candidates = [
    "Add New",
    "Add new",
    "Create New",
    "Create new",
    "New",
    "Add",
    "Create",
  ];

  for (const name of candidates) {
    const btn = page.getByRole("button", { name, exact: false });
    const count = await btn.count();
    if (count > 0) {
      const first = btn.first();
      const visible = await first.isVisible().catch(() => false);
      if (visible) return first;
    }
  }

  return null;
}

/**
 * Walk visible children of a root element and collect component inventory.
 */
async function collectComponentInventory(page, rootSelector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return [];

    const items = [];
    const walk = (el, depth) => {
      if (depth > 6) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const style = window.getComputedStyle(el);
      items.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        className: el.className || null,
        text: (el.textContent || "").trim().slice(0, 120),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        style: {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          padding: style.padding,
          gap: style.gap,
        },
      });

      for (const child of el.children) {
        walk(child, depth + 1);
      }
    };

    walk(root, 0);
    return items;
  }, rootSelector);
}

/**
 * Extract typography scale from text nodes within a root element.
 */
async function collectTypography(page, rootSelector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return [];

    const seen = new Map();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        (node.textContent || "").trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });

    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (!el) continue;
      const style = window.getComputedStyle(el);
      const key = `${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${style.lineHeight}|${style.color}`;
      if (!seen.has(key)) {
        seen.set(key, {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          color: style.color,
          sampleText: (el.textContent || "").trim().slice(0, 80),
          sampleTag: el.tagName.toLowerCase(),
          occurrences: 1,
        });
      } else {
        seen.get(key).occurrences += 1;
      }
    }

    return [...seen.values()].sort(
      (a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize),
    );
  }, rootSelector);
}

/**
 * Measure a dialog/overlay component.
 *
 * The script owns the interaction: it detects the primary action button,
 * clicks it, waits for [role="dialog"], then measures the dialog.
 *
 * @param {object} options
 * @param {string} options.url - Page URL to navigate to
 * @param {number} [options.width] - Viewport width
 * @param {number} [options.height] - Viewport height
 * @param {string} [options.storageStatePath] - Path to auth storage state
 * @param {string} options.outputDir - Theme directory where overlay-report.json is written
 * @param {string} [options.repoRoot] - Repository root path
 */
export async function measureOverlay(options) {
  const {
    url,
    width = 1920,
    height = 1080,
    storageStatePath,
    outputDir,
    repoRoot = process.cwd(),
  } = options;

  const dialogSelector = '[role="dialog"]';
  const playwright = resolvePlaywright(repoRoot);
  const contextOptions = {
    viewport: { width: Number(width), height: Number(height) },
    deviceScaleFactor: 1,
  };

  if (storageStatePath && fs.existsSync(storageStatePath)) {
    contextOptions.storageState = path.resolve(storageStatePath);
  }

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Navigate using same strategy as measure-layout.mjs
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await waitForPageReady(page);

    // Find and click the primary action button
    const trigger = await findPrimaryActionButton(page);
    if (!trigger) {
      throw new Error(`No primary action button found on ${url}. Looked for: Add New, Create New, New, Add, Create.`);
    }

    const triggerText = await trigger.innerText().catch(() => "unknown");
    await trigger.click();

    // Wait for the dialog to appear
    await page.waitForSelector(dialogSelector, { state: "visible", timeout: 10000 });
    await page.waitForTimeout(500); // allow animations to settle

    // Measure the dialog element
    const dialogElement = page.locator(dialogSelector).first();
    const dialogRect = await dialogElement.boundingBox();
    const dialogStyles = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        fontWeight: s.fontWeight,
        color: s.color,
        backgroundColor: s.backgroundColor,
        border: s.border,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
        padding: s.padding,
        maxWidth: s.maxWidth,
        width: s.width,
        minHeight: s.minHeight,
      };
    }, dialogSelector);

    // Collect component inventory within the dialog
    const inventory = await collectComponentInventory(page, dialogSelector);

    // Collect typography within the dialog
    const typography = await collectTypography(page, dialogSelector);

    // Write overlay-report.json beside the existing report.json
    ensureDir(outputDir);

    const report = {
      capture: {
        type: "overlay",
        url,
        triggerText,
        dialogSelector,
        capturedAt: new Date().toISOString(),
        viewport: { width: Number(width), height: Number(height) },
      },
      measurements: {
        component: {
          selector: dialogSelector,
          rect: dialogRect,
          style: dialogStyles,
        },
      },
      typography: {
        scale: typography,
      },
      components: {
        inventory,
      },
    };

    const reportPath = path.join(outputDir, "overlay-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

    await context.close();

    return { reportPath };
  } finally {
    await browser.close();
  }
}
```

**Step 2: Verify the module loads**

Run: `node -e "import('file:///e:/writing-system/docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs').then(m => console.log('Exports:', Object.keys(m)))"`
Expected: `Exports: [ 'measureOverlay' ]`

**Step 3: Commit**

```bash
git add docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs
git commit -m "feat: add measure-overlay.mjs for dialog/component capture"
```

---

## Task 5: Wire overlay capture into capture-server.mjs

**Files:**
- Modify: `scripts/capture-server.mjs`

**Step 1: Add overlay module loader**

Near the existing `loadMeasureModule()` function (line ~393), add:

```javascript
async function loadOverlayModule() {
  return import(pathToFileURL(path.join(skillScriptsDir, "measure-overlay.mjs")).href);
}
```

**Step 2: Update `startCapture` to pass overlay boolean through**

In the `startCapture` function, after destructuring `body` (line ~398), extract the boolean:

```javascript
const {
  url,
  width = 1920,
  height = 1080,
  theme = "light",
  pageType = "settings",
  forceAuth = false,
  needsOverlayCapture = false,
} = body;
```

Add to the `entry` object:

```javascript
hasOverlay: needsOverlayCapture,
```

No `overlayConfig` or `overlayName` needed — the script owns the interaction logic.

**Step 3: Update `runCapture` to run overlay after base capture**

After the existing `await mod.measureLayout(measureOptions)` call succeeds (line ~483), add:

```javascript
// Run overlay capture if requested
if (entry.hasOverlay) {
  console.log(`[capture] Running overlay capture for ${id}`);
  try {
    const overlayMod = await loadOverlayModule();

    // Determine the theme directory where report.json was written
    // measureLayout writes to <outputDir>/<theme>/, so overlay-report.json goes there too
    const themeDir = path.join(options.outputDir, options.theme === "both" ? "light" : options.theme);

    await overlayMod.measureOverlay({
      url: options.url,
      width: options.width,
      height: options.height,
      storageStatePath: options.storageStatePath,
      outputDir: themeDir,
      repoRoot,
    });
    console.log(`[capture] Overlay capture complete for ${id}`);
  } catch (overlayErr) {
    console.error(`[capture] Overlay capture failed for ${id}:`, overlayErr.message);
    // Don't fail the whole capture — base page succeeded
  }
}
```

**Step 4: Verify the server starts**

Run: `node scripts/capture-server.mjs`
Expected: Server starts on port 4488 without errors

**Step 5: Commit**

```bash
git add scripts/capture-server.mjs
git commit -m "feat(capture-server): wire overlay capture after base page measurement"
```

---

## Task 6: End-to-end verification and final commit

**Step 1: Start the capture server**

Run: `npm run capture-server`

**Step 2: Start the web dev server**

Run: `cd web && npm run dev`

**Step 3: Navigate to the Design Layout Captures admin page**

Open the superuser admin page in the browser. Verify:
- Table rows show 3-dot menu + delete button (not 5 buttons)
- 3-dot menu shows "View Screenshot" and "View JSON" for complete captures
- Toolbar buttons are text-only ("Refresh", "Add New") — no icons next to text
- Modal "Capture" button is text-only
- Theme dropdown has only "Light" and "Dark" — no "Both"
- Delete button works

**Step 4: Test a capture with overlay**

Use the Add New form:
- Enter a URL that has a dialog trigger (e.g., a settings page with an "Add New" button)
- Check "Capture overlay component"
- Click Capture

Verify:
- Base page capture completes
- Theme folder contains `report.json` plus `overlay-report.json`
- In the table, the 3-dot menu for this capture shows 3 items: View Screenshot, View JSON, View Overlay JSON

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: overlay component capture + admin actions cleanup"
```