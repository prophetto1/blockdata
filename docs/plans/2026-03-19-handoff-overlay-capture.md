# Handoff: Overlay Capture & Admin Cleanup

**Date:** 2026-03-19
**Status:** Plan written, not yet implemented
**Plan:** `docs/plans/2026-03-19-overlay-capture-and-admin-cleanup.md`

---

## What happened this session

### Repo cleanup (done, pushed)
1. Gitignored `docs/jon/` — personal docs no longer tracked
2. Moved `docker-compose.docling.yml` → `services/`
3. Moved `openapi.yml` → `services/platform-api/`
4. Moved `jobs/opinions-import/` → `services/opinions-import/`
5. Moved `implementation-guide.md` + `sample-task-schema.json` → `docs/`
6. Deleted root junk files (tmp-*, secpol-*, guest-network-*)
7. Cleaned stale `.gitignore` lines (`!docs/skills/`)
8. Fixed capture server skill path: `docs/skills/` → `docs/jon/skills/` in `scripts/capture-server.mjs`

### Capture server state
- **Running:** Was started this session on port 4488 (PID 9864), may need restart after reboot
- **Start command:** `npm run capture-server` or `node scripts/capture-server.mjs`
- **PowerShell launcher:** `scripts/start-capture-server.ps1` (background with logging)
- **Skill scripts location:** `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/`
- **Three copies exist:** `docs/jon/skills/...`, `C:/Users/jwchu/.claude/skills/...`, `.codex/...` — capture server uses `docs/jon/skills/`

### Current capture output assessment
- Screenshots: good (viewport.png + full-page.png)
- Shell structure, typography, theme tokens: good
- **Component inventories: empty** — leftRailInventory and mainCanvasInventory return `[]` for the Gumloop page. The measurement engine doesn't detect the left rail or main canvas as distinct zones on every page.
- Enough for ~80% reproduction from screenshot + JSON. Missing individual element measurements for 1:1.

---

## What needs to be built (the plan)

### Feature: Overlay/component capture
**Problem:** Some pages have dialogs triggered by button clicks (e.g., "Add New"). The current capture only measures the base page state — modals are invisible.

**Solution:** Two-pass capture. Pass 1 runs `measureLayout()` as normal. Pass 2 opens a second browser session, navigates to the same URL, clicks the trigger button, waits for the dialog, then runs a new `measureOverlay()` script scoped to just the dialog element.

**Output structure:**
```
<capture-dir>/<viewport>/light/
  report.json           ← base page (existing)
  viewport.png          ← base page (existing)
  full-page.png         ← base page (existing)
  overlays/<trigger-slug>/
    report.json         ← dialog-only measurements (NEW)
    component.png       ← cropped to dialog element (NEW)
    viewport.png        ← full viewport with dialog visible (NEW)
```

### Feature: Admin table actions cleanup
**Problem:** 5 action buttons per row (view, download, re-capture, re-capture-with-auth, delete) — confusing, redundant. Re-capture is just delete + add new.

**Solution:** Replace with 3-dot dropdown menu + standalone delete button.
- No overlay: 2 menu items (View Screenshot, View JSON)
- With overlay: 4 menu items (+ View Component, View Component JSON)
- Delete button stays separate (destructive action outside the menu)

---

## Files involved

| File | Role |
|------|------|
| `web/src/pages/superuser/design-captures.types.ts` | Add `OverlayConfig`, `hasOverlay`, `overlayName` to types |
| `web/src/pages/superuser/DesignLayoutCaptures.tsx` | Replace 5 buttons with Menu dropdown + delete. Add overlay checkbox + fields to Add New form |
| `web/src/components/ui/menu.tsx` | Existing Ark UI Menu component (ready to use) |
| `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs` | NEW — dialog measurement script |
| `scripts/capture-server.mjs` | Wire overlay: `loadOverlayModule()`, pass overlay config through `startCapture`/`runCapture`, call `measureOverlay` after base capture |

## Key decisions made
- **Two independent browser sessions** (not modifying measureLayout internals) — keeps base capture unchanged
- **Overlay failure doesn't fail the whole capture** — base page succeeds independently
- **Button text matching** for trigger (`page.getByRole('button', { name })`) — human-readable, Playwright-recommended
- **Default wait selector:** `[role="dialog"]`
- **`docs/jon/skills/` is gitignored** — measure-overlay.mjs will need `git add -f` or a gitignore exclusion for `!docs/jon/skills/`
- **Separate JSON per overlay** — not merged into base report

## Execution
Plan has 6 tasks. Recommended: subagent-driven in a single session. Start with `/using-superpowers` then execute the plan task by task.