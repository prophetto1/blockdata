# Overlay Capture & Admin Actions Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add overlay/component capture capability (click a button, wait for dialog, measure the dialog separately) and clean up the admin table's row actions into a 3-dot dropdown menu.

**Architecture:** The capture server runs two independent browser sessions per capture when an overlay is configured — one for the base page (existing `measureLayout`), one for the overlay (new `measureOverlay`). The overlay produces its own report.json + screenshots in a subdirectory. The admin UI replaces 5 action buttons with a context menu (2 or 4 items depending on overlay presence) plus a standalone delete button.

**Tech Stack:** Playwright (browser automation), Node.js (capture server), React + Ark UI Menu (admin UI), TypeScript

---

## Task 1: Update shared types

**Files:**
- Modify: `web/src/pages/superuser/design-captures.types.ts`

**Step 1: Add overlay types to CaptureRequest and CaptureEntry**

```typescript
export type CaptureStatus = 'pending' | 'auth-needed' | 'capturing' | 'complete' | 'failed';

export type PageType = 'settings' | 'editor' | 'dashboard' | 'workbench' | 'marketing';

export type ThemeRequest = 'light' | 'dark' | 'both';

export type OverlayConfig = {
  triggerText: string;
  waitFor?: string;
};

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
  overlayName?: string;
};

export type CaptureRequest = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
  pageType: PageType;
  forceAuth?: boolean;
  overlay?: OverlayConfig;
};
```

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors (types are additive)

**Step 3: Commit**

```bash
git add web/src/pages/superuser/design-captures.types.ts
git commit -m "feat(types): add overlay config to capture types"
```

---

## Task 2: Admin UI — replace row action buttons with 3-dot dropdown + delete

**Files:**
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`

**Reference:** The Menu component is at `web/src/components/ui/menu.tsx`. It exports `MenuRoot`, `MenuTrigger`, `MenuPositioner`, `MenuContent`, `MenuItem`, `MenuPortal`. `IconDots` is already used in `web/src/components/shell/LeftRailShadcn.tsx`.

**Step 1: Add imports**

Add to the existing imports at the top of `DesignLayoutCaptures.tsx`:

```typescript
import { IconDots } from '@tabler/icons-react';
import {
  MenuRoot,
  MenuTrigger,
  MenuPositioner,
  MenuPortal,
  MenuContent,
  MenuItem,
} from '@/components/ui/menu';
```

Remove unused imports: `IconCamera`, `IconDownload`, `IconRefresh`.

**Step 2: Remove `handleReCapture` function**

Delete the entire `handleReCapture` function (lines ~305-342). It is no longer needed.

**Step 3: Replace the actions cell in the table row**

Replace the current 5-button actions `<td>` (lines ~596-654) with:

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
                leftSection={<IconEye size={14} />}
                onClick={() =>
                  window.open(
                    captureFileUrl(
                      makeCaptureEntryForPreview(row),
                      row.theme === 'both' ? 'light' : row.theme,
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
                leftSection={<IconEye size={14} />}
                onClick={() =>
                  window.open(
                    captureFileUrl(
                      makeCaptureEntryForPreview(row),
                      row.theme === 'both' ? 'light' : row.theme,
                      'report.json',
                    ),
                    '_blank',
                  )
                }
              >
                View JSON
              </MenuItem>
              {row.hasOverlay && row.overlayName && (
                <>
                  <MenuItem
                    value="view-component"
                    leftSection={<IconEye size={14} />}
                    onClick={() =>
                      window.open(
                        captureFileUrl(
                          makeCaptureEntryForPreview(row),
                          row.theme === 'both' ? 'light' : row.theme,
                          `overlays/${row.overlayName}/component.png`,
                        ),
                        '_blank',
                      )
                    }
                  >
                    View Component
                  </MenuItem>
                  <MenuItem
                    value="view-component-json"
                    leftSection={<IconEye size={14} />}
                    onClick={() =>
                      window.open(
                        captureFileUrl(
                          makeCaptureEntryForPreview(row),
                          row.theme === 'both' ? 'light' : row.theme,
                          `overlays/${row.overlayName}/report.json`,
                        ),
                        '_blank',
                      )
                    }
                  >
                    View Component JSON
                  </MenuItem>
                </>
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

**Step 4: Clean up unused code**

- Remove `handleReCapture` function entirely
- Remove `IconCamera`, `IconDownload`, `IconRefresh` from the import block (verify they aren't used elsewhere in the file first)
- Remove the `deleteCapabilityCache`, `checkServerDeleteCapability`, and `staleDeleteServerError` if the delete fallback logic is no longer needed (keep for now if unsure)

**Step 5: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add web/src/pages/superuser/DesignLayoutCaptures.tsx
git commit -m "feat(admin): replace row action buttons with 3-dot dropdown menu"
```

---

## Task 3: Admin UI — add overlay fields to Add New form

**Files:**
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`

**Step 1: Extend captureForm state to include overlay**

Update the initial state and type reference. Find the `captureForm` useState:

```typescript
const [captureForm, setCaptureForm] = useState<CaptureRequest>({
  url: '',
  width: 1920,
  height: 1080,
  theme: 'light',
  pageType: 'settings',
});
```

No change needed here — `overlay` is optional on `CaptureRequest`, so it's already valid.

**Step 2: Add overlay fields in the dialog body**

After the Theme/Page Type `grid grid-cols-2` div and before the status feedback section, add:

```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={!!captureForm.overlay}
    onChange={(e) => {
      const checked = e.currentTarget.checked;
      setCaptureForm((f) => ({
        ...f,
        overlay: checked ? { triggerText: '' } : undefined,
      }));
    }}
    className="h-4 w-4 rounded border-input"
  />
  <span className="text-sm font-medium">Capture overlay component</span>
</label>

{captureForm.overlay && (
  <div className="grid grid-cols-2 gap-3">
    <label className="block">
      <span className="text-sm font-medium">Trigger button text</span>
      <input
        type="text"
        value={captureForm.overlay.triggerText}
        onChange={(e) => {
          const value = e.currentTarget?.value ?? '';
          setCaptureForm((f) => ({
            ...f,
            overlay: f.overlay ? { ...f.overlay, triggerText: value } : undefined,
          }));
        }}
        placeholder='e.g. "Add New"'
        className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
    <label className="block">
      <span className="text-sm font-medium">Wait for selector</span>
      <input
        type="text"
        value={captureForm.overlay.waitFor ?? ''}
        onChange={(e) => {
          const value = e.currentTarget?.value ?? '';
          setCaptureForm((f) => ({
            ...f,
            overlay: f.overlay ? { ...f.overlay, waitFor: value || undefined } : undefined,
          }));
        }}
        placeholder='[role="dialog"] (default)'
        className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
  </div>
)}
```

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add web/src/pages/superuser/DesignLayoutCaptures.tsx
git commit -m "feat(admin): add overlay config fields to Add New capture form"
```

---

## Task 4: New script — measure-overlay.mjs

**Files:**
- Create: `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs`

This script runs its own browser session: navigates to the URL with auth, clicks the trigger button, waits for the dialog, then measures and screenshots the dialog element.

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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
 * Measure a dialog/overlay component after clicking a trigger.
 *
 * @param {object} options
 * @param {string} options.url - Page URL to navigate to
 * @param {string} options.triggerText - Button text to click
 * @param {string} [options.waitFor] - Selector to wait for after click (default: [role="dialog"])
 * @param {number} [options.width] - Viewport width
 * @param {number} [options.height] - Viewport height
 * @param {string} [options.storageStatePath] - Path to auth storage state
 * @param {string} options.outputDir - Where to write report + screenshots
 * @param {string} [options.repoRoot] - Repository root path
 */
