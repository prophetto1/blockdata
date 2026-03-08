# Service Function Reference Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the raw-JSON-only accordion in ServiceDetailPanel with structured API reference sections per function, plus service-level context at the top, so an admin can wire any API endpoint without leaving the page.

**Architecture:** The service header gains base URL and auth/config display (registered once, not per function). Each function accordion expands to show structured sections — Endpoint, Description, Parameters table, Result Schema, Request Example, Response Example, Auth, Tags — with placeholders for empty sections. The existing Monaco JSON editor moves behind an "Edit JSON" toggle at the bottom of the expansion. No new DB columns; all data comes from existing `ServiceRow` and `ServiceFunctionRow` fields.

**Tech Stack:** React, Tailwind CSS, Ark UI Switch, Monaco Editor (@monaco-editor/react), Tabler Icons

---

## Current State

**ServiceDetailPanel.tsx** (425 lines) has:
- Service header: name, type badge, health badge, updated timestamp, enabled toggle
- Function list: chevron accordion cards
- Collapsed: function_name, type, label, method, entrypoint, enabled toggle, params summary
- Expanded: toolbar (Edit/View/Save/Copy) + Monaco JSON editor showing all mutable fields

**Problem:** Accordion expansion shows only raw JSON. Missing: composed endpoint URL, readable parameters table, result schema display, request/response example placeholders, service-level base URL and auth context.

## Data Available (no new columns needed)

**Service-level (shown once):**
| Field | Source | Notes |
|-------|--------|-------|
| Base URL | `service.base_url` | e.g. `http://localhost:8000` |
| Auth | `service.config.auth_type` | Convention: services store auth config in `config` JSONB. Placeholder if absent. |
| Config | `service.config` | Full JSONB, collapsible |

**Per-function (each accordion):**
| Section | Source | Fallback |
|---------|--------|----------|
| Endpoint | `{service.base_url}{fn.entrypoint}` | Always present |
| Method | `fn.http_method` | Always present |
| Description | `fn.description` | Placeholder: "No description" |
| Parameters | `fn.parameter_schema` (ParamDef[]) | "No parameters" |
| Result Schema | `fn.result_schema` | Placeholder: "No result schema configured" |
| Request Example | Not in DB | Placeholder: "No request example configured" |
| Response Example | Not in DB | Placeholder: "No response example configured" |
| Auth | Inherited from service | Placeholder: "Inherits from service" |
| Tags | `fn.tags` | Empty |

---

## Task 1: Enrich service header with base URL and config

**Files:**
- Modify: `web/src/pages/settings/ServiceDetailPanel.tsx:148-195`

**Step 1: Add base URL and config to service header**

Below the existing type/health/timestamp row, add:

```tsx
{/* Base URL */}
<div className="mt-3 flex items-center gap-2 text-xs">
  <span className="text-muted-foreground">Base URL</span>
  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
    {service.base_url}
  </code>
  <button onClick={copyBaseUrl} className="...">
    <IconClipboard size={12} />
  </button>
</div>

{/* Authentication */}
<div className="mt-2 flex items-center gap-2 text-xs">
  <span className="text-muted-foreground">Authentication</span>
  {authType ? (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{authType}</span>
  ) : (
    <span className="italic text-muted-foreground/50">Not configured</span>
  )}
</div>

{/* Service Config (collapsible) */}
{service.config && Object.keys(service.config).length > 0 && (
  <details className="mt-2">
    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
      Service Config ({Object.keys(service.config).length} keys)
    </summary>
    <pre className="mt-1 rounded bg-muted p-2 text-xs">{JSON.stringify(service.config, null, 2)}</pre>
  </details>
)}
```

Derive `authType` from `service.config`:
```tsx
const authType = service.config
  ? (service.config.auth_type as string) ?? (service.config.auth as string) ?? null
  : null;
```

**Step 2: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: clean

---

## Task 2: Build `FunctionReferenceCard` sub-component for structured sections

**Files:**
- Create: `web/src/pages/settings/FunctionReferenceCard.tsx`

This component renders the structured reference sections for one function. Extracted to keep ServiceDetailPanel manageable.

**Step 1: Create the component**

