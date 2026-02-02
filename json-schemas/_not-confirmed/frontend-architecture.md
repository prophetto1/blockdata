# Frontend Architecture — Block-Centric Design

## Core Principle

The block inventory is the stable center. Every use case orbits around the same block view — you're just swapping which annotation layer is visible.

```
┌─────────────────────────────────────────────────────────────┐
│                      App Shell                              │
│  ┌───────────┐  ┌─────────────────────────────────────────┐ │
│  │           │  │           Block Viewer (core)           │ │
│  │  Document │  │  ┌─────────────────────────────────────┐│ │
│  │   List    │  │  │ Block 0: heading                    ││ │
│  │           │  │  │ "Introduction"                      ││ │
│  │  ─────────│  │  ├─────────────────────────────────────┤│ │
│  │           │  │  │ Block 1: paragraph          [panel]→││ │
│  │  Filters  │  │  │ "The court held that..."            ││ │
│  │  & Search │  │  ├─────────────────────────────────────┤│ │
│  │           │  │  │ Block 2: paragraph          [panel]→││ │
│  │           │  │  │ "Justice Stevens dissented..."      ││ │
│  │           │  │  └─────────────────────────────────────┘│ │
│  └───────────┘  └─────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Annotation Panel (swappable)               ││
│  │  Run: strunk_18 (complete)  │  Run: legal_signals_v1   ││
│  │  ─────────────────────────  │  ─────────────────────── ││
│  │  rule_hits: [3, 7]          │  signal: positive        ││
│  │  rewrite: "The court..."    │  cited_cases: [...]      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

### Level 1: App Shell
- Global nav, auth state, document list
- Routes: `/upload`, `/documents`, `/documents/:doc_uid`, `/documents/:doc_uid/runs/:run_id`

### Level 2: Document View (`/documents/:doc_uid`)
- **BlockViewer** (core) — always rendered, displays immutable block inventory
- **AnnotationPanel** (swappable) — shows annotation data for selected run(s)
- **RunSelector** — dropdown/tabs to pick which annotation run(s) to overlay

### Level 3: Block Components
```
BlockViewer
├── BlockList (virtualized for large docs)
│   ├── BlockCard (one per block)
│   │   ├── BlockHeader (block_type, block_index, section_path)
│   │   ├── BlockContent (content_original)
│   │   └── AnnotationSlot (receives overlay from panel)
│   └── ... (N blocks)
└── BlockNavigation (jump to section, search within doc)
```

## Component Specs

### BlockViewer (Core)

**Props:**
```typescript
interface BlockViewerProps {
  doc_uid: string;
  blocks: Block[];           // from GET /documents/:doc_uid/blocks
  selectedBlockUid?: string; // for scroll-to / highlight
  annotationOverlay?: AnnotationOverlay; // injected from panel
}
```

**Responsibilities:**
- Render blocks in reading order (block_index)
- Virtualize for performance (react-window or similar)
- Handle block selection (click → expand/focus)
- Provide slots for annotation data injection

**Does NOT know about:**
- Which schema is active
- Annotation run status
- Export logic

### BlockCard

**Props:**
```typescript
interface BlockCardProps {
  block: Block;
  annotation?: BlockAnnotation; // from overlay, may be null
  isSelected: boolean;
  onSelect: () => void;
}

interface Block {
  block_uid: string;
  block_index: number;
  block_type: string;
  section_path: string[];
  char_span: [number, number];
  content_original: string;
}

interface BlockAnnotation {
  run_id: string;
  schema_ref: string;
  status: 'pending' | 'claimed' | 'complete' | 'failed';
  annotation_jsonb: Record<string, any>;
}
```

**Rendering:**
```
┌─────────────────────────────────────────────┐
│ [37] paragraph · Introduction > Background  │  ← BlockHeader
├─────────────────────────────────────────────┤
│ The court held that the defendant's         │  ← BlockContent
│ actions constituted a clear violation...    │
├─────────────────────────────────────────────┤
│ ┌─ strunk_18 ─────────────────────────────┐ │  ← AnnotationSlot
│ │ rule_hits: [3, 7]                       │ │     (only if overlay active)
│ │ rewrite_candidate: "The court ruled..." │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### AnnotationPanel (Swappable)

**Props:**
```typescript
interface AnnotationPanelProps {
  doc_uid: string;
  runs: AnnotationRun[];       // all runs for this doc
  activeRunIds: string[];      // which run(s) to display
  onRunSelect: (runId: string) => void;
  onRunToggle: (runId: string) => void; // for multi-select comparison
}

interface AnnotationRun {
  run_id: string;
  schema_ref: string;
  status: 'running' | 'complete' | 'failed' | 'cancelled';
  total_blocks: number;
  completed_blocks: number;
  failed_blocks: number;
  started_at: string;
  completed_at?: string;
}
```

**Modes:**
1. **Single run** — one schema's annotations overlaid on blocks
2. **Comparison** — two runs side-by-side for same block (toggle view)
3. **None** — pure immutable view, no annotations

### RunSelector

**UI:**
```
┌─────────────────────────────────────────────┐
│ Annotation Runs                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ● strunk_18        complete   2h ago   │ │  ← selected
│ │ ○ legal_signals    complete   1d ago   │ │
│ │ ○ kg_entities      running    12/400   │ │  ← shows progress
│ └─────────────────────────────────────────┘ │
│ [+ New Run]                                 │
└─────────────────────────────────────────────┘
```

## Data Flow

### Phase 1 (No Annotations)

