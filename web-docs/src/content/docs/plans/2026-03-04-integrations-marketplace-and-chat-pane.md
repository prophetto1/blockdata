---
title: 2026-03-04-integrations-marketplace-and-chat-pane
description: "> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task."
---

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Slack/Vercel-style integrations marketplace with provider detail pages, and redesign the AI chat pane to support docked-column and free-drag floating modes with auto page-type detection.

**Architecture:** Two independent workstreams. Workstream A builds the integrations index and provider detail pages, reading from existing `kestra_provider_enrichment` and `integration_catalog_items` tables via a new public edge function. Workstream B refactors the assistant panel from a fixed-position portal into a layout-aware system where workspace pages push content aside for a docked column and browse pages render a draggable floating overlay.

**Tech Stack:** React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, Supabase (Postgres + Edge Functions + Realtime), react-router-dom v6, @tabler/icons-react.

---

## Workstream A: Integrations Marketplace

### Task 1: Public integrations data API

Create a public (authenticated, non-admin) edge function that returns provider-grouped catalog data. The existing `admin-integration-catalog` endpoint requires superuser — we need a read-only public equivalent.

**Files:**
- Create: `supabase/functions/integrations-catalog/index.ts`

**Step 1: Create the edge function**

```ts
// supabase/functions/integrations-catalog/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const url = new URL(req.url);
    const providerSlug = url.searchParams.get("provider");

    // Load provider enrichment (always)
    const { data: providers, error: provErr } = await supabase
      .from("kestra_provider_enrichment")
      .select("plugin_group, provider_name, provider_base_url, provider_docs_url, auth_type, is_internal")
      .order("provider_name");

    if (provErr) throw provErr;

    if (providerSlug) {
      // Single provider: return items for that provider
      const provider = (providers ?? []).find(
        (p: Record<string, unknown>) =>
          slugify(p.provider_name as string) === providerSlug
      );
      if (!provider) {
        return new Response(JSON.stringify({ error: "Provider not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: items, error: itemErr } = await supabase
        .from("integration_catalog_items")
        .select("item_id, plugin_name, plugin_title, plugin_group, categories, task_class, task_title, task_description, enabled")
        .eq("plugin_group", provider.plugin_group)
        .eq("enabled", true)
        .order("task_title");

      if (itemErr) throw itemErr;

      return new Response(JSON.stringify({ provider, items: items ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Index: return providers with item counts
    const { data: counts, error: countErr } = await supabase
      .from("integration_catalog_items")
      .select("plugin_group")
      .eq("enabled", true);

    if (countErr) throw countErr;

    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) {
      const g = (row as Record<string, unknown>).plugin_group as string;
      if (g) countMap[g] = (countMap[g] ?? 0) + 1;
    }

    const enriched = (providers ?? [])
      .filter((p: Record<string, unknown>) => !p.is_internal)
      .map((p: Record<string, unknown>) => ({
        ...p,
        slug: slugify(p.provider_name as string),
        item_count: countMap[p.plugin_group as string] ?? 0,
      }));

    return new Response(JSON.stringify({ providers: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
```

**Step 2: Test locally**

```bash
supabase functions serve integrations-catalog --no-verify-jwt
# In another terminal:
curl -H "Authorization: Bearer <token>" http://localhost:54321/functions/v1/integrations-catalog
```

Expected: JSON with `providers` array, each having `slug`, `provider_name`, `item_count`.

**Step 3: Commit**

```bash
git add supabase/functions/integrations-catalog/
git commit -m "feat: add public integrations-catalog edge function"
```

---

### Task 2: Frontend data hook

**Files:**
- Create: `web/src/pages/integrations/integrations.api.ts`

**Step 1: Write the API layer**

```ts
// web/src/pages/integrations/integrations.api.ts
import { edgeFetch } from '@/lib/edge';

export type ProviderSummary = {
  plugin_group: string;
  provider_name: string;
  provider_base_url: string | null;
  provider_docs_url: string | null;
  auth_type: string | null;
  is_internal: boolean;
  slug: string;
  item_count: number;
};

export type ProviderCatalogItem = {
  item_id: string;
  plugin_name: string;
  plugin_title: string | null;
  plugin_group: string | null;
  categories: string[] | null;
  task_class: string;
  task_title: string | null;
  task_description: string | null;
  enabled: boolean;
};

export type ProviderDetail = {
  plugin_group: string;
  provider_name: string;
  provider_base_url: string | null;
  provider_docs_url: string | null;
  auth_type: string | null;
  is_internal: boolean;
};

export async function loadProviders(): Promise<ProviderSummary[]> {
  const resp = await edgeFetch('integrations-catalog', { method: 'GET' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.providers ?? [];
}

export async function loadProviderDetail(
  slug: string,
): Promise<{ provider: ProviderDetail; items: ProviderCatalogItem[] }> {
  const resp = await edgeFetch(`integrations-catalog?provider=${encodeURIComponent(slug)}`, {
    method: 'GET',
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
```

**Step 2: Commit**

```bash
git add web/src/pages/integrations/
git commit -m "feat: add integrations API layer"
```

---

### Task 3: Integrations index page (card grid)

**Files:**
- Create: `web/src/pages/integrations/IntegrationsIndex.tsx`
- Modify: `web/src/pages/Integrations.tsx` (replace placeholder)

**Step 1: Create the card grid component**

```tsx
// web/src/pages/integrations/IntegrationsIndex.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconPlug, IconSearch } from '@tabler/icons-react';
import { loadProviders, type ProviderSummary } from './integrations.api';

// Map known providers to icon URLs. Extend as needed.
const PROVIDER_ICON_BASE = 'https://cdn.simpleicons.org';

function providerIconUrl(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '');
  return `${PROVIDER_ICON_BASE}/${slug}`;
}

function ProviderCard({ provider }: { provider: ProviderSummary }) {
  return (
    <Link
      to={`/app/integrations/${provider.slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <img
            src={providerIconUrl(provider.provider_name)}
            alt=""
            className="h-6 w-6"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <IconPlug size={20} className="hidden text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {provider.provider_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {provider.item_count} task{provider.item_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function IntegrationsIndex() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProviders()
      .then(setProviders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.provider_name.toLowerCase().includes(q));
  }, [providers, search]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect to third-party services, databases, and APIs.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Search integrations..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {filtered.map((p) => (
            <ProviderCard key={p.plugin_group} provider={p} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">No integrations match your search.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Replace the placeholder page**

In `web/src/pages/Integrations.tsx`, replace the entire file:

```tsx
// web/src/pages/Integrations.tsx
import { IntegrationsIndex } from '@/pages/integrations/IntegrationsIndex';

export default function Integrations() {
  return <IntegrationsIndex />;
}
```

**Step 3: Verify in browser**

Navigate to `http://localhost:5174/app/integrations`. Expect a card grid of ~40+ providers (internal ones filtered out) with search.

**Step 4: Commit**

```bash
git add web/src/pages/integrations/IntegrationsIndex.tsx web/src/pages/Integrations.tsx
git commit -m "feat: integrations index page with provider card grid"
```

---

### Task 4: Provider detail page

**Files:**
- Create: `web/src/pages/integrations/ProviderDetail.tsx`
- Modify: `web/src/router.tsx` (add route)

**Step 1: Create the provider detail component**

```tsx
// web/src/pages/integrations/ProviderDetail.tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
import {
  loadProviderDetail,
  type ProviderCatalogItem,
  type ProviderDetail as ProviderDetailType,
} from './integrations.api';

function TaskRow({ item }: { item: ProviderCatalogItem }) {
  const shortClass = item.task_class.replace(/^io\.kestra\.plugin\./, '');
  return (
    <div className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0">
      <p className="text-sm font-medium text-foreground">{item.task_title ?? shortClass}</p>
      {item.task_description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{item.task_description}</p>
      )}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground/60">{shortClass}</span>
        {item.categories?.map((cat) => (
          <span key={cat} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProviderDetailPage() {
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const [provider, setProvider] = useState<ProviderDetailType | null>(null);
  const [items, setItems] = useState<ProviderCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerSlug) return;
    setLoading(true);
    loadProviderDetail(providerSlug)
      .then((data) => {
        setProvider(data.provider);
        setItems(data.items);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [providerSlug]);

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading...</p>;
  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!provider) return <p className="p-6 text-sm text-muted-foreground">Provider not found.</p>;

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <Link to="/app/integrations" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <IconArrowLeft size={14} />
          Back to Integrations
        </Link>
        <h1 className="text-xl font-bold tracking-tight">{provider.provider_name}</h1>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          {provider.auth_type && (
            <span>Auth: <span className="font-mono">{provider.auth_type}</span></span>
          )}
          <span>{items.length} task{items.length !== 1 ? 's' : ''}</span>
          {provider.provider_docs_url && (
            <a
              href={provider.provider_docs_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Docs <IconExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1">
        {items.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">No tasks available for this provider.</p>
        ) : (
          items.map((item) => <TaskRow key={item.item_id} item={item} />)
        )}
      </div>
    </div>
  );
}
```

**Step 2: Add route**

In `web/src/router.tsx`, add after the existing `/app/integrations` route:

```tsx
import { ProviderDetailPage } from '@/pages/integrations/ProviderDetail';

// Inside AppLayout children, after the existing integrations route:
{ path: '/app/integrations/:providerSlug', element: <ProviderDetailPage /> },
```

**Step 3: Verify**

Navigate to `http://localhost:5174/app/integrations/aws`. Expect provider header with task list.

**Step 4: Commit**

```bash
git add web/src/pages/integrations/ProviderDetail.tsx web/src/router.tsx
git commit -m "feat: provider detail page with task list"
```

---

## Workstream B: AI Chat Pane Redesign

### Task 5: Assistant mode types and page classification

Define the type system for chat pane modes and the logic that maps routes to default modes.

**Files:**
- Create: `web/src/hooks/useAssistantMode.ts`

**Step 1: Write the hook**

```ts
// web/src/hooks/useAssistantMode.ts
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export type AssistantMode = 'docked' | 'floating';

type AssistantPosition = { x: number; y: number };

const WORKSPACE_PATTERNS = [
  /^\/app\/flows\/.+/,     // FlowDetail (not flows list)
  /^\/app\/elt\/.+/,       // Document editor
  /^\/app\/schemas/,       // Schema editor
  /^\/app\/api-editor/,    // API / Scalar editor
  /^\/app\/editor/,        // Generic editor routes
];

const MODE_OVERRIDE_KEY = 'blockdata.shell.assistant_mode_override';
const FLOAT_POS_KEY = 'blockdata.shell.assistant_float_pos';

function classifyRoute(pathname: string): AssistantMode {
  for (const pattern of WORKSPACE_PATTERNS) {
    if (pattern.test(pathname)) return 'docked';
  }
  return 'floating';
}

function readStoredPosition(): AssistantPosition {
  try {
    const raw = localStorage.getItem(FLOAT_POS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return { x: window.innerWidth - 580, y: window.innerHeight - 620 };
}

export function useAssistantMode() {
  const location = useLocation();
  const autoMode = classifyRoute(location.pathname);

  const [override, setOverride] = useState<AssistantMode | null>(() => {
    const raw = localStorage.getItem(MODE_OVERRIDE_KEY);
    return raw === 'docked' || raw === 'floating' ? raw : null;
  });

  const [floatPosition, setFloatPosition] = useState<AssistantPosition>(readStoredPosition);

  const activeMode: AssistantMode = override ?? autoMode;

  const toggleMode = useCallback(() => {
    const next = activeMode === 'docked' ? 'floating' : 'docked';
    setOverride(next);
    localStorage.setItem(MODE_OVERRIDE_KEY, next);
  }, [activeMode]);

  const clearOverride = useCallback(() => {
    setOverride(null);
    localStorage.removeItem(MODE_OVERRIDE_KEY);
  }, []);

  // Persist float position
  useEffect(() => {
    localStorage.setItem(FLOAT_POS_KEY, JSON.stringify(floatPosition));
  }, [floatPosition]);

  // Clear override on route change so auto-classification takes effect
  useEffect(() => {
    setOverride(null);
    localStorage.removeItem(MODE_OVERRIDE_KEY);
  }, [location.pathname]);

  return {
    mode: activeMode,
    autoMode,
    isOverridden: override !== null,
    toggleMode,
    clearOverride,
    floatPosition,
    setFloatPosition,
  };
}
```

**Step 2: Commit**

```bash
git add web/src/hooks/useAssistantMode.ts
git commit -m "feat: add useAssistantMode hook with route-based auto classification"
```

---

### Task 6: Draggable floating container

A lightweight wrapper that makes any child free-draggable by its header.

**Files:**
- Create: `web/src/components/shell/DraggablePanel.tsx`

**Step 1: Write the component**

```tsx
// web/src/components/shell/DraggablePanel.tsx
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

type DraggablePanelProps = {
  x: number;
  y: number;
  onMove: (pos: { x: number; y: number }) => void;
  width?: number;
  height?: string;
  children: ReactNode;
};

export function DraggablePanel({
  x,
  y,
  onMove,
  width = 480,
  height = 'min(70vh, 700px)',
  children,
}: DraggablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only drag from the header area (data-drag-handle)
      const target = e.target as HTMLElement;
      if (!target.closest('[data-drag-handle]')) return;

      dragging.current = true;
      offset.current = { x: e.clientX - x, y: e.clientY - y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [x, y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const nx = Math.max(0, Math.min(window.innerWidth - width, e.clientX - offset.current.x));
      const ny = Math.max(0, e.clientY - offset.current.y);
      onMove({ x: nx, y: ny });
    },
    [onMove, width],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      const clamped = {
        x: Math.max(0, Math.min(window.innerWidth - width, x)),
        y: Math.max(0, y),
      };
      if (clamped.x !== x || clamped.y !== y) onMove(clamped);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [x, y, width, onMove]);

  return (
    <div
      ref={panelRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        zIndex: 340,
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height,
        border: '1px solid rgba(148, 163, 184, 0.28)',
        borderRadius: '12px',
        backgroundColor: '#29313c',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.34)',
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/shell/DraggablePanel.tsx
git commit -m "feat: add DraggablePanel component for free-drag floating"
```

---

### Task 7: Update AssistantDockHost for mode awareness

Add `data-drag-handle` to the header so DraggablePanel can detect it, and add a mode toggle button.

**Files:**
- Modify: `web/src/components/shell/AssistantDockHost.tsx`

**Step 1: Add drag handle and mode toggle prop**

Add `data-drag-handle` attribute to the header div (line 89):

```tsx
// Change the header div to include the drag handle attribute:
<div
  data-drag-handle
  className="flex min-h-[42px] items-center justify-between gap-2 border-b border-slate-400/25 bg-[rgba(46,52,61,0.92)] px-2.5 py-2 backdrop-blur-sm"
  style={{ cursor: mode === 'floating' ? 'grab' : undefined }}
>
```

Add `mode` and `onToggleMode` to the props type:

```tsx
type AssistantDockHostProps = {
  onClose: () => void;
  onDetach?: () => void;
  detached?: boolean;
  onToggleSide?: () => void;
  side?: 'left' | 'right';
  mode?: 'docked' | 'floating';
  onToggleMode?: () => void;
};
```

Add a mode toggle button in the header controls (alongside the existing buttons):

```tsx
{onToggleMode && (
  <button
    type="button"
    className={iconBtn}
    aria-label={mode === 'docked' ? 'Switch to floating' : 'Switch to docked'}
    title={mode === 'docked' ? 'Float' : 'Dock'}
    onClick={onToggleMode}
  >
    <AppIcon icon={IconArrowsLeftRight} size="md" />
  </button>
)}
```

Remove the old `onDetach`/`onToggleSide` buttons — they are replaced by the mode toggle. Keep `onClose`.

**Step 2: Commit**

```bash
git add web/src/components/shell/AssistantDockHost.tsx
git commit -m "feat: add mode awareness and drag handle to AssistantDockHost"
```

---

### Task 8: Refactor AppLayout to use new mode system

Replace the current fixed-position portal rendering with the docked/floating mode system.

**Files:**
- Modify: `web/src/components/layout/AppLayout.tsx`

**Step 1: Import the new hooks and components**

```tsx
import { useAssistantMode } from '@/hooks/useAssistantMode';
import { DraggablePanel } from '@/components/shell/DraggablePanel';
```

**Step 2: Replace assistant state management**

Remove the old assistant state variables:
- `assistantDetached`
- `assistantSide`
- `toggleAssistantDetached`
- `toggleAssistantSide`

Add the new mode hook inside `AppLayout()`:

```tsx
const {
  mode: assistantMode,
  toggleMode: toggleAssistantMode,
  floatPosition,
  setFloatPosition,
} = useAssistantMode();
```

**Step 3: Docked mode — integrate into layout**

For docked mode, the assistant column is part of the main content area. Modify the `shellMainStyle` to account for the docked panel:

```tsx
const assistantDockedWidth = assistantDockEnabled && assistantOpened && assistantMode === 'docked'
  ? 420
  : 0;

const shellMainStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  paddingTop: `${styleTokens.shell.headerHeight}px`,
  paddingInlineStart: `${mainInsetStart}px`,
  paddingInlineEnd: `${assistantDockedWidth}px`,   // <-- push content
  overflow: lockMainScroll ? 'hidden' : 'auto',
  overscrollBehavior: lockMainScroll ? 'none' : 'auto',
  backgroundColor: 'var(--background)',
  transition: 'padding-inline-end 200ms ease',
};
```

**Step 4: Replace the portal rendering**

Remove the two existing portal blocks (docked + detached). Replace with:

```tsx
{/* Docked column */}
{assistantDockEnabled && assistantOpened && assistantMode === 'docked' && canPortal
  ? createPortal(
      <div
        style={{
          position: 'fixed',
          zIndex: 340,
          top: `${styleTokens.shell.headerHeight}px`,
          right: 0,
          bottom: 0,
          width: '420px',
          borderLeft: '1px solid rgba(148, 163, 184, 0.28)',
          backgroundColor: '#29313c',
          overflow: 'hidden',
        }}
      >
        <AssistantDockHost
          onClose={closeAssistant}
          mode="docked"
          onToggleMode={toggleAssistantMode}
        />
      </div>,
      document.body,
    )
  : null}

{/* Floating draggable */}
{assistantDockEnabled && assistantOpened && assistantMode === 'floating' && canPortal
  ? createPortal(
      <DraggablePanel
        x={floatPosition.x}
        y={floatPosition.y}
        onMove={setFloatPosition}
        width={480}
        height="min(70vh, 700px)"
      >
        <AssistantDockHost
          onClose={closeAssistant}
          mode="floating"
          onToggleMode={toggleAssistantMode}
        />
      </DraggablePanel>,
      document.body,
    )
  : null}
```

**Step 5: Verify in browser**

1. Navigate to `/app/flows/:flowId` — assistant should open as docked column on right, content pushes left.
2. Navigate to `/app/integrations` — assistant should open as floating draggable panel.
3. Drag the floating panel around, close and reopen — position persists.
4. Click mode toggle — switches between docked and floating on any page.

**Step 6: Commit**

```bash
git add web/src/components/layout/AppLayout.tsx
git commit -m "feat: refactor assistant to docked-column and floating-drag modes"
```

---

### Task 9: Update style tokens

**Files:**
- Modify: `web/src/lib/styleTokens.ts`

**Step 1: Update the assistantWidth token**

The existing `assistantWidth: 360` should become `assistantDockedWidth: 420` to match the docked column:

```ts
shell: {
  // ... existing
  assistantDockedWidth: 420,
  assistantFloatingWidth: 480,
},
```

Replace hardcoded `420` / `480` values in AppLayout with these tokens.

**Step 2: Commit**

```bash
git add web/src/lib/styleTokens.ts web/src/components/layout/AppLayout.tsx
git commit -m "refactor: extract assistant dimensions to style tokens"
```

---

### Task 10: Clean up old assistant state

**Files:**
- Modify: `web/src/components/layout/AppLayout.tsx`

**Step 1: Remove dead code**

Remove the now-unused localStorage keys and state:
- `blockdata.shell.assistant_detached`
- `blockdata.shell.assistant_side`
- `toggleAssistantDetached`, `toggleAssistantSide` functions
- The `readStoredSide` / `useStoredSide` helpers (if only used for assistant)

**Step 2: Verify no regressions**

Open the app, toggle the assistant on various pages, verify both modes work.

**Step 3: Commit**

```bash
git add web/src/components/layout/AppLayout.tsx
git commit -m "chore: remove legacy assistant detach/side state"
```

---

## Summary of new/modified files

| File | Action | Workstream |
|------|--------|------------|
| `supabase/functions/integrations-catalog/index.ts` | Create | A |
| `web/src/pages/integrations/integrations.api.ts` | Create | A |
| `web/src/pages/integrations/IntegrationsIndex.tsx` | Create | A |
| `web/src/pages/integrations/ProviderDetail.tsx` | Create | A |
| `web/src/pages/Integrations.tsx` | Modify | A |
| `web/src/router.tsx` | Modify | A |
| `web/src/hooks/useAssistantMode.ts` | Create | B |
| `web/src/components/shell/DraggablePanel.tsx` | Create | B |
| `web/src/components/shell/AssistantDockHost.tsx` | Modify | B |
| `web/src/components/layout/AppLayout.tsx` | Modify | B |
| `web/src/lib/styleTokens.ts` | Modify | B |