```tsx
// FunctionReferenceCard.tsx
import { IconClipboard } from '@tabler/icons-react';
import type { ParamDef, ServiceFunctionRow } from './services-panel.types';

type Props = {
  fn: ServiceFunctionRow;
  baseUrl: string;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 first:mt-0">
      {title}
    </h4>
  );
}

function Placeholder({ text }: { text: string }) {
  return <p className="text-xs italic text-muted-foreground/40">{text}</p>;
}

export function FunctionReferenceCard({ fn, baseUrl }: Props) {
  const endpointUrl = `${baseUrl.replace(/\/+$/, '')}${fn.entrypoint}`;
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];

  return (
    <div className="space-y-0">
      {/* Endpoint */}
      <SectionHeader title="Endpoint" />
      <div className="flex items-center gap-2">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {fn.http_method}
        </span>
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
          {endpointUrl}
        </code>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(endpointUrl)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          title="Copy endpoint"
        >
          <IconClipboard size={12} />
        </button>
      </div>

      {/* Description */}
      <SectionHeader title="Description" />
      {fn.description ? (
        <p className="text-xs text-foreground/80">{fn.description}</p>
      ) : (
        <Placeholder text="No description configured" />
      )}

      {/* Parameters */}
      <SectionHeader title="Parameters" />
      {params.length === 0 ? (
        <Placeholder text="No parameters" />
      ) : (
        <div className="overflow-auto rounded border border-border/50">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Name</th>
                <th className="px-2 py-1 text-left font-medium">Type</th>
                <th className="px-2 py-1 text-left font-medium">Req</th>
                <th className="px-2 py-1 text-left font-medium">Default</th>
                <th className="px-2 py-1 text-left font-medium">Values</th>
                <th className="px-2 py-1 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p: ParamDef) => (
                <tr key={p.name} className="border-t border-border/30">
                  <td className="px-2 py-1 font-mono font-medium text-foreground">{p.name}</td>
                  <td className="px-2 py-1 text-muted-foreground">{p.type}</td>
                  <td className="px-2 py-1">{p.required ? '✓' : '—'}</td>
                  <td className="px-2 py-1 font-mono text-muted-foreground/70">
                    {p.default !== undefined ? String(p.default) : '—'}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground/70">
                    {p.values ? p.values.join(' | ') : '—'}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {p.description ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Result Schema */}
      <SectionHeader title="Result Schema" />
      {fn.result_schema && Object.keys(fn.result_schema).length > 0 ? (
        <pre className="overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(fn.result_schema, null, 2)}
        </pre>
      ) : (
        <Placeholder text="No result schema configured" />
      )}

      {/* Request Example */}
      <SectionHeader title="Request Example" />
      <Placeholder text="No request example configured" />

      {/* Response Example */}
      <SectionHeader title="Response Example" />
      <Placeholder text="No response example configured" />

      {/* Authentication */}
      <SectionHeader title="Authentication" />
      <Placeholder text="Inherits from service" />

      {/* Tags */}
      <SectionHeader title="Tags" />
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      ) : (
        <Placeholder text="No tags" />
      )}
    </div>
  );
}
```

**Step 2: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: clean

---

## Task 3: Integrate FunctionReferenceCard into accordion expansion

**Files:**
- Modify: `web/src/pages/settings/ServiceDetailPanel.tsx:307-415`

**Step 1: Import FunctionReferenceCard**

Add to imports:
```tsx
import { FunctionReferenceCard } from './FunctionReferenceCard';
```

**Step 2: Restructure the expanded content**

Replace the current expansion block (lines 308-414) — currently just toolbar + Monaco — with:

1. **Structured reference** (FunctionReferenceCard) — always visible when expanded
2. **Divider**
3. **"Edit JSON" toggle button** — opens/closes the Monaco editor below
4. **Monaco editor** — only visible when editingId matches (same as current, just moved below the reference)

The expanded block becomes:

```tsx
{isExpanded && (
  <div className="px-3 pb-3">
    {/* Structured reference sections */}
    <FunctionReferenceCard fn={fn} baseUrl={service.base_url} />

    {/* Divider + JSON editor toggle */}
    <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3">
      {isAdmin && (
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
            isEditing
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
          onClick={() => { /* toggle edit */ }}
        >
          <IconCode size={13} /> {isEditing ? 'Close Editor' : 'Edit JSON'}
        </button>
      )}
      {isEditing && (
        <button onClick={() => handleSave(fn)} className="...">
          <IconDeviceFloppy size={13} /> Save
        </button>
      )}
      <button onClick={handleCopy} className="...">
        <IconClipboard size={13} /> Copy
      </button>
    </div>

    {/* Monaco (only when editing) */}
    {isEditing && (
      <>
        {jsonError && <div className="...error...">{jsonError}</div>}
        <div className="mt-2 overflow-hidden rounded-md border border-border/70 bg-background">
          <MonacoEditor ... />
        </div>
      </>
    )}
  </div>
)}
```

**Key change:** The Monaco editor is no longer the primary view. It appears only when "Edit JSON" is clicked. The structured FunctionReferenceCard is always visible.

**Step 3: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: clean

**Step 4: Commit**

```bash
git add web/src/pages/settings/FunctionReferenceCard.tsx web/src/pages/settings/ServiceDetailPanel.tsx
git commit -m "feat(services): structured API reference card per function with section placeholders"
```

---

## Task 4: Visual verification

**Step 1: Run dev server**

Run: `cd web && npm run dev`

**Step 2: Navigate to admin services**

Go to `/app/settings/admin/services` → select load-runner → expand filesystem function

**Step 3: Verify sections visible**

Expected: Endpoint (POST http://localhost:8000/dlt/run), Description, Parameters table (path, file_glob, format, table_name, write_disposition + more), Result Schema, Request Example (placeholder), Response Example (placeholder), Authentication (placeholder), Tags

**Step 4: Verify Edit JSON still works**

Click "Edit JSON" → Monaco opens below → edit → Save → data persists

**Step 5: Verify service header**

Base URL visible at top. Auth shows "Not configured" or value from config. Service Config collapsible if present.

---

## Summary of Changes

| File | Action | Lines |
|------|--------|-------|
| `ServiceDetailPanel.tsx` | Modify | Enrich header + restructure accordion |
| `FunctionReferenceCard.tsx` | Create | Structured sections sub-component |

**No DB changes.** No new columns. No backend changes. All data from existing fields. Placeholder sections mark where future data will go (request/response examples, per-function auth override).