```
Upload → POST /ingest → poll status → GET /blocks → BlockViewer
                                                         │
                                              (no annotation overlay)
```

### Phase 2 (With Annotations)

```
                          ┌─────────────────────┐
                          │   Supabase Realtime │
                          │   (block_annotations│
                          │    status changes)  │
                          └──────────┬──────────┘
                                     │
User selects run                     ▼
       │              ┌──────────────────────────┐
       ▼              │                          │
GET /runs/:run_id ───►│  AnnotationPanel state   │
                      │  (run metadata + blocks) │
                      └──────────┬───────────────┘
                                 │
                                 ▼
                      ┌──────────────────────────┐
                      │  BlockViewer receives    │
                      │  annotationOverlay prop  │
                      │  (keyed by block_uid)    │
                      └──────────────────────────┘
```

### Overlay Injection Pattern

```typescript
// In DocumentView component
const [activeRunId, setActiveRunId] = useState<string | null>(null);

// Fetch annotation data for active run
const { data: annotations } = useQuery(
  ['annotations', activeRunId],
  () => fetchAnnotations(activeRunId),
  { enabled: !!activeRunId }
);

// Build overlay map: block_uid → annotation
const overlay = useMemo(() => {
  if (!annotations) return null;
  return new Map(annotations.map(a => [a.block_uid, a]));
}, [annotations]);

return (
  <BlockViewer
    blocks={blocks}
    annotationOverlay={overlay}
  />
);
```

## Page Structure

### `/upload` — Upload Page

```
┌─────────────────────────────────────────────┐
│ Upload Document                             │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │          Drop file here                 │ │
│ │     .md .docx .pdf .txt                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Title: [auto-extracted, editable_________]  │
│                                             │
│ Document Type: [md_prose_v1 ▼]              │
│   ○ md_prose_v1 (General prose)             │
│   ○ law_case_v1 (Legal case)                │
│   ○ kb_chunk_v1 (Knowledge base)            │
│                                             │
│ [Upload & Ingest]                           │
└─────────────────────────────────────────────┘
```

**Client-side flow:**
1. File dropped → compute SHA256 in browser
2. Check `GET /documents?source_uid={hash}`
3. If exists → redirect to `/documents/:doc_uid`
4. If new → upload → poll status → redirect on success

### `/documents/:doc_uid` — Document View

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back   "Marbury v. Madison"              [Export ▼]       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Outline     │ │ Block 0: heading                        │ │
│ │ ─────────── │ │ # Marbury v. Madison                    │ │
│ │ > Intro     │ ├─────────────────────────────────────────┤ │
│ │   Background│ │ Block 1: paragraph                      │ │
│ │   Holdings  │ │ The case arose from the political...    │ │
│ │ > Analysis  │ ├─────────────────────────────────────────┤ │
│ │   ...       │ │ Block 2: paragraph                      │ │
│ └─────────────┘ │ Chief Justice Marshall delivered...     │ │
│                 └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Runs: [strunk_18 ✓] [legal_signals ✓] [+ New Run]      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### `/documents/:doc_uid/runs/:run_id` — Run Detail View

Same as document view, but with specific run's annotations overlaid and progress visible if still running.

## State Management

### Recommended: React Query + Zustand

```
┌─────────────────────────────────────────────┐
│              React Query                    │
│  (server state: blocks, runs, annotations)  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              Zustand Store                  │
│  (UI state: selectedBlock, activeRuns,      │
│   panelMode, filters)                       │
└─────────────────────────────────────────────┘
```

**Why not Redux?** Overkill. Most state is server-derived (React Query handles caching, invalidation). Zustand handles the small amount of client-only UI state.

## Real-time Updates (Phase 2)

```typescript
// Subscribe to annotation progress for a run
useEffect(() => {
  const channel = supabase
    .channel(`run:${runId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'block_annotations',
        filter: `run_id=eq.${runId}`,
      },
      (payload) => {
        // Update local state or invalidate React Query cache
        queryClient.invalidateQueries(['annotations', runId]);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [runId]);
```

## Export Options

```
Export ▼
├── JSONL (Phase 1) — immutable blocks only
├── JSONL (with annotations) — requires run selection
├── Markdown — reconstructed from blocks
├── Word (.docx) — via Pandoc (Phase 2+)
└── PDF — via Pandoc (Phase 2+)
```

## Tech Stack (Recommended)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14 (App Router) | File-based routing, RSC for initial load |
| Styling | Tailwind + shadcn/ui | Fast iteration, consistent components |
| State (server) | React Query / TanStack Query | Caching, invalidation, optimistic updates |
| State (client) | Zustand | Minimal, no boilerplate |
| Virtualization | react-window or @tanstack/virtual | Large doc performance |
| Auth | Supabase Auth + `@supabase/ssr` | Integrates with RLS |
| Realtime | Supabase Realtime | Built-in, works with RLS |

## Open Questions for Dev

1. **Virtualization threshold** — At what block count do we switch to virtualized rendering? 100? 500?

2. **Annotation rendering** — Schema fields vary per schema. Render as:
   - Raw JSON (dev mode)
   - Key-value list (generic)
   - Schema-specific component (e.g., `StrunkAnnotation`, `LegalSignalAnnotation`)

3. **Comparison mode** — Side-by-side panels or overlapping badges on same block?

4. **Mobile** — Is mobile a priority for Phase 1? Affects layout decisions.

5. **Offline** — Any offline requirements? (Probably not for Phase 1)
