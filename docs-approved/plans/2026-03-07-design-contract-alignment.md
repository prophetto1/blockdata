# Design Contract Alignment: web-docs → web

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align web-docs styling with the web app's design contracts so both sites share the same visual language (fonts, colors, spacing tokens) while using DM Sans as the docs-specific primary font for variety.

**Architecture:** Replace web-docs' divergent CSS custom properties with values from web's contract files. The primary font changes from Nunito → DM Sans (already used in web's marketing pages). Color tokens gain parity. Starlight's `--sl-*` bridge variables continue to map from the shared semantic tokens. No shared package — just matching values.

**Tech Stack:** CSS custom properties, @fontsource imports, Astro/Starlight, Tailwind CSS 4

---

### Task 1: Switch primary font from Nunito to DM Sans

**Files:**
- Modify: `web-docs/src/styles/global.css:1-21` (font imports and --app-font-sans)
- Modify: `web-docs/src/styles/global.css:158-161` (sidebar-pane hardcoded Nunito)
- Modify: `web-docs/package.json` (remove @fontsource/nunito)

**Step 1: Update font imports in global.css**

Replace the Nunito @fontsource imports (lines 7-10) with DM Sans imports, and update the `--app-font-sans` variable.

Change lines 7-10 from:
```css
@import '@fontsource/nunito/400.css';
@import '@fontsource/nunito/500.css';
@import '@fontsource/nunito/600.css';
@import '@fontsource/nunito/700.css';
```
to:
```css
@import '@fontsource/dm-sans/400.css';
@import '@fontsource/dm-sans/500.css';
@import '@fontsource/dm-sans/600.css';
@import '@fontsource/dm-sans/700.css';
```

Change line 20 from:
```css
--app-font-sans: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```
to:
```css
--app-font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

**Step 2: Remove hardcoded Nunito from sidebar-pane**

Change:
```css
.sidebar-pane {
  font-family: "Nunito", var(--app-font-sans);
  font-size: 0.85rem;
}
```
to:
```css
.sidebar-pane {
  font-family: var(--app-font-sans);
  font-size: 0.85rem;
}
```

**Step 3: Swap npm packages**

Run: `cd web-docs && npm uninstall @fontsource/nunito && npm install @fontsource/dm-sans`

**Step 4: Verify build**

Run: `cd web-docs && npx astro check`
Expected: 0 errors

**Step 5: Commit**

```bash
git add web-docs/src/styles/global.css web-docs/package.json web-docs/package-lock.json
git commit -m "style(web-docs): switch primary font from Nunito to Inter

Uses DM Sans (already in web's marketing pages) as docs-specific
primary font, replacing Nunito for better brand coherence."
```

---

### Task 2: Align dark-mode color tokens with web contract

**Files:**
- Modify: `web-docs/src/styles/global.css:17-82` (dark :root block)

**Step 1: Update the dark :root block**

The web-docs dark tokens are already very close to web's. The key changes:

1. Remove the `--separator` indirection — use `--border` directly (matching web)
2. Add missing tokens from web: `--chrome`, `--destructive`, `--destructive-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent-foreground`, `--sidebar-ring`, `--app-primary-contrast`
3. Update `--sl-color-hairline` and `--sl-color-hairline-shade` to use `--border` instead of `--separator`
4. Update `--editor-border` to reference `--border` instead of `--sl-color-hairline`

Replace the dark `:root` block (lines 17-82) with:
```css
:root {
  color-scheme: dark;
  --radius: 0.625rem;
  --app-font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --app-font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --app-space-xs: 0.5rem;
  --app-space-sm: 0.75rem;
  --app-space-md: 1rem;
  --app-space-lg: 1.5rem;
  --sl-nav-height: 50px;

  /* Semantic color tokens (dark default) — aligned with web/src/tailwind.css */
  --background: #0e0e0e;
  --foreground: #eeeeee;
  --card: #141414;
  --card-foreground: #eeeeee;
  --popover: #141414;
  --popover-foreground: #eeeeee;
  --primary: #EB5E41;
  --primary-foreground: #ffffff;
  --secondary: #1a1a1a;
  --secondary-foreground: #eeeeee;
  --muted: #1a1a1a;
  --muted-foreground: #a0a0a0;
  --accent: #1a1a1a;
  --accent-foreground: #eeeeee;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #2a2a2a;
  --input: #2a2a2a;
  --ring: #EB5E41;
  --chrome: #0e0e0e;
  --sidebar: #0e0e0e;
  --sidebar-foreground: #eeeeee;
  --sidebar-primary: #EB5E41;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1a1a1a;
  --sidebar-accent-foreground: #eeeeee;
  --sidebar-border: #2a2a2a;
  --sidebar-ring: #eeeeee;
  --app-primary-contrast: #09090b;

  /* Starlight bridge variables */
  --sl-font: var(--app-font-sans);
  --sl-font-mono: var(--app-font-mono);
  --sl-color-accent-low: #2a1510;
  --sl-color-accent: var(--primary);
  --sl-color-accent-high: #fcd5cc;
  --sl-color-purple-low: #2a1510;
  --sl-color-purple: var(--primary);
  --sl-color-purple-high: #fcd5cc;
  --sl-color-white: #ffffff;
  --sl-color-gray-1: #f5f5f5;
  --sl-color-gray-2: #d4d4d8;
  --sl-color-gray-3: #a1a1aa;
  --sl-color-gray-4: #71717a;
  --sl-color-gray-5: #52525b;
  --sl-color-gray-6: #3f3f46;
  --sl-color-black: #09090b;
  --sl-color-bg: var(--background);
  --sl-color-bg-nav: var(--card);
  --sl-color-bg-sidebar: var(--card);
  --sl-color-bg-inline-code: color-mix(in oklab, var(--card) 80%, var(--foreground) 20%);
  --sl-color-text: var(--foreground);
  --sl-color-text-accent: var(--primary);
  --sl-color-hairline: var(--border);
  --sl-color-hairline-shade: var(--border);
  --sl-color-backdrop-overlay: rgba(9, 9, 11, 0.72);

  /* Editor surface variables */
  --editor-bg: var(--sl-color-bg);
  --editor-fg: var(--sl-color-text);
  --editor-muted-fg: var(--sl-color-gray-3);
  --editor-chrome-bg: var(--sl-color-bg-nav);
  --editor-border: var(--border);
  --editor-accent: var(--sl-color-text-accent);
  --editor-success: #4ade80;
  --editor-danger: #f87171;
}
```

**Step 2: Verify build**

Run: `cd web-docs && npx astro check`
Expected: 0 errors

**Step 3: Commit**

```bash
git add web-docs/src/styles/global.css
git commit -m "style(web-docs): align dark-mode tokens with web contract

Removes --separator indirection, adds missing tokens (--chrome,
--destructive, sidebar-primary/ring, --app-primary-contrast),
references --border directly for hairline and editor-border."
```

---

### Task 3: Align light-mode color tokens with web contract

**Files:**
- Modify: `web-docs/src/styles/global.css:84-133` (light :root block)

**Step 1: Update the light :root[data-theme='light'] block**

Key changes from current web-docs light mode:
1. `--muted-foreground`: `#57534e` → `#44403c` (matches web contract)
2. Remove `--separator` indirection — use `--border` directly
3. Add missing tokens: `--chrome`, `--destructive`, `--destructive-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent-foreground`, `--sidebar-ring`, `--app-primary-contrast`
4. Update hairline and editor-border refs

Replace the light mode block with:
```css
:root[data-theme='light'] {
  color-scheme: light;

  /* Core surfaces & text (warm stone scale) — aligned with web/src/tailwind.css */
  --background: #faf9f7;
  --foreground: #1c1917;
  --card: #ffffff;
  --card-foreground: #1c1917;
  --popover: #ffffff;
  --popover-foreground: #1c1917;
  --primary: #EB5E41;
  --primary-foreground: #ffffff;
  --secondary: #f0eeed;
  --secondary-foreground: #292524;
  --muted: #e8e6e3;
  --muted-foreground: #44403c;
  --accent: #f5ebe6;
  --accent-foreground: #1c1917;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #d6d3d1;
  --input: #d6d3d1;
  --ring: #EB5E41;
  --chrome: #ffffff;
  --sidebar: #ffffff;
  --sidebar-foreground: #1c1917;
  --sidebar-primary: #EB5E41;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f5f3f1;
  --sidebar-accent-foreground: #1c1917;
  --sidebar-border: #e8e5e3;
  --sidebar-ring: #1c1917;
  --app-primary-contrast: #fafafa;

  /* Starlight bridge variables (light) */
  --sl-color-white: #1c1917;
  --sl-color-gray-1: #292524;
  --sl-color-gray-2: #44403c;
  --sl-color-gray-3: #57534e;
  --sl-color-gray-4: #78716c;
  --sl-color-gray-5: #a8a29e;
  --sl-color-gray-6: #d6d3d1;
  --sl-color-black: #ffffff;
  --sl-color-bg: var(--background);
  --sl-color-bg-nav: var(--card);
  --sl-color-bg-sidebar: var(--card);
  --sl-color-bg-inline-code: color-mix(in oklab, var(--accent) 72%, var(--background) 28%);
  --sl-color-text: var(--foreground);
  --sl-color-text-accent: var(--primary);
  --sl-color-hairline: var(--border);
  --sl-color-hairline-shade: var(--border);
  --sl-color-backdrop-overlay: rgba(28, 25, 23, 0.48);

  /* Editor surface variables (light) */
  --editor-bg: var(--sl-color-bg);
  --editor-fg: var(--sl-color-text);
  --editor-muted-fg: var(--sl-color-gray-3);
  --editor-chrome-bg: var(--sl-color-bg-nav);
  --editor-border: var(--border);
  --editor-accent: var(--sl-color-text-accent);
  --editor-success: #15803d;
  --editor-danger: #b91c1c;
}
```

**Step 2: Remove any remaining `--separator` references in the rest of the file**

Search the file for `var(--separator)`. After replacing both :root blocks, there should be none remaining.

**Step 3: Verify build**

Run: `cd web-docs && npx astro check`
Expected: 0 errors

**Step 4: Commit**

```bash
git add web-docs/src/styles/global.css
git commit -m "style(web-docs): align light-mode tokens with web contract

Updates --muted-foreground to #44403c, removes --separator
indirection, adds missing light-mode tokens matching web."
```

---

### Task 4: Visual verification

**Files:** None (verification only)

**Step 1: Start the dev server**

Run: `cd web-docs && npm run dev`

**Step 2: Visual check**

Open http://localhost:4421 in the browser and verify:
- Font is Inter (not Nunito) — check body text, headings, sidebar
- Dark mode colors look correct — backgrounds, text, borders
- Light mode colors look correct — toggle theme, check same surfaces
- Code blocks still use JetBrains Mono
- Editor (file tree mode) still renders correctly — split pane, Monaco, MDX editor
- No visual regressions on headings, tables, code blocks

**Step 3: Commit (if any tweaks needed)**

Only commit if visual check revealed necessary adjustments.

---

## Diff Summary

| Token | web-docs (before) | web (target) | Changed? |
|-------|-------------------|--------------|----------|
| `--app-font-sans` | Nunito | DM Sans | YES |
| `--border` (dark) | via `--separator` | `#2a2a2a` direct | YES |
| `--border` (light) | via `--separator` | `#d6d3d1` direct | YES |
| `--muted-foreground` (light) | `#57534e` | `#44403c` | YES |
| `--chrome` | missing | `#0e0e0e` / `#ffffff` | ADDED |
| `--destructive` | missing | `#dc2626` | ADDED |
| `--destructive-foreground` | missing | `#ffffff` | ADDED |
| `--sidebar-primary` | missing | `#EB5E41` | ADDED |
| `--sidebar-primary-foreground` | missing | `#ffffff` | ADDED |
| `--sidebar-accent-foreground` | missing | `#eeeeee` / `#1c1917` | ADDED |
| `--sidebar-border` (dark) | via `--separator` | `#2a2a2a` direct | YES |
| `--sidebar-border` (light) | via `--separator` | `#e8e5e3` | YES |
| `--sidebar-ring` | missing | `#eeeeee` / `#1c1917` | ADDED |
| `--app-primary-contrast` | missing | `#09090b` / `#fafafa` | ADDED |
| All other color tokens | identical | identical | NO |