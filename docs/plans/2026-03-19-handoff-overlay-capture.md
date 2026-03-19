# Handoff: Overlay Capture & Admin Cleanup

**Date:** 2026-03-19
**Status:** Plan written (v2 with review feedback applied), not yet implemented
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

**Solution:** Two-pass capture. Pass 1 runs `measureLayout()` as normal. Pass 2 opens a second browser session, navigates to the same URL, auto-detects the primary action button, clicks it, waits for `[role="dialog"]`, then measures the dialog. Script owns all interaction logic — no user-provided selectors or button text.

**Output:** Single file `overlay-report.json` placed beside `report.json` in the theme folder. No screenshots in v1, no subdirectory.

```
<capture-dir>/<viewport>/light/
  report.json            ← base page (existing)
  viewport.png           ← base page (existing)
  full-page.png          ← base page (existing)
  overlay-report.json    ← dialog-only measurements (NEW)
```

### Feature: Admin table actions cleanup
**Problem:** 5 action buttons per row (view, download, re-capture, re-capture-with-auth, delete) — confusing, redundant. Re-capture is just delete + add new.

**Solution:** Replace with 3-dot dropdown menu + standalone delete button.
- No overlay: 2 menu items (View Screenshot, View JSON)
- With overlay: 3 menu items (+ View Overlay JSON)
- Delete button stays separate (destructive action outside the menu)
- All icon+text buttons become text-only; icon-only buttons (3-dot, delete) stay icon-only

### Other changes
- **"Both" theme removed** — one theme per capture (Light or Dark)
- **Re-capture buttons removed** — workflow is delete + add new

---

## Files involved

| File | Role |
|------|------|
| `.gitignore` | Add `!docs/jon/skills/` exception so skill scripts are tracked |
| `web/src/pages/superuser/design-captures.types.ts` | Remove `'both'` from ThemeRequest, add `hasOverlay?: boolean` to CaptureEntry, add `needsOverlayCapture?: boolean` to CaptureRequest |
| `web/src/pages/superuser/DesignLayoutCaptures.tsx` | 3-dot dropdown menu, text-only buttons, overlay checkbox, remove recapture + "both" theme |
| `web/src/components/ui/menu.tsx` | Existing Ark UI Menu component (ready to use) |
| `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-overlay.mjs` | NEW — dialog measurement script, script-owned interaction, JSON-only output |
| `scripts/capture-server.mjs` | Wire overlay: `loadOverlayModule()`, call `measureOverlay` after base capture, write to theme dir |

## Key decisions made
- **Two independent browser sessions** — keeps base capture unchanged
- **Overlay failure doesn't fail the whole capture** — base page succeeds independently
- **Script owns interaction logic** — auto-detects primary action button, uses `[role="dialog"]`, no user config
- **JSON-only v1** — no overlay screenshots, just `overlay-report.json`
- **One theme per capture** — "Both" option removed, prevents scope creep
- **`docs/jon/skills/` tracked via .gitignore exception** — no `git add -f`
- **Same wait strategy** as measure-layout.mjs: `waitUntil: "load"` + best-effort networkidle with 5s cap
- **Button pattern** — icon-only (3-dot trigger, trash) or text-only (Refresh, Add New, Capture). No icon+text combos.

## Review feedback applied (v2)
The plan was reviewed and 8 items of feedback were applied:
1. Fixed overlay path mismatch — output goes into theme dir, not above it
2. Boolean toggle instead of freeform triggerText/waitFor fields
3. Recapture stays removed (user decision)
4. Import cleanup scoped correctly — only remove truly unused icons
5. Gitignore exception added as explicit pre-step
6. Wait strategy matches measure-layout.mjs
7. "Both" theme option eliminated
8. Verification criteria match actual v1 output

## Execution
Plan has pre-step + 6 tasks. Recommended: subagent-driven in a single session. Start with `/using-superpowers` then execute the plan task by task.
