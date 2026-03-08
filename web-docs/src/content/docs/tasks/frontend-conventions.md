---
title: "Frontend Conventions Reference"
description: "All new pages and components must follow these established patterns. This is a quick reference for implementation."
---# Frontend Conventions Reference

All new pages and components must follow these established patterns. This is a quick reference for implementation.

---

## Data Fetching

**Edge functions** (for backend APIs):
```tsx
import { edgeJson } from '@/lib/edge';
const data = await edgeJson('flows/default/my-flow');
```
- Auto-handles JWT refresh on 401
- Sets Authorization header automatically
- Use for all flow CRUD, execution queries, log queries

**Supabase direct** (for table queries):
```tsx
import { supabase } from '@/lib/supabase';
const { data, error } = await supabase
  .from('flow_executions')
  .select('*')
  .eq('flow_id', flowId)
  .order('start_date', { ascending: false })
  .range(offset, offset + limit - 1);
```

---

## Hook Pattern

All data hooks follow this structure:
```tsx
export function useFlowExecutions(flowId: string | null) {
  const [data, setData] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!flowId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await edgeJson(`flow-executions?flow_id=${flowId}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}
```

---

## Component Patterns

**Use CVA for variants:**
```tsx
import { cva } from 'class-variance-authority';
const badgeVariants = cva('inline-flex items-center rounded-full', {
  variants: {
    variant: { success: 'bg-green-100 text-green-800', ... }
  }
});
```

**Use cn() for className merging:**
```tsx
import { cn } from '@/lib/utils';
<div className={cn('base-class', isActive && 'active-class', className)} />
```

**Use existing UI primitives from `@/components/ui/`:**
- Button (variants: default, destructive, outline, secondary, ghost, link)
- Badge (variants: default, secondary, destructive, outline, blue, green, yellow, red, gray)
- Tabs (Ark UI — supports lazy mount/unmount)
- Dialog, Sheet, Switch, Menu, Separator, Tooltip, ScrollArea, Skeleton
- AppIcon (semantic sizing: xs/sm/md/lg/xl/xxl, tone: current/default/muted/accent/success/warning/danger)
- ToolbarButton (for toolbar strips)

---

## Design Tokens

**Colors** — use CSS custom properties, not hardcoded values:
```tsx
// Correct:
className="bg-background text-foreground border-border"
className="bg-primary text-primary-foreground"
className="text-muted-foreground"

// Wrong:
className="bg-white text-gray-900"
style={{ color: '#7C3AED' }}
```

**Icons** — use AppIcon with context tokens:
```tsx
import { AppIcon } from '@/components/ui/app-icon';
import { IconPlayerPlay } from '@tabler/icons-react';
<AppIcon icon={IconPlayerPlay} context="content" tone="accent" />
```
- Icon libraries: @tabler/icons-react (primary), hugeicons (secondary, migrating away)
- Never use inline SVGs

**Fonts** — use font tokens:
```tsx
// Headings: font-sans (Inter)
// Code/data: font-mono (JetBrains Mono)
// Size scale: text-2xs, text-xs, text-sm, text-base, text-lg, text-xl
```

**Layout tokens** from `@/lib/styleTokens.ts`:
- headerHeight: 72px
- navbarWidth: 224px
- navbarCompactWidth: 60px
- assistantWidth: 360px

---

## Page Structure

```tsx
// 1. Imports
import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { edgeJson } from '@/lib/edge';

// 2. Local types
interface FlowExecution { ... }

// 3. Component
export default function ExecutionsPage() {
  // Route params
  const { flowId } = useParams();

  // Data hooks
  const { data, loading, error, refetch } = useFlowExecutions(flowId);

  // Loading state
  if (loading) return <Skeleton />;

  // Error state
  if (error) return <ErrorAlert message={error} />;

  // Empty state
  if (!data.length) return <FlowEmptyState title="..." subtitle="..." />;

  // Render
  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      {/* Data table or chart */}
      {/* Pagination */}
    </div>
  );
}
```

---

## State Badge Mapping

Match Kestra's execution state colors using our Badge variants:

| State | Badge Variant | Color |
|---|---|---|
| SUCCESS | `green` | Green |
| FAILED | `red` | Red |
| RUNNING | `blue` | Blue |
| WARNING | `yellow` | Yellow |
| KILLED | `red` | Red |
| CANCELLED | `gray` | Gray |
| PAUSED | `gray` | Gray |
| QUEUED | `blue` | Blue |
| CREATED | `gray` | Gray |
| RETRYING | `yellow` | Yellow |

---

## Empty State Pattern

Use the shared FlowEmptyState component:
```tsx
import { FlowEmptyState } from '@/components/flows/tabs/FlowEmptyState';
<FlowEmptyState
  title="No Executions Found"
  subtitle="Execute a flow to see results here."
/>
```

---

## Filter Bar Pattern

Use the shared FlowFilterBar:
```tsx
import { FlowFilterBar } from '@/components/flows/tabs/FlowFilterBar';
<FlowFilterBar
  onSearch={handleSearch}
  onRefresh={handleRefresh}
  placeholder="Search executions..."
/>
```

---

## File Organization

| Type | Location | Naming |
|---|---|---|
| Pages | `web/src/pages/` | PascalCase (e.g., `Executions.tsx`) |
| Tab components | `web/src/components/flows/tabs/` | PascalCase + Tab suffix (e.g., `MetricsTab.tsx`) |
| Hooks | `web/src/hooks/` | camelCase + use prefix (e.g., `useFlowExecutions.ts`) |
| Shared UI | `web/src/components/ui/` | kebab-case (e.g., `badge.tsx`) |
| Feature components | `web/src/components/{feature}/` | PascalCase |
| Utilities | `web/src/lib/` | camelCase (e.g., `edge.ts`) |
| Routes | `web/src/router.tsx` | Single file, all routes |

---

## Key Files to Reference

| File | Purpose |
|---|---|
| `web/src/lib/edge.ts` | Edge function HTTP client |
| `web/src/lib/supabase.ts` | Supabase client singleton |
| `web/src/lib/color-contract.ts` | Color design tokens |
| `web/src/lib/icon-contract.ts` | Icon sizing and tone |
| `web/src/lib/font-contract.ts` | Typography scale |
| `web/src/lib/toolbar-contract.ts` | Toolbar button spec |
| `web/src/lib/styleTokens.ts` | Layout and shell tokens |
| `web/src/components/ui/button.tsx` | CVA component example |
| `web/src/components/ui/badge.tsx` | Badge with variants |
| `web/src/components/flows/tabs/FlowFilterBar.tsx` | Reusable filter toolbar |
| `web/src/components/flows/tabs/FlowEmptyState.tsx` | Reusable empty state |
| `web/src/pages/FlowDetail.tsx` | Complex page example with tabs |
| `web/src/components/flows/FlowWorkbench.tsx` | Complex component example |
