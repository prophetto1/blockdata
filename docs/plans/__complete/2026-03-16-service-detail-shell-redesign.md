# ServiceDetailPage — Shell & Container Redesign

## Context
The ServiceDetailPage (`web/src/pages/marketplace/ServiceDetailPage.tsx`) currently uses a two-zone layout (stacked sidebar + detail panel) with ad-hoc margins and no outer containment. The goal is to adopt the parse workbench's shell-and-container pattern to create a clean three-column layout.

## Target Layout
```
┌─ outer shell (p-2 → rounded-md border bg-card) ──────────────────────┐
│ ┌─ Service Info ─┐ ┌─ Functions List ─┐ ┌─ Function Detail ────────┐ │
│ │ Back + Name    │ │ Count header     │ │ FunctionReferenceHeader  │ │
│ │ Type pill      │ │ Search input     │ │                          │ │
│ │ Base URL       │ │ Type filter      │ │ FunctionReferenceBody    │ │
│ │ Health         │ │ ─────────────    │ │ (scrollable)             │ │
│ │ Description    │ │ fn item          │ │                          │ │
│ │ Config ▸      │ │ fn item (active) │ │                          │ │
│ │ Auth Config ▸ │ │ fn item          │ │                          │ │
│ │ (scrollable)   │ │ (scrollable)     │ │                          │ │
│ └────────────────┘ └──────────────────┘ └──────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

## Approach
Reuse the parse container pattern directly — no new abstractions needed.

### Step 1: Outer Shell Wrapper
Replace the bare `flex h-full flex-col` with the parse shell pattern:
```tsx
<div className="h-full w-full min-h-0 p-2">
  <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
    {/* three-column content */}
  </div>
</div>
```
`PageHeader` stays (it just calls `useShellHeaderTitle`).

### Step 2: Three-Column Layout
Replace the current `<aside>` + right panel with a horizontal flex row:
```tsx
<div className="flex min-h-0 flex-1">
  {/* Column 1: Service Info */}
  {/* Column 2: Functions List */}
  {/* Column 3: Function Detail */}
</div>
```

### Step 3: Each Column as a Container
Each column follows the parse column pattern:
```tsx
<div className="h-full min-h-0 p-1">
  <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
    {/* Header chrome */}
    <div className="grid min-h-10 grid-cols-[1fr_auto] items-center border-b border-border bg-card px-2">
      <span className="truncate text-sm font-semibold text-foreground">Title</span>
    </div>
    {/* Scrollable content */}
    <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="min-w-0 p-3">
      {/* content */}
    </ScrollArea>
  </div>
</div>
```

### Step 4: Column Widths
- Service Info: ~22% (narrow, mostly metadata)
- Functions List: ~24% (search + list)
- Function Detail: ~54% (needs the most space for params, schema, examples)

Use flex basis or percentage widths, not fixed pixel widths.

### Step 5: Migrate Content Into Columns

**Column 1 (Service Info):**
- Header chrome: back button + service name + type pill
- Content: base URL, health, description, collapsible config/auth config sections
- Remove the fixed `h-[20rem]` constraint — let it fill the column naturally

**Column 2 (Functions List):**
- Header chrome: "Functions (N)" label
- Content: search input, type dropdown, scrollable function button list
- Remove the `p-3` wrapper padding — container handles it

**Column 3 (Function Detail):**
- Header chrome: `FunctionReferenceHeader` (already exists)
- Content: `FunctionReferenceBody` in ScrollArea
- Remove `max-w-[50%]` and `rounded-xl` — container handles sizing and border radius

### Step 6: Cleanup
- Remove all ad-hoc margins (`ml-3 mr-0 mt-3 mb-3 mt-2`)
- Replace `rounded-xl` with `rounded-md` (consistent with parse)
- Remove the stacked sidebar `<aside>` structure entirely
- Loading/error states render inside the shell

## Files to Modify
- `web/src/pages/marketplace/ServiceDetailPage.tsx` — the only file that changes

## Verification
1. Navigate to `/app/marketplace/services/{any-service-id}`
2. Confirm three-column layout with shell containment
3. Verify scrolling works independently in each column
4. Test function selection still highlights in list and shows detail
5. Test collapsible config/auth sections in service info column
6. Check responsive behavior at narrow widths
