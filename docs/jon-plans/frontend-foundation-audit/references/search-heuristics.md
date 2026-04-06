# Search Heuristics

Convention-based strategies for locating foundation elements in any repo. Adapt to whatever naming conventions the target repo uses. This is a reference checklist, not a sequential procedure — use it to confirm coverage after initial exploration.

## Shell layout owners
- Search for files exporting components that render `<header>`, `<nav>`, `<main>`, `<aside>` at the top level
- Look for layout route wrappers: files imported by router configs that wrap `<Outlet>` or `children`
- Search for "Layout", "Shell", "AppShell", "Frame" in component names
- Check for shell state stores (context providers, zustand stores, or localStorage usage near shell components)

## Token and theme files
- Search for files defining CSS custom properties (`--`)
- Look for Tailwind config extensions (`tailwind.config.*`)
- Search for styled-system theme objects or `createTheme`/`defineConfig` factory calls
- Search for files named with "token", "theme", "palette", "color", "spacing"
- Check for raw hex values in component files that bypass the token system

## Navigation owners
- Search for components rendering `<nav>` elements
- Look for route config arrays or router definition files
- Search for "Nav", "Sidebar", "Rail", "Menu" in component names
- Check for breadcrumb components

## Shared components
- Search for directories named "components", "ui", "primitives", "shared"
- Look for barrel exports (`index.ts` re-exporting multiple components)
- Count import frequency across the codebase to identify high-reuse components
- Search for component libraries in dependencies (shadcn, radix, ark-ui, etc.)

## Page patterns
- Search route configs for page-level components
- Group pages by structural similarity: list+detail, form/wizard, dashboard, settings, tabbed workspace
- Check whether pages use the canonical shell frame or bypass it

## State presentation
- Search for "loading", "empty", "error", "skeleton", "spinner", "fallback" in component names and JSX
- Search for ErrorBoundary usage
- Search for toast/notification hooks or components
- Check for permission-guard or access-denied patterns
