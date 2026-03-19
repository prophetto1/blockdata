# Design Layout Captures — Admin Page + Capture Server

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a superuser admin page that lists captured design layouts in a table, lets users trigger new captures via a popup, and runs measurement scripts through a local capture server with automatic Playwright auth via per-domain `storageState` files.

**Architecture:** React page at `/app/superuser/design-layout-captures` with a FlowsList-style table. "Add New" opens a modal that POSTs to a local Node.js capture server. The server manages Playwright browser lifecycle, per-domain `storageState` auth, and runs `measure-layout.mjs` (plus future parallel scripts) programmatically. Captures save to `docs/design-layouts/<slug>/<viewport>/<theme>/`.

**Scope:** This is a **local dev tool only**. The capture server runs on `localhost:4488` alongside the dev server. The admin page is only functional when the capture server is running locally. This page is not designed for deployed/hosted environments — Playwright needs local filesystem access and a headed browser for initial auth.

**Tech Stack:** React 19, React Router 7 (lazy `Component` export), Ark UI (Checkbox, Select, Pagination, Portal, Dialog), Tailwind CSS tokens, Node.js capture server (ESM), Playwright, existing `measure-layout.mjs` script.

---

## Reference Files

These files are the source of truth for patterns used throughout this plan:

| File | Purpose |
|---|---|
| `web/src/pages/FlowsList.tsx` | Table pattern: Ark UI Checkbox, Select, Pagination, ScrollArea, toolbar strip, sortable columns, search, page size selector |
| `web/src/pages/superuser/SuperuserApiEndpoints.tsx` | Superuser page pattern: `export function Component()`, `useShellHeaderTitle`, ScrollArea, filter bar |
| `web/src/pages/superuser/SuperuserDocumentViews.tsx` | Superuser page pattern: lazy export, breadcrumbs, `edgeFetch` |
| `web/src/components/layout/AdminShellLayout.tsx` | Admin shell: resizable primary rail + secondary admin nav, `<Outlet />` |
| `web/src/components/admin/AdminLeftNav.tsx` | Admin nav: `NAV_SECTIONS` array with `{ label, icon, path }` items |
| `web/src/router.tsx` | Route registration: superuser routes use `lazy: () => import(...)` under `SuperuserGuard` |
| `docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs` | Core measurement script. Exports: `measureLayout()`, `deriveCaptureSlug()`, `deriveDefaultOutputDir()`, `deriveAuthStatePath()` |
| `docs/skills/design-1-layouts-spec-with-playwright/scripts/prepare-auth-state.mjs` | CLI auth helper. Exports: `prepareAuthState()` — **blocks on stdin readline**, not usable from HTTP server. Server implements its own auth flow. |
| `web/src/components/ui/scroll-area.tsx` | `ScrollArea` convenience wrapper (vertical), compound parts |
| `web/src/components/ui/button.tsx` | `Button` with variants: default, outline, ghost, destructive, secondary, link. Sizes: default, sm, lg, icon |
| `web/src/components/ui/badge.tsx` | `Badge` with color variants: green, blue, red, yellow, gray, etc. Sizes: default, sm |
| `web/src/components/ui/dialog.tsx` | Styled Dialog: `DialogRoot`, `DialogContent` (wraps Portal+Backdrop+Positioner), `DialogTitle`, `DialogDescription`, `DialogCloseTrigger`, `DialogBody`, `DialogFooter`. See `AgentConfigModal.tsx` for usage pattern. |
| `web/src/components/common/PageHeader.tsx` | Sets shell header title via `useShellHeaderTitle`, renders optional children as toolbar |
| `web/src/lib/icon-contract.ts` | Icon size/stroke tokens. Use `ICON_SIZES`, `ICON_CONTEXT_SIZE`, `ICON_STROKES` |
| `web/tsconfig.app.json` | Strict TS: `noUnusedLocals: true`, `noUnusedParameters: true` — every import and variable must be used |

## Script Contract — Theme Handling

**Critical:** The measurement script's theme model must be understood before building the server or data model.

`measure-layout.mjs` line 803 — `determineThemes(options)`:
- `options.captureBothThemes === true` → returns `["light", "dark"]` (two passes)
- `options.theme === "light"` → returns `["light"]` (one pass)
- `options.theme === "dark"` → returns `["dark"]` (one pass)
- `options.theme === "both"` → **falls through to `["system"]`** — does NOT capture both themes
- Default (no theme) → returns `["system"]` (one pass)

Each pass writes to `<outputDir>/<passTheme>/` (line 786):
```
docs/design-layouts/<slug>/<widthxheight>/light/report.json
docs/design-layouts/<slug>/<widthxheight>/light/viewport.png
docs/design-layouts/<slug>/<widthxheight>/light/full-page.png
docs/design-layouts/<slug>/<widthxheight>/dark/report.json   # only if both themes
docs/design-layouts/<slug>/<widthxheight>/dark/viewport.png
docs/design-layouts/<slug>/<widthxheight>/dark/full-page.png
```

The top-level `report.json` at `<outputDir>/report.json` is a summary: single-pass → the pass report; multi-pass → a wrapper with `passes[]` array.

**Server mapping:** When UI says "Both", server must pass `{ captureBothThemes: true }`, not `{ theme: "both" }`.

## Script Contract — Auth

`prepare-auth-state.mjs` uses `readline.createInterface({ input: stdin })` and calls `rl.question()` (line 63-69). This **blocks on terminal input** — the function will not resolve until the user presses Enter in the terminal. An HTTP server cannot use this function directly.

**Server approach:** The capture server implements its own auth flow:
1. Launch Playwright headed browser, navigate to URL
2. Keep browser/context reference in memory
3. Return `auth-needed` to the UI
4. On `POST /auth-complete`, save `context.storageState()` to disk, close browser
5. Proceed with capture using saved storageState

## Capture Data Model

Each capture = one URL + one viewport. Theme passes are sub-artifacts within the capture directory.

```
docs/design-layouts/
├── .auth/                          # storageState files (gitignored)
│   ├── evidence-studio.json
│   └── localhost.json
├── evidence-studio-settings-organization/
│   └── 1920x1080/
│       ├── report.json             # top-level summary from measureLayout()
│       ├── light/
│       │   ├── report.json         # per-pass report
│       │   ├── viewport.png
│       │   └── full-page.png
│       └── dark/                   # only present if both themes captured
│           ├── report.json
│           ├── viewport.png
│           └── full-page.png
├── captures.json                   # index for the table
└── .gitignore                      # ignores .auth/
```

Index entry in `captures.json`:

```json
[
  {
    "id": "evidence-studio-settings-organization--1920x1080",
    "name": "evidence-studio-settings-organization",
    "url": "https://www.evidence.studio/settings/organization",
    "viewport": "1920x1080",
    "theme": "both",
    "pageType": "settings",
    "capturedAt": "2026-03-19T14:30:00Z",
    "outputDir": "evidence-studio-settings-organization/1920x1080",
    "status": "complete"
  }
]
```

The `theme` field records what was **requested** (`light`, `dark`, or `both`), not which subdirectories exist.

The `id` uses `--` (double dash) between slug and viewport to avoid ambiguity with slugs that contain single dashes.

## Table Columns

| Column | Source | Sortable |
|---|---|---|
| (checkbox) | — | no |
| Name | `captures.json → name` (derived from URL slug) | yes |
| URL | `captures.json → url` | no |
| Viewport | `captures.json → viewport` | yes |
| Theme | `captures.json → theme` | yes |
| Page Type | `captures.json → pageType` | yes |
| Captured | `captures.json → capturedAt` | yes |
| Status | `captures.json → status` | no |
| Actions | execute (re-capture), open folder | no |

---

## Task 1: Types + Capture Index + Gitignore

Create the shared types, the empty captures index, and gitignore for auth state. Do these first because both the page and the server depend on the types and directory structure.

**Files:**
- Create: `docs/design-layouts/captures.json`
- Create: `docs/design-layouts/.gitignore`
- Create: `web/src/pages/superuser/design-captures.types.ts`

**Step 1: Create empty captures index**

Write to `docs/design-layouts/captures.json`:

```json
[]
```

**Step 2: Create gitignore**

Write to `docs/design-layouts/.gitignore`:

```
.auth/
```

**Step 3: Create TypeScript types**

Write to `web/src/pages/superuser/design-captures.types.ts`:

```tsx
export type CaptureStatus = 'pending' | 'auth-needed' | 'capturing' | 'complete' | 'failed';

export type PageType = 'settings' | 'editor' | 'dashboard' | 'workbench' | 'marketing';

export type ThemeRequest = 'light' | 'dark' | 'both';

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
};

export type CaptureRequest = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
  pageType: PageType;
};
```

**Step 4: Commit**

```bash
git add docs/design-layouts/captures.json docs/design-layouts/.gitignore web/src/pages/superuser/design-captures.types.ts
git commit -m "feat: capture data model — types, empty index, gitignore for auth state"
```

---

## Task 2: Table Page — Full Component

Create the page component with all UI: header, toolbar, table, pagination, empty state, loading state, server fetch, and re-capture action. This is a single file that compiles clean under `noUnusedLocals`.

**Files:**
- Create: `web/src/pages/superuser/DesignLayoutCaptures.tsx`

**Step 1: Write the page**

Write to `web/src/pages/superuser/DesignLayoutCaptures.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconCamera,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Checkbox } from '@ark-ui/react/checkbox';
import { Select, createListCollection } from '@ark-ui/react/select';
import { Pagination } from '@ark-ui/react/pagination';
import { Portal } from '@ark-ui/react/portal';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';
import type { CaptureEntry, CaptureRequest, PageType, ThemeRequest } from './design-captures.types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CAPTURE_SERVER = 'http://localhost:4488';

type SortField = 'name' | 'viewport' | 'theme' | 'pageType' | 'capturedAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 25, 50] as const;

const pageSizeCollection = createListCollection({
  items: PAGE_SIZES.map((s) => ({ label: `${s} per page`, value: String(s) })),
});

const PAGE_TYPE_COLORS = {
  settings: 'blue',
  editor: 'violet',
  dashboard: 'teal',
  workbench: 'orange',
  marketing: 'green',
} as const satisfies Record<PageType, string>;

const THEME_BADGE = {
  light: 'default',
  dark: 'dark',
  both: 'gray',
} as const satisfies Record<ThemeRequest, string>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(value: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
}

async function fetchCaptures(): Promise<CaptureEntry[]> {
  try {
    const res = await fetch(`${CAPTURE_SERVER}/captures`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function requestCapture(body: CaptureRequest): Promise<{ id: string; status: string; message?: string }> {
  const res = await fetch(`${CAPTURE_SERVER}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SortIcon({ field, activeField, dir }: { field: SortField; activeField: SortField | null; dir: SortDir }) {
  if (field !== activeField) return <IconArrowsSort size={12} className="text-muted-foreground/50" />;
  return dir === 'asc'
    ? <IconArrowUp size={12} className="text-primary" />
    : <IconArrowDown size={12} className="text-primary" />;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export function Component() {
  useShellHeaderTitle({ title: 'Design Layout Captures', breadcrumbs: ['Superuser', 'Design Layout Captures'] });

  const [rows, setRows] = useState<CaptureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<SortField | null>('capturedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  // ---------- data loading ----------

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchCaptures();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ---------- sort / filter ----------

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = rows
    .filter((row) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return [row.name, row.url, row.viewport, row.theme, row.pageType]
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ---------- re-capture ----------

  const handleReCapture = async (row: CaptureEntry) => {
    const [w, h] = row.viewport.split('x').map(Number);
    try {
      await requestCapture({ url: row.url, width: w, height: h, theme: row.theme, pageType: row.pageType });
      void loadData();
    } catch {
      // TODO: surface error
    }
  };

  // ---------- render ----------

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <label className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
              <HugeiconsIcon icon={Search01Icon} size={utilityIconSize} strokeWidth={utilityIconStroke} className="text-muted-foreground" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.currentTarget.value); setPage(1); }}
              placeholder="Search captures"
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadData()}>
              <IconRefresh size={14} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => { /* TODO: Task 3 — open Add New modal */ }}>
              <IconPlus size={14} />
              Add New
            </Button>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-2">
                  <Checkbox.Root
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onCheckedChange={(details) => {
                      if (details.checked) {
                        setSelected(new Set(paginated.map((r) => r.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                  >
                    <Checkbox.Control className="h-4 w-4 rounded border-input" />
                    <Checkbox.HiddenInput />
                  </Checkbox.Root>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Name <SortIcon field="name" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('viewport')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Viewport <SortIcon field="viewport" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('theme')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Theme <SortIcon field="theme" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('pageType')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Page Type <SortIcon field="pageType" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('capturedAt')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Captured <SortIcon field="capturedAt" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    Loading captures...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No captures yet. Click "Add New" to start.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/60 align-top hover:bg-accent/30',
                      selected.has(row.id) && 'bg-accent/20',
                    )}
                  >
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox.Root
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                      >
                        <Checkbox.Control className="h-4 w-4 rounded border-input" />
                        <Checkbox.HiddenInput />
                      </Checkbox.Root>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-foreground">{row.name}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground max-w-[250px] truncate" title={row.url}>
                      {row.url}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground font-mono">{row.viewport}</td>
                    <td className="px-3 py-3">
                      <Badge variant={THEME_BADGE[row.theme]} size="sm">{row.theme}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={PAGE_TYPE_COLORS[row.pageType]} size="sm">{row.pageType}</Badge>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{formatDate(row.capturedAt)}</td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          row.status === 'complete' ? 'green'
                          : row.status === 'failed' ? 'red'
                          : row.status === 'capturing' ? 'blue'
                          : row.status === 'auth-needed' ? 'yellow'
                          : 'gray'
                        }
                        size="sm"
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Re-capture"
                          title="Re-capture"
                          onClick={() => void handleReCapture(row)}
                        >
                          <IconCamera size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Select.Root
              collection={pageSizeCollection}
              value={[String(pageSize)]}
              onValueChange={(details) => { setPageSize(Number(details.value[0])); setPage(1); }}
              positioning={{ placement: 'top-start', sameWidth: true }}
            >
              <Select.Control>
                <Select.Trigger className="rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <Select.ValueText placeholder="Per page" />
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="rounded-md border border-border bg-popover p-1 text-xs shadow-md">
                    {PAGE_SIZES.map((s) => (
                      <Select.Item key={s} item={String(s)} className="cursor-pointer rounded px-2 py-1 hover:bg-accent">
                        <Select.ItemText>{s} per page</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
            {totalPages > 1 && (
              <Pagination.Root
                count={filtered.length}
                pageSize={pageSize}
                page={page}
                onPageChange={(details) => setPage(details.page)}
                className="flex items-center gap-1"
              >
                <Pagination.PrevTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Prev
                </Pagination.PrevTrigger>
                <span>Page {page} of {totalPages}</span>
                <Pagination.NextTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Next
                </Pagination.NextTrigger>
              </Pagination.Root>
            )}
          </div>
          <span className="font-medium">Total: {filtered.length}</span>
        </div>
      </section>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -20`

Expected: Clean compile. Every import and variable is used.

**Step 3: Commit**

```bash
git add web/src/pages/superuser/DesignLayoutCaptures.tsx
git commit -m "feat: design layout captures table page with server fetch and re-capture"
```

---

## Task 3: Add New Capture Modal

Add the "Add New" popup dialog with the auth flow state machine.

**Files:**
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`

**Step 1: Add Dialog import and auth-complete helper**

Add to imports:

```tsx
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
```

Add after `requestCapture` function at module scope:

```tsx
async function requestAuthComplete(captureId: string): Promise<{ id: string; status: string }> {
  const res = await fetch(`${CAPTURE_SERVER}/auth-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: captureId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
```

**Step 2: Add state and handlers inside `Component()`**

```tsx
const [showAddNew, setShowAddNew] = useState(false);
const [captureForm, setCaptureForm] = useState<CaptureRequest>({
  url: '',
  width: 1920,
  height: 1080,
  theme: 'light',
  pageType: 'settings',
});
const [modalStatus, setModalStatus] = useState<{
  state: 'idle' | 'submitting' | 'auth-needed' | 'capturing' | 'done' | 'error';
  message?: string;
  captureId?: string;
}>({ state: 'idle' });

const handleStartCapture = async () => {
  setModalStatus({ state: 'submitting' });
  try {
    const result = await requestCapture(captureForm);
    if (result.status === 'auth-needed') {
      setModalStatus({
        state: 'auth-needed',
        captureId: result.id,
        message: result.message ?? 'Browser opened. Complete login, then click "Auth Complete".',
      });
    } else if (result.status === 'complete') {
      setModalStatus({ state: 'done', captureId: result.id });
      void loadData();
    } else {
      // capturing in progress — poll or wait
      setModalStatus({ state: 'capturing', captureId: result.id });
      void loadData();
    }
  } catch (err) {
    setModalStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

const handleAuthComplete = async () => {
  if (!modalStatus.captureId) return;
  setModalStatus({ state: 'capturing', captureId: modalStatus.captureId });
  try {
    const result = await requestAuthComplete(modalStatus.captureId);
    if (result.status === 'complete') {
      setModalStatus({ state: 'done', captureId: result.id });
    } else {
      setModalStatus({ state: 'capturing', captureId: result.id });
    }
    void loadData();
  } catch (err) {
    setModalStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
```

**Step 3: Add modal JSX** after `</section>`, before closing `</div>`:

```tsx
<DialogRoot open={showAddNew} onOpenChange={(details) => {
  setShowAddNew(details.open);
  if (!details.open) setModalStatus({ state: 'idle' });
}}>
  <DialogContent className="max-w-lg">
    <DialogCloseTrigger />
    <DialogTitle>New Capture</DialogTitle>
    <DialogDescription>
      Enter a URL and capture settings. The capture server must be running on localhost:4488.
    </DialogDescription>

    <DialogBody>
      <label className="block">
        <span className="text-sm font-medium">URL</span>
        <input
          type="url"
          value={captureForm.url}
          onChange={(e) => setCaptureForm((f) => ({ ...f, url: e.currentTarget.value }))}
          placeholder="https://www.evidence.studio/settings/organization"
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Width</span>
          <input
            type="number"
            value={captureForm.width}
            onChange={(e) => setCaptureForm((f) => ({ ...f, width: Number(e.currentTarget.value) }))}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Height</span>
          <input
            type="number"
            value={captureForm.height}
            onChange={(e) => setCaptureForm((f) => ({ ...f, height: Number(e.currentTarget.value) }))}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Theme</span>
          <select
            value={captureForm.theme}
            onChange={(e) => setCaptureForm((f) => ({ ...f, theme: e.currentTarget.value as ThemeRequest }))}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="both">Both (light + dark)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Page Type</span>
          <select
            value={captureForm.pageType}
            onChange={(e) => setCaptureForm((f) => ({ ...f, pageType: e.currentTarget.value as PageType }))}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="settings">Settings</option>
            <option value="editor">Editor</option>
            <option value="dashboard">Dashboard</option>
            <option value="workbench">Workbench</option>
            <option value="marketing">Marketing</option>
          </select>
        </label>
      </div>

      {/* Status feedback */}
      {modalStatus.state === 'submitting' && (
        <p className="text-sm text-muted-foreground">Starting capture...</p>
      )}
      {modalStatus.state === 'auth-needed' && (
        <div className="flex gap-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
          <span className="text-sm text-yellow-800 dark:text-yellow-300">{modalStatus.message}</span>
        </div>
      )}
      {modalStatus.state === 'capturing' && (
        <div className="flex gap-3 rounded-md border border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
          <span className="text-sm text-blue-800 dark:text-blue-300">Capturing... Playwright is running the measurement scripts.</span>
        </div>
      )}
      {modalStatus.state === 'done' && (
        <div className="flex gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-900/20">
          <span className="text-sm text-emerald-800 dark:text-emerald-300">Capture complete.</span>
        </div>
      )}
      {modalStatus.state === 'error' && (
        <div className="flex gap-3 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
          <span className="text-sm text-red-800 dark:text-red-300">{modalStatus.message}</span>
        </div>
      )}
    </DialogBody>

    <DialogFooter>
      {modalStatus.state !== 'done' && (
        <Button size="sm" variant="outline" onClick={() => setShowAddNew(false)}>Cancel</Button>
      )}
      {modalStatus.state === 'auth-needed' && (
        <Button size="sm" onClick={() => void handleAuthComplete()}>
          Auth Complete
        </Button>
      )}
      {(modalStatus.state === 'idle' || modalStatus.state === 'error') && (
        <Button size="sm" onClick={() => void handleStartCapture()} disabled={!captureForm.url}>
          <IconCamera size={14} />
          Capture
        </Button>
      )}
      {modalStatus.state === 'done' && (
        <Button size="sm" variant="outline" onClick={() => setShowAddNew(false)}>
          Close
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</DialogRoot>
```

**Step 4: Wire the "Add New" button**

Replace the TODO comment with:

```tsx
<Button size="sm" onClick={() => setShowAddNew(true)}>
```

**Step 5: Verify**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -20`

Expected: Clean compile. `requestAuthComplete` (added in Step 1) is called by `handleAuthComplete` (added in Step 2).

**Step 6: Commit**

```bash
git add web/src/pages/superuser/DesignLayoutCaptures.tsx
git commit -m "feat: add new capture modal with auth-needed flow and status feedback"
```

---

## Task 4: Route + Nav Item

Wire the page into the app. Done after the page file exists so lazy import resolves.

**Files:**
- Modify: `web/src/router.tsx:224-233` (superuser children array)
- Modify: `web/src/components/admin/AdminLeftNav.tsx:24-47` (NAV_SECTIONS)

**Step 1: Add lazy route**

In `web/src/router.tsx`, inside the `SuperuserGuard` children array (after `test-integrations` on line 232), add:

```tsx
{ path: 'design-layout-captures', lazy: () => import('@/pages/superuser/DesignLayoutCaptures') },
```

**Step 2: Add nav item**

In `web/src/components/admin/AdminLeftNav.tsx`, add `IconCamera` to the icon imports:

```tsx
import {
  IconServer,
  IconSettings,
  IconClipboardList,
  IconCode,
  IconTestPipe,
  IconFileText,
  IconChevronLeft,
  IconCamera,
  type Icon,
} from '@tabler/icons-react';
```

Add a new "DESIGN" section to `NAV_SECTIONS` after the "SYSTEM" section:

```tsx
{
  label: 'DESIGN',
  items: [
    { label: 'Layout Captures', icon: IconCamera, path: '/app/superuser/design-layout-captures' },
  ],
},
```

**Step 3: Verify**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -20`

Expected: Clean compile. The lazy import resolves to the file created in Task 2.

**Step 4: Commit**

```bash
git add web/src/router.tsx web/src/components/admin/AdminLeftNav.tsx
git commit -m "feat: add route and nav item for design layout captures page"
```

---

## Task 5: Capture Server

Node.js HTTP server that runs alongside the dev server. Manages Playwright lifecycle, per-domain storageState auth, and measurement orchestration.

**Critical differences from `prepare-auth-state.mjs`:** The server cannot use `prepare-auth-state.mjs` because that script blocks on `readline` (stdin). The server implements its own auth flow: launch headed browser → keep context open → save storageState on HTTP signal → close browser.

**Critical: theme mapping:** When the UI sends `theme: "both"`, the server must pass `{ captureBothThemes: "true" }` to `measureLayout()`, not `{ theme: "both" }`. For `"light"` or `"dark"`, pass `{ theme: value }`.

**Note: blocking requests.** Both `POST /capture` and `POST /auth-complete` block until the capture finishes (can be 10-60s for complex pages). The frontend shows "capturing..." optimistically while the fetch hangs. This is acceptable for a single-user dev tool. If the browser's default fetch timeout (~300s) expires on a very slow page, the capture still completes server-side but the frontend loses track — a manual Refresh recovers. Async capture with polling is deferred to Future Tasks.

**Files:**
- Create: `scripts/capture-server.mjs`

**Step 1: Create the server**

Write to `scripts/capture-server.mjs`:

```js
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const skillScriptsDir = path.join(
  repoRoot,
  "docs",
  "skills",
  "design-1-layouts-spec-with-playwright",
  "scripts"
);
const capturesJsonPath = path.join(repoRoot, "docs", "design-layouts", "captures.json");

const PORT = Number(process.env.CAPTURE_SERVER_PORT || "4488");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readCaptures() {
  if (!fs.existsSync(capturesJsonPath)) return [];
  return JSON.parse(fs.readFileSync(capturesJsonPath, "utf8"));
}

function writeCaptures(entries) {
  ensureDir(path.dirname(capturesJsonPath));
  fs.writeFileSync(capturesJsonPath, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function resolvePlaywright() {
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

function updateCaptureStatus(id, status, capturedAt = null) {
  const captures = readCaptures();
  const entry = captures.find((c) => c.id === id);
  if (entry) {
    entry.status = status;
    if (capturedAt) entry.capturedAt = capturedAt;
    writeCaptures(captures);
  }
}

/* ------------------------------------------------------------------ */
/*  Auth sessions — headed browser kept open for manual login          */
/* ------------------------------------------------------------------ */

// Map<captureId, { browser, context, page, storageStatePath, entry }>
const authSessions = new Map();

async function startAuthSession(id, entry, targetUrl, storageStatePath, width, height) {
  const playwright = resolvePlaywright();
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: "load" });

  authSessions.set(id, { browser, context, page, storageStatePath, entry });
  console.log(`[auth] Headed browser opened for ${targetUrl} — waiting for login`);
}

async function completeAuthSession(id) {
  const session = authSessions.get(id);
  if (!session) throw new Error(`No auth session for capture '${id}'`);

  const { browser, context, storageStatePath } = session;

  // Save storageState from the context the user logged into
  ensureDir(path.dirname(storageStatePath));
  await context.storageState({ path: storageStatePath });
  console.log(`[auth] Storage state saved to ${storageStatePath}`);

  await browser.close();
  authSessions.delete(id);
}

/* ------------------------------------------------------------------ */
/*  Capture logic                                                      */
/* ------------------------------------------------------------------ */

async function loadMeasureModule() {
  return import(pathToFileURL(path.join(skillScriptsDir, "measure-layout.mjs")).href);
}

async function startCapture(body) {
  const { url, width = 1920, height = 1080, theme = "light", pageType = "settings" } = body;
  if (!url) throw new Error("Missing required field: url");

  const mod = await loadMeasureModule();
  const slug = mod.deriveCaptureSlug(url);
  const outputDir = mod.deriveDefaultOutputDir({ repoRoot, targetUrl: url, width, height });
  const storageStatePath = mod.deriveAuthStatePath({ repoRoot, targetUrl: url });
  const id = `${slug}--${width}x${height}`;

  const entry = {
    id,
    name: slug,
    url,
    viewport: `${width}x${height}`,
    theme,
    pageType,
    capturedAt: null,
    outputDir: path.relative(path.join(repoRoot, "docs", "design-layouts"), outputDir),
    status: "pending",
  };

  // Upsert captures index
  const captures = readCaptures();
  const existingIdx = captures.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    captures[existingIdx] = { ...captures[existingIdx], ...entry };
  } else {
    captures.push(entry);
  }
  writeCaptures(captures);

  // Check storageState
  const hasAuth = fs.existsSync(storageStatePath);

  if (!hasAuth) {
    updateCaptureStatus(id, "auth-needed");
    await startAuthSession(id, entry, url, storageStatePath, width, height);
    return {
      id,
      status: "auth-needed",
      message: `Headed browser opened for ${new URL(url).hostname}. Log in, then click "Auth Complete".`,
    };
  }

  // Auth exists — run capture
  return runCapture(id, entry, { url, width, height, theme, storageStatePath, outputDir });
}

async function runCapture(id, entry, options) {
  updateCaptureStatus(id, "capturing");
  console.log(`[capture] Starting ${id} → ${options.url} at ${options.width}x${options.height} theme=${options.theme}`);

  try {
    const mod = await loadMeasureModule();

    // Build measureLayout options — translate "both" → captureBothThemes
    const measureOptions = {
      url: options.url,
      width: String(options.width),
      height: String(options.height),
      storageStatePath: options.storageStatePath,
      outputDir: options.outputDir,
    };

    if (options.theme === "both") {
      measureOptions.captureBothThemes = "true";
    } else if (options.theme === "light" || options.theme === "dark") {
      measureOptions.theme = options.theme;
    }
    // else: omit theme → defaults to "system"

    await mod.measureLayout(measureOptions);

    const capturedAt = new Date().toISOString();
    updateCaptureStatus(id, "complete", capturedAt);
    console.log(`[capture] Complete: ${id}`);
    return { id, status: "complete" };
  } catch (err) {
    updateCaptureStatus(id, "failed");
    console.error(`[capture] Failed: ${id}`, err.message);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  HTTP routes                                                        */
/* ------------------------------------------------------------------ */

async function handleRequest(req, res) {
  const { method } = req;
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    // GET /captures — list all
    if (method === "GET" && pathname === "/captures") {
      sendJson(res, 200, readCaptures());
      return;
    }

    // POST /capture — start new capture
    if (method === "POST" && pathname === "/capture") {
      const body = await readBody(req);
      const result = await startCapture(body);
      sendJson(res, 200, result);
      return;
    }

    // POST /auth-complete — user finished login in headed browser
    if (method === "POST" && pathname === "/auth-complete") {
      const body = await readBody(req);
      const { id } = body;

      if (!authSessions.has(id)) {
        sendJson(res, 404, { error: `No active auth session for capture '${id}'` });
        return;
      }

      // Save storageState and close headed browser
      const session = authSessions.get(id);
      await completeAuthSession(id);

      // Now run the actual capture with saved auth
      const entry = session.entry;
      const mod = await loadMeasureModule();
      const [w, h] = entry.viewport.split("x").map(Number);
      const outputDir = mod.deriveDefaultOutputDir({ repoRoot, targetUrl: entry.url, width: w, height: h });

      const result = await runCapture(id, entry, {
        url: entry.url,
        width: w,
        height: h,
        theme: entry.theme,
        storageStatePath: session.storageStatePath,
        outputDir,
      });

      sendJson(res, 200, result);
      return;
    }

    // GET /status/:id — check single capture
    if (method === "GET" && pathname.startsWith("/status/")) {
      const id = decodeURIComponent(pathname.slice("/status/".length));
      const captures = readCaptures();
      const entry = captures.find((c) => c.id === id);
      if (!entry) {
        sendJson(res, 404, { error: "Capture not found" });
        return;
      }
      sendJson(res, 200, entry);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(`[server] Error:`, err.message);
    sendJson(res, 500, { error: err.message });
  }
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\nCapture server running on http://localhost:${PORT}`);
  console.log(`  GET  /captures        — list all captures`);
  console.log(`  POST /capture         — start new { url, width, height, theme, pageType }`);
  console.log(`  POST /auth-complete   — signal login done { id }`);
  console.log(`  GET  /status/:id      — check one capture\n`);
});
```

**Step 2: Test manually**

Run: `node scripts/capture-server.mjs`

Expected: Server starts on port 4488, prints endpoint list.

Run (in another terminal): `curl http://localhost:4488/captures`

Expected: `[]`

**Step 3: Commit**

```bash
git add scripts/capture-server.mjs
git commit -m "feat: capture server with headed-browser auth and theme-aware measurement"
```

---

## Task 6: Package.json Script Entry

**Files:**
- Modify: `package.json` (root)

**Step 1: Add script**

The root `package.json` does NOT have a `"scripts"` section — add one:

```json
"scripts": {
  "capture-server": "node scripts/capture-server.mjs"
},
```

Add it before the `"dependencies"` key.

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add capture-server convenience script"
```

---

## Future Tasks (Not In This Plan)

1. **Parallel measurement scripts** — `measure-typography.mjs`, `measure-colors.mjs`, `measure-spacing.mjs`, `measure-interactions.mjs`. Codex is writing the preliminary versions. When ready, the capture server imports and runs them alongside `measure-layout.mjs` on the same browser context.

2. **Reusable form popup component** — User has a design to provide. When available, extract the modal into a shared component and replace the inline Dialog in Task 3.

3. **Open capture directory button** — Needs a server endpoint (e.g., `GET /open-dir/:id`) that shells out to the OS file manager (`explorer.exe` on Windows, `open` on macOS). Add the endpoint to capture-server.mjs and add the button back to the actions column.

4. **Responsive delta** — Capture server option to auto-run at multiple viewports (1920, 1440, 1024, 768) and diff results.

5. **Screenshot diff** — Compare captures across time for visual regression detection.

6. **Async capture with polling** — `POST /capture` currently blocks until capture completes (10-60s). Future: return immediately with `capturing` status, run capture in background, add SSE or `GET /status/:id` polling from the frontend.
