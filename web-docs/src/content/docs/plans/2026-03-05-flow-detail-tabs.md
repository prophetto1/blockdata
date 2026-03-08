---
title: "Flow Detail Tabs Implementation Plan"
description: "> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task."
---# Flow Detail Tabs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all placeholder flow detail tabs with real components matching Kestra's UI patterns, wired to Supabase queries that return real data (or proper empty states).

**Architecture:** Each tab becomes a dedicated component in `web/src/components/flows/tabs/`. `FlowDetail.tsx` orchestrates tab switching but delegates rendering. A shared `FlowFilterBar` component handles the filter/search toolbar pattern that Kestra reuses across Executions, Logs, Metrics, and Triggers tabs. All data comes from Supabase — no mocks.

**Tech Stack:** React, Tailwind CSS, Supabase client, existing `@/components/ui/tabs` primitives, `@tabler/icons-react`.

**Reference screenshots:** `Screenshots/flows-tab-01-overview.png` through `flows-tab-10-auditlogs.png`

---

## Current State

**Already implemented (keep as-is):**
- **Overview** — stat cards + description + "Recent executions" section
- **Topology** — `FlowCanvas` component (DAG visualization)
- **Edit** — `FlowWorkbench` (YAML editor with sub-tabs)

**Partially implemented (upgrade):**
- **Triggers** — has basic list, needs Kestra-style table layout with columns (Id, Type, Next execution date, Backfill, Enabled toggle)

**Placeholder only (build from scratch):**
- Executions, Revisions, Logs, Metrics, Dependencies, Concurrency, Audit Logs

---

## Shared Component: FlowFilterBar

Kestra uses the same filter toolbar on Executions, Logs, Metrics, and Triggers. Build it once.

**Layout (from screenshots):**
```
[Add filters] [Search ___________] [Pill: filter1 x] [Pill: filter2 x] ... [Refresh data] [Save icon] [Saved filters 0 v] [Settings icon]
[Clear all]
```

**Props:**
```tsx
type FlowFilterBarProps = {
  searchPlaceholder: string;        // "Search executions", "Search logs", etc.
  filters: FilterPill[];            // Active filter pills
  onSearch: (query: string) => void;
  onRemoveFilter: (id: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
};

type FilterPill = {
  id: string;
  label: string;   // "Interval Last 24 hours", "Log Level INFO", "State in any"
  removable: boolean;
};
```

---

### Task 1: Create FlowFilterBar shared component

**Files:**
- Create: `web/src/components/flows/tabs/FlowFilterBar.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react';
import { IconFilter, IconSearch, IconRefresh, IconX, IconBookmark, IconAdjustments } from '@tabler/icons-react';

type FilterPill = {
  id: string;
  label: string;
  removable: boolean;
};

type FlowFilterBarProps = {
  searchPlaceholder: string;
  filters: FilterPill[];
  onSearch: (query: string) => void;
  onRemoveFilter: (id: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
};

export function FlowFilterBar({
  searchPlaceholder,
  filters,
  onSearch,
  onRemoveFilter,
  onClearAll,
  onRefresh,
}: FlowFilterBarProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <IconFilter size={14} />
          Add filters
        </button>

        <div className="relative min-w-[180px] flex-1 max-w-[280px]">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearch(e.target.value);
            }}
            className="w-full py-1.5 pl-8 pr-2 border border-border rounded-md bg-background text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        {filters.map((f) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-foreground"
          >
            {f.label}
            {f.removable && (
              <button type="button" onClick={() => onRemoveFilter(f.id)} className="text-muted-foreground hover:text-foreground">
                <IconX size={12} />
              </button>
            )}
          </span>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <IconRefresh size={14} />
            Refresh data
          </button>
          <button type="button" className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent">
            <IconBookmark size={14} />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <IconBookmark size={14} />
            Saved filters
            <span className="rounded bg-muted px-1 text-[10px]">0</span>
          </button>
          <button type="button" className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent">
            <IconAdjustments size={14} />
          </button>
        </div>
      </div>

      {filters.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add web/src/components/flows/tabs/FlowFilterBar.tsx
git commit -m "feat(flows): add shared FlowFilterBar component"
```

---

### Task 2: Create FlowEmptyState shared component

Kestra shows a consistent empty state across tabs: centered illustration area + title + subtitle.

**Files:**
- Create: `web/src/components/flows/tabs/FlowEmptyState.tsx`

**Step 1: Create the component**

```tsx
type FlowEmptyStateProps = {
  title: string;
  subtitle?: string;
};

export function FlowEmptyState({ title, subtitle }: FlowEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-violet-500/30" />
      </div>
      <h3 className="text-base font-semibold text-foreground text-center">{title}</h3>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">{subtitle}</p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/flows/tabs/FlowEmptyState.tsx
git commit -m "feat(flows): add shared FlowEmptyState component"
```

---

### Task 3: Executions tab

**Reference:** `Screenshots/flows-tab-03-executions.png`

**Layout:** FlowFilterBar + chart area ("Total Executions") + sortable table (Id, Start date, End date, Duration, Namespace, Flow, Labels, State, Triggers, Actions). Empty state: "No Executions Found".

**Files:**
- Create: `web/src/components/flows/tabs/ExecutionsTab.tsx`

**Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FlowFilterBar } from './FlowFilterBar';
import { FlowEmptyState } from './FlowEmptyState';

type Execution = {
  execution_id: string;
  flow_id: string;
  namespace: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  duration_ms: number | null;
  labels: Record<string, string> | null;
  trigger_type: string | null;
};

const DEFAULT_FILTERS = [
  { id: 'interval', label: 'Interval Last 24 hours', removable: true },
  { id: 'state', label: 'State in any', removable: true },
];

const STATE_COLORS: Record<string, string> = {
  SUCCESS: 'text-emerald-500',
  FAILED: 'text-red-500',
  RUNNING: 'text-blue-500',
  WARNING: 'text-amber-500',
  KILLED: 'text-red-400',
  PAUSED: 'text-muted-foreground',
};