export async function measureOverlay(options) {
  const {
    url,
    triggerText,
    waitFor = '[role="dialog"]',
    width = 1920,
    height = 1080,
    storageStatePath,
    outputDir,
    repoRoot = process.cwd(),
  } = options;

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

    // Navigate and wait for page to be ready
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Click the trigger button
    const trigger = page.getByRole("button", { name: triggerText });
    await trigger.waitFor({ state: "visible", timeout: 10000 });
    await trigger.click();

    // Wait for the dialog/overlay to appear
    const dialogSelector = waitFor;
    await page.waitForSelector(dialogSelector, { state: "visible", timeout: 10000 });
    await page.waitForTimeout(500); // allow animations to settle

    const dialogElement = page.locator(dialogSelector).first();

    // Measure the dialog element
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

    // Take screenshots
    ensureDir(outputDir);

    const componentPath = path.join(outputDir, "component.png");
    await dialogElement.screenshot({ path: componentPath });

    const viewportPath = path.join(outputDir, "viewport.png");
    await page.screenshot({ path: viewportPath });

    // Build report
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

    const reportPath = path.join(outputDir, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

    await context.close();

    return { reportPath, componentPath, viewportPath };
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

Note: This file is under `docs/jon/` which is gitignored. This commit will need `git add -f` to force-add it, OR the `.gitignore` pattern for `docs/jon/` needs an exclusion for the skills scripts. Decide at implementation time — if the scripts should be tracked, add `!docs/jon/skills/` to `.gitignore`.

---

## Task 5: Wire overlay capture into capture-server.mjs

**Files:**
- Modify: `scripts/capture-server.mjs`

**Step 1: Import measure-overlay module loader**

Near the existing `loadMeasureModule()` function (line ~393), add:

```javascript
async function loadOverlayModule() {
  return import(pathToFileURL(path.join(skillScriptsDir, "measure-overlay.mjs")).href);
}
```

**Step 2: Update `startCapture` to pass overlay config through**

In the `startCapture` function, after destructuring `body` (line ~398), extract overlay:

```javascript
const {
  url,
  width = 1920,
  height = 1080,
  theme = "light",
  pageType = "settings",
  forceAuth = false,
  overlay = null,
} = body;
```

Add overlay to the `entry` object:

```javascript
const entry = {
  id,
  name: slug,
  url,
  viewport: `${width}x${height}`,
  theme,
  pageType,
  capturedAt: null,
  outputDir: path.relative(path.join(repoRoot, "docs", "design-layouts"), outputDir).replace(/\\/g, "/"),
  status: "pending",
  hasOverlay: !!overlay,
  overlayName: overlay ? slugify(overlay.triggerText) : null,
  overlayConfig: overlay || null,
};
```

Add a `slugify` helper near the top of the file:

```javascript
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
```

**Step 3: Update `runCapture` to run overlay after base capture**

After the existing `await mod.measureLayout(measureOptions)` call succeeds (line ~483), add:

```javascript
// Run overlay capture if configured
if (entry.overlayConfig) {
  console.log(`[capture] Running overlay capture for ${id} — trigger: "${entry.overlayConfig.triggerText}"`);
  try {
    const overlayMod = await loadOverlayModule();
    const overlayOutputDir = path.join(options.outputDir, "overlays", slugify(entry.overlayConfig.triggerText));
    await overlayMod.measureOverlay({
      url: options.url,
      triggerText: entry.overlayConfig.triggerText,
      waitFor: entry.overlayConfig.waitFor,
      width: options.width,
      height: options.height,
      storageStatePath: options.storageStatePath,
      outputDir: overlayOutputDir,
      repoRoot,
    });
    console.log(`[capture] Overlay capture complete for ${id}`);
  } catch (overlayErr) {
    console.error(`[capture] Overlay capture failed for ${id}:`, overlayErr.message);
    // Don't fail the whole capture — base page succeeded
  }
}
```

**Step 4: Exclude `overlayConfig` from captures.json persistence**

In `writeCaptures`, the full entry (including `overlayConfig`) gets written. This is fine — it's needed for re-capture. No change needed.

**Step 5: Verify the server starts**

Run: `node scripts/capture-server.mjs`
Expected: Server starts on port 4488 without errors

**Step 6: Commit**

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
- Delete button works

**Step 4: Test a capture with overlay**

Use the Add New form:
- Enter a URL that has a dialog trigger (e.g., a settings page with "Add New" button)
- Check "Capture overlay component"
- Enter trigger text (e.g., "Add New")
- Leave wait-for selector as default
- Click Capture

Verify:
- Base page capture completes
- Overlay subdirectory created: `<capture-dir>/<viewport>/light/overlays/<trigger-slug>/`
- Overlay directory contains: `report.json`, `component.png`, `viewport.png`
- In the table, the 3-dot menu for this capture shows 4 items

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: overlay component capture + admin actions cleanup"
```
