# Changelog

## 2026-02-17

### Scope
Frontend redesign work completed in `new-site` (layout shell, canvas behavior, interaction states, and theme polish).

### Completed
1. Rebuilt the shell interaction layer and navigation behavior in `src/prototype/LayoutShell.tsx` and `src/prototype/layout-shell.css`, including keyboard-accessible main/context rail tablists with arrow-key traversal and activation behavior, click-toggle dev navigation with outside-click and `Escape` close handling, actionable header menus for `Transform` / `Extract` / `Run`, unified focus-visible treatment across controls, improved hover/active/disabled state consistency, tokenized menu/dropdown/button styling, touch-device hover guardrails, reduced-motion support, and general shell CSS cleanup toward a single token-driven interaction contract.
2. Upgraded page and canvas surfaces in `src/App.tsx` and `src/prototype/FlowCanvas.tsx`, including removal of inline style drift in favor of reusable tokenized utility classes, reusable nav item structure, standardized request/settings/workbench card layouts, split-pane and index/not-found surface cleanup, explicit React Flow node state variants (`default`, `warning`, `error`, `disabled`), visible source/target handles, selected/disabled node and selected edge samples for state validation, deterministic interaction thresholds (`nodeDragThreshold`, `connectionDragThreshold`, `paneClickDistance` all set to `3`), and styling alignment for node/edge/handle visuals with the updated dark-gray/black theme direction.

### Theme Update (Dark Gray / Black)
Current primary dark tokens in `src/prototype/layout-shell.css`:
- `--surface-primary: #151515`
- `--surface-canvas: #0d0d0d`
- `--surface-secondary: #1f1f1f`
- `--surface-tertiary: #2a2a2a`
- `--brand-primary: #5aa2ff`
- `--brand-action: #2f82e6`

### Spec Alignment

1. Updated `2026-02-17-frontend-redesign-master-spec-v1.md` color token pack from v1 to v1.1 to match the implemented dark-gray/blue palette. All 14 color tokens now match `layout-shell.css` exactly. No spacing, radius, typography, elevation, or motion tokens changed (they were already in sync).

### Verification
- `npm run lint` passed.
- `npm run build` passed.