function formatDuration(ms: number | null): string {
  if (ms == null) return '--';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(value: string | null): string {
  if (!value) return '--';
  return new Date(value).toLocaleString();
}

export function ExecutionsTab({ flowId }: { flowId: string }) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('flow_executions')
      .select('*')
      .eq('flow_id', flowId)
      .order('start_date', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Table may not exist yet — that's expected
          setExecutions([]);
        } else {
          setExecutions((data ?? []) as Execution[]);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flowId]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search executions"
        filters={filters}
        onSearch={() => {}}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      {/* Chart area */}
      <div className="rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Total Executions</h3>
        <p className="text-xs text-muted-foreground">Executions duration and count per date</p>
        {executions.length === 0 && !loading && (
          <FlowEmptyState
            title="Looks like there's nothing here... yet!"
            subtitle="Adjust your filters, or give it another go!"
          />
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-xs">
          <thead className="border-b border-border bg-muted/30 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Id</th>
              <th className="px-3 py-2 text-left font-medium">Start date</th>
              <th className="px-3 py-2 text-left font-medium">End date</th>
              <th className="px-3 py-2 text-left font-medium">Duration</th>
              <th className="px-3 py-2 text-left font-medium">Namespace</th>
              <th className="px-3 py-2 text-left font-medium">Flow</th>
              <th className="px-3 py-2 text-left font-medium">Labels</th>
              <th className="px-3 py-2 text-left font-medium">State</th>
              <th className="px-3 py-2 text-left font-medium">Triggers</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : executions.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-primary">No Executions Found</td></tr>
            ) : (
              executions.map((e) => (
                <tr key={e.execution_id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2 font-mono text-foreground">{e.execution_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(e.start_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(e.end_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDuration(e.duration_ms)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.namespace}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.flow_id}</td>
                  <td className="px-3 py-2 text-muted-foreground">--</td>
                  <td className={`px-3 py-2 font-medium ${STATE_COLORS[e.state] ?? 'text-muted-foreground'}`}>{e.state}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.trigger_type ?? '--'}</td>
                  <td className="px-3 py-2 text-muted-foreground">--</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add web/src/components/flows/tabs/ExecutionsTab.tsx
git commit -m "feat(flows): add ExecutionsTab component"
```

---

### Task 4: Revisions tab

**Reference:** `Screenshots/flows-tab-05-revisions.png`

**Layout:** Info banner when only 1 revision. When multiple: side-by-side YAML diff. Data comes from `flow_sources` table (already exists with `project_id`, `source`, `revision`, `created_at`).

**Files:**
- Create: `web/src/components/flows/tabs/RevisionsTab.tsx`

**Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';

type FlowRevision = {
  revision: number;
  source: string;
  created_at: string;
};

export function RevisionsTab({ flowId }: { flowId: string }) {
  const [revisions, setRevisions] = useState<FlowRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('flow_sources')
      .select('revision, source, created_at')
      .eq('project_id', flowId)
      .order('revision', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setRevisions([]);
        } else {
          const rows = (data ?? []) as FlowRevision[];
          setRevisions(rows);
          if (rows.length >= 2) {
            setSelectedA(rows[1]!.revision);
            setSelectedB(rows[0]!.revision);
          }
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flowId]);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading...</div>;
  }

  if (revisions.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
        <IconInfoCircle size={18} className="text-blue-500 shrink-0" />
        <span className="text-sm text-blue-700 dark:text-blue-300">Only one revision exists for this flow</span>
      </div>
    );
  }

  const sourceA = revisions.find((r) => r.revision === selectedA)?.source ?? '';
  const sourceB = revisions.find((r) => r.revision === selectedB)?.source ?? '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          From:
          <select
            value={selectedA ?? ''}
            onChange={(e) => setSelectedA(Number(e.target.value))}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {revisions.map((r) => (
              <option key={r.revision} value={r.revision}>r{r.revision} — {new Date(r.created_at).toLocaleDateString()}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          To:
          <select
            value={selectedB ?? ''}
            onChange={(e) => setSelectedB(Number(e.target.value))}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {revisions.map((r) => (
              <option key={r.revision} value={r.revision}>r{r.revision} — {new Date(r.created_at).toLocaleDateString()}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border bg-card overflow-auto max-h-[600px]">
          <div className="sticky top-0 border-b border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Revision {selectedA}
          </div>
          <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap">{sourceA}</pre>
        </div>
        <div className="rounded-md border border-border bg-card overflow-auto max-h-[600px]">
          <div className="sticky top-0 border-b border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Revision {selectedB}
          </div>
          <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap">{sourceB}</pre>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify + commit**

```bash
cd web && npx tsc --noEmit --pretty 2>&1 | head -20
git add web/src/components/flows/tabs/RevisionsTab.tsx
git commit -m "feat(flows): add RevisionsTab with side-by-side source diff"
```

---

### Task 5: Logs tab

**Reference:** `Screenshots/flows-tab-07-logs.png`

**Layout:** FlowFilterBar (default filters: Log Level INFO, Interval Last 24 hours) + empty state. When data exists: log lines with timestamp, level badge, task ID, message.

**Files:**
- Create: `web/src/components/flows/tabs/LogsTab.tsx`

**Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FlowFilterBar } from './FlowFilterBar';
import { FlowEmptyState } from './FlowEmptyState';

type LogEntry = {
  log_id: string;
  timestamp: string;
  level: string;
  task_id: string | null;
  message: string;
};

const LOG_LEVEL_COLORS: Record<string, string> = {
  TRACE: 'bg-gray-500/10 text-gray-400',
  DEBUG: 'bg-gray-500/10 text-gray-400',
  INFO: 'bg-blue-500/10 text-blue-500',
  WARN: 'bg-amber-500/10 text-amber-500',
  ERROR: 'bg-red-500/10 text-red-500',
};

const DEFAULT_FILTERS = [
  { id: 'level', label: 'Log Level INFO', removable: true },
  { id: 'interval', label: 'Interval Last 24 hours', removable: true },
];

export function LogsTab({ flowId }: { flowId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('flow_logs')
      .select('*')
      .eq('flow_id', flowId)
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLogs([]);
        } else {
          setLogs((data ?? []) as LogEntry[]);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flowId]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search logs"
        filters={filters}
        onSearch={() => {}}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading...</div>
      ) : logs.length === 0 ? (
        <FlowEmptyState
          title="No logs found for the selected filters."
          subtitle="Please try adjusting your filters, changing the time range, or check if the flow has executed recently."
        />
      ) : (
        <div className="rounded-md border border-border bg-card overflow-auto max-h-[600px]">
          <table className="min-w-full text-xs font-mono">
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id} className="border-b border-border/30 hover:bg-accent/20">
                  <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="px-2 py-1">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${LOG_LEVEL_COLORS[log.level] ?? 'bg-muted text-muted-foreground'}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">{log.task_id ?? '--'}</td>
                  <td className="px-2 py-1 text-foreground">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify + commit**

```bash
cd web && npx tsc --noEmit --pretty 2>&1 | head -20
git add web/src/components/flows/tabs/LogsTab.tsx
git commit -m "feat(flows): add LogsTab component"
```

---

### Task 6: Metrics tab

**Reference:** `Screenshots/flows-tab-08-metrics.png`

**Layout:** FlowFilterBar + info banner "Please choose a metric and an aggregation". When data exists: chart area + metric selector.

**Files:**
- Create: `web/src/components/flows/tabs/MetricsTab.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { FlowFilterBar } from './FlowFilterBar';

export function MetricsTab({ flowId: _flowId }: { flowId: string }) {
  const [filters, setFilters] = useState<{ id: string; label: string; removable: boolean }[]>([]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search metrics"
        filters={filters}
        onSearch={() => {}}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
        <IconInfoCircle size={18} className="text-blue-500 shrink-0" />
        <span className="text-sm text-blue-700 dark:text-blue-300">Please choose a metric and an aggregation</span>
      </div>
    </div>
  );
}
```

**Step 2: Verify + commit**

```bash
cd web && npx tsc --noEmit --pretty 2>&1 | head -20
git add web/src/components/flows/tabs/MetricsTab.tsx
git commit -m "feat(flows): add MetricsTab component"
```

---

### Task 7: Triggers tab upgrade

**Reference:** `Screenshots/flows-tab-06-triggers.png`

**Layout:** FlowFilterBar + table (Id, Type, Next execution date, Backfill, Enabled toggle) + "Add a trigger" button at bottom. The current implementation has a basic list — replace with table layout.

**Files:**
- Create: `web/src/components/flows/tabs/TriggersTab.tsx`

**Step 1: Create the component**

```tsx
import { useMemo, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { FlowFilterBar } from './FlowFilterBar';
import { FlowEmptyState } from './FlowEmptyState';

type TriggerSummary = {
  id: string;
  type: string;
  nextExecutionDate: string | null;
  disabled: boolean;
};

type TriggersTabProps = {
  triggers: TriggerSummary[];
  onEditFlow: () => void;
};

function triggerTypeLabel(type: string): string {
  const parts = type.split('.');
  return parts[parts.length - 1] ?? type;
}

export function TriggersTab({ triggers, onEditFlow }: TriggersTabProps) {
  const [filters, setFilters] = useState<{ id: string; label: string; removable: boolean }[]>([]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return triggers;
    const q = search.toLowerCase();
    return triggers.filter(
      (t) => t.id.toLowerCase().includes(q) || t.type.toLowerCase().includes(q),
    );
  }, [triggers, search]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search triggers"
        filters={filters}
        onSearch={setSearch}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      {triggers.length > 0 && (
        <div className="overflow-auto rounded-md border border-border bg-card">
          <table className="min-w-full text-xs">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 text-left font-medium">Id</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Next execution date</th>
                <th className="px-3 py-2 text-left font-medium">Backfill</th>
                <th className="px-3 py-2 text-left font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2 text-muted-foreground">&#9660;</td>
                  <td className="px-3 py-2 font-medium text-primary">{t.id}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono">{t.type}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.nextExecutionDate ? new Date(t.nextExecutionDate).toLocaleString() : '--'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">--</td>
                  <td className="px-3 py-2">
                    <span className={t.disabled ? 'text-muted-foreground' : 'text-emerald-500 font-medium'}>
                      {t.disabled ? 'Disabled' : 'Enabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {triggers.length === 0 && (
        <FlowEmptyState
          title="No logs found for the selected filters."
          subtitle="Please try adjusting your filters, changing the time range, or check if the flow has executed recently."
        />
      )}

      <button
        type="button"
        onClick={onEditFlow}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconPlus size={14} />
        Add a trigger
      </button>
    </div>
  );
}
```

**Step 2: Verify + commit**

```bash
cd web && npx tsc --noEmit --pretty 2>&1 | head -20
git add web/src/components/flows/tabs/TriggersTab.tsx
git commit -m "feat(flows): add TriggersTab table-style component"
```

---

### Task 8: Dependencies tab

**Reference:** This tab is grayed out in Kestra (enterprise-ish). Show a simple placeholder indicating it will display flow dependency graphs.

**Files:**
- Create: `web/src/components/flows/tabs/DependenciesTab.tsx`

**Step 1: Create the component**

```tsx
import { FlowEmptyState } from './FlowEmptyState';

export function DependenciesTab() {
  return (
    <FlowEmptyState
      title="No dependencies detected."
      subtitle="Dependencies will appear here when this flow references or is referenced by other flows."
    />
  );
}
```

**Step 2: Verify + commit**

```bash
cd web && npx tsc --noEmit --pretty 2>&1 | head -20
git add web/src/components/flows/tabs/DependenciesTab.tsx
git commit -m "feat(flows): add DependenciesTab component"
```

---

### Task 9: Concurrency tab

**Reference:** `Screenshots/flows-tab-09-concurrency.png`

**Layout:** Empty state with "No limits are set for this Flow." + link to docs.

**Files:**
- Create: `web/src/components/flows/tabs/ConcurrencyTab.tsx`

**Step 1: Create the component**

```tsx
import { FlowEmptyState } from './FlowEmptyState';

export function ConcurrencyTab() {
  return (
    <FlowEmptyState
      title="No limits are set for this Flow."
      subtitle="Configure concurrency limits to control how many executions of this flow can run simultaneously."
    />
  );
}
```

**Step 2: Verify + commit**

```bash
cd web && npx tsc --noEmit --pretty 2>&1 | head -20
git add web/src/components/flows/tabs/ConcurrencyTab.tsx
git commit -m "feat(flows): add ConcurrencyTab component"
```

---

### Task 10: Audit Logs tab

**Reference:** `Screenshots/flows-tab-10-auditlogs.png`

**Layout:** Enterprise badge + "Track Changes with Audit Logs" title + embedded video. This tab is already locked in `FlowDetail.tsx`. Keep it locked but improve the content.

**Files:**
- Create: `web/src/components/flows/tabs/AuditLogsTab.tsx`

**Step 1: Create the component**

```tsx
import { FlowEmptyState } from './FlowEmptyState';

export function AuditLogsTab() {
  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-500">
          Enterprise Edition
        </span>
        <h3 className="text-lg font-semibold text-foreground">Track Changes with Audit Logs</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Audit logs record every activity with robust, immutable records, making it easy to track changes, maintain compliance, and troubleshoot issues.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Verify + commit**

```bash
cd web && npx tsc --noEmit --pretty 2>&1 | head -20
git add web/src/components/flows/tabs/AuditLogsTab.tsx
git commit -m "feat(flows): add AuditLogsTab component"
```

---

### Task 11: Wire all tab components into FlowDetail.tsx

**Files:**
- Modify: `web/src/pages/FlowDetail.tsx`

**Step 1: Add imports at top of file (after existing imports)**

Add these imports after line 7 (`import FlowWorkbench from ...`):

```tsx
import { ExecutionsTab } from '@/components/flows/tabs/ExecutionsTab';
import { RevisionsTab } from '@/components/flows/tabs/RevisionsTab';
import { TriggersTab } from '@/components/flows/tabs/TriggersTab';
import { LogsTab } from '@/components/flows/tabs/LogsTab';
import { MetricsTab } from '@/components/flows/tabs/MetricsTab';
import { DependenciesTab } from '@/components/flows/tabs/DependenciesTab';
import { ConcurrencyTab } from '@/components/flows/tabs/ConcurrencyTab';
import { AuditLogsTab } from '@/components/flows/tabs/AuditLogsTab';
```

**Step 2: Replace tab content rendering**

In the `TabsContent` mapping (around line 346), replace the placeholder blocks. The existing `overview`, `topology`, and `edit` cases stay. Replace:

- `item.value === 'executions'` case → `<ExecutionsTab flowId={flowId} />`
- `item.value === 'revisions'` case → `<RevisionsTab flowId={flowId} />`
- `item.value === 'triggers'` case → `<TriggersTab triggers={flowTriggers.map(t => ({ id: t.id, type: t.type, nextExecutionDate: t.nextExecutionDate, disabled: t.disabled }))} onEditFlow={() => navigate(\`/app/flows/${flowId}/edit\`)} />`
- `item.value === 'logs'` case → `<LogsTab flowId={flowId} />`
- `item.value === 'metrics'` case → `<MetricsTab flowId={flowId} />`
- `item.value === 'dependencies'` case → `<DependenciesTab />`
- `item.value === 'concurrency'` case → `<ConcurrencyTab />`
- `item.value === 'auditlogs'` case → `<AuditLogsTab />`
- Remove the final catch-all `else` placeholder block.

**Step 3: Verify it compiles and runs**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Commit**

```bash
git add web/src/pages/FlowDetail.tsx
git commit -m "feat(flows): wire all tab components into FlowDetail"
```

---

### Task 12: Visual verification

**Step 1:** Run the dev server: `cd web && npm run dev`

**Step 2:** Open a flow detail page and click through each tab, verifying:
- Each tab renders without errors
- Empty states display correctly
- The filter bar appears on Executions, Logs, Metrics, Triggers
- Revisions shows the info banner or side-by-side view
- Dependencies and Concurrency show clean empty states
- Audit Logs shows enterprise badge

**Step 3: Final commit if any fixes needed**
