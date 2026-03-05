# Platform Shell + AG Grid Fix Note - 2026-02-20

## Issue

1. Platform shell scope drift:
   - The app shell wrapper (`AppPageShell`) was mounted globally inside `AppLayout`, so every `/app/*` route inherited centralized max width, gap, and bottom padding.
   - That changed the intended platform layout/design instead of only applying shell constraints where explicitly wanted.

2. Grid regressions during naming/theme refactor:
   - Project listing and run creation still depended on legacy RPC names in some paths (`list_projects_overview_v2`, `create_run_v2`), while naming updates were in progress.
   - AG Grid theming had been centralized, but the shared palette path relied on indirect token resolution, which made grid rendering/styling behavior brittle during the refactor.

## What Was Done To Fix It

1. Restored platform layout behavior:
   - Removed the global `AppPageShell` wrapper from `AppLayout`.
   - `AppShell.Main` now renders `<Outlet />` directly so platform pages keep their prior layout behavior.

2. Stabilized AG Grid shared theme:
   - Kept a shared AG Grid theme builder (`createAppGridTheme`) for reuse.
   - Switched grid palette tokens to explicit light/dark values in `styleTokens`.
   - Updated `createAppGridTheme` to choose the palette by color scheme (`isDark`) and pass concrete values into `themeQuartz.withParams`.

3. Added RPC compatibility for naming transitions:
   - `Projects.tsx`: tries `list_projects_overview` first; if missing, falls back to `list_projects_overview_v2`.
   - `supabase/functions/runs/index.ts`: tries `create_run` first; if missing, falls back to `create_run_v2`.

4. Verified after changes:
   - `npx tsc -b` (web) passed.
   - `npx vite build` (web) passed.
   - `deno check supabase/functions/runs/index.ts` passed.
