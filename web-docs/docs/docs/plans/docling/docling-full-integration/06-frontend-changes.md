# Frontend Changes

**Stack:** React + Mantine UI + AG Grid + Supabase JS SDK
**Key files:** `web/src/components/blocks/BlockViewerGrid.tsx`, `web/src/pages/ProjectDetail.tsx`, `web/src/lib/tables.ts`

---

## 1. Block Viewer Grid — New Columns

### Current columns displayed

The grid shows: `block_index`, `block_type` (badge), `block_content`, plus dynamically generated overlay columns from the schema run.

### New optional columns (user-toggleable)

| Column | DB source | Cell renderer | Filter | Sort | Default visible |
|---|---|---|---|---|---|
| Page | `blocks.page_no` | Plain integer | Number filter | Yes | YES (for PDF docs) |
| Native Type | `blocks.raw_element_type` | Badge (smaller, muted color) | Set filter | Yes | NO |
| Group | `blocks.raw_group_type` | Badge (outline style) | Set filter | Yes | NO |
| Coordinates | `blocks.coordinates_json` | Tooltip on hover showing bbox | No | No | NO |

### Implementation in `BlockViewerGrid.tsx`

#### a. Update the data query

Current `useBlocks` hook fetches:
```
blocks: block_uid, conv_uid, block_index, block_type, block_locator, block_content
```

Update to also fetch:
```
blocks: block_uid, conv_uid, block_index, block_type, block_locator, block_content,
        page_no, raw_element_type, raw_group_type, coordinates_json, parser_metadata_json
```

#### b. Add column definitions

```typescript
// Page number column — only show for paginated documents
const pageColDef: ColDef = {
  field: 'page_no',
  headerName: 'Page',
  width: 80,
  filter: 'agNumberColumnFilter',
  sortable: true,
  hide: !isPaginated, // determined from conversion_parsing.parser_pipeline_family
  cellRenderer: (params: ICellRendererParams) => {
    if (params.value == null) return '';
    return params.value;
  },
};

// Native element type column
const rawElementTypeColDef: ColDef = {
  field: 'raw_element_type',
  headerName: 'Native Type',
  width: 140,
  filter: 'agSetColumnFilter',
  sortable: true,
  hide: true, // hidden by default, user can toggle
  cellRenderer: (params: ICellRendererParams) => {
    if (!params.value) return '';
    return (
      <Badge size="xs" variant="light" color="gray">
        {params.value}
      </Badge>
    );
  },
};

// Group type column
const rawGroupTypeColDef: ColDef = {
  field: 'raw_group_type',
  headerName: 'Group',
  width: 120,
  filter: 'agSetColumnFilter',
  sortable: true,
  hide: true,
  cellRenderer: (params: ICellRendererParams) => {
    if (!params.value) return '';
    return (
      <Badge size="xs" variant="outline" color="dimmed">
        {params.value}
      </Badge>
    );
  },
};

// Coordinates column (tooltip only)
const coordinatesColDef: ColDef = {
  field: 'coordinates_json',
  headerName: 'Coords',
  width: 80,
  sortable: false,
  hide: true,
  cellRenderer: (params: ICellRendererParams) => {
    if (!params.value) return '';
    const bbox = params.value;
    return (
      <Tooltip
        label={`l:${bbox.l?.toFixed(1)} t:${bbox.t?.toFixed(1)} r:${bbox.r?.toFixed(1)} b:${bbox.b?.toFixed(1)}`}
        position="left"
      >
        <Text size="xs" c="dimmed">bbox</Text>
      </Tooltip>
    );
  },
};
```

#### c. Insert columns into colDefs array

Insert after the `block_type` column and before `block_content`:

```typescript
const columnDefs = useMemo<(ColDef | ColGroupDef)[]>(() => [
  // ... existing block_index, block_type columns ...
  pageColDef,           // NEW
  rawElementTypeColDef, // NEW
  rawGroupTypeColDef,   // NEW
  coordinatesColDef,    // NEW
  // ... existing block_content column ...
  // ... dynamically generated overlay columns ...
], [/* deps */]);
```

#### d. Determine if document is paginated

The `page_no` column should auto-show for paginated formats (PDF, PPTX, XLSX, image) and auto-hide for non-paginated. This can be determined from:

1. `conversion_parsing.parser_pipeline_family` — if `"StandardPdfPipeline"`, show page column
2. OR `source_documents.source_type` — if in `["pdf", "pptx", "xlsx", "image", "mets_gbs"]`, show page column
3. OR detect at runtime: if any block has `page_no != null`, show the column

Option 3 is simplest:

```typescript
const isPaginated = useMemo(
  () => blocks.some(b => b.page_no != null),
  [blocks]
);
```

#### e. Column toggle menu

The existing column toggle menu (if present) should include the new columns. If using AG Grid's built-in column menu, these are already toggleable via the column header context menu.

---

## 2. BLOCK_TYPE_COLOR Map — Add New Types

Current map in `BlockViewerGrid.tsx` (line 55):

```typescript
const BLOCK_TYPE_COLOR: Record<string, string> = {
  heading: 'blue',
  paragraph: 'gray',
  list_item: 'teal',
  code_block: 'violet',
  table: 'orange',
  // ... etc
};
```

No changes needed — the `block_type` column uses platform types (already mapped). The `raw_element_type` column uses its own muted badge style.

---

## 3. Document / Conversion Detail Panel

### Location

Add to `ProjectDetail.tsx` or as a new component `ConversionDetailPanel.tsx` shown when a document is selected.

### Data source

Query `conversion_parsing` for the document's `conv_uid`:

```typescript
const { data: convDetail } = await supabase
  .from(TABLES.conversionParsing)
  .select(`
    conv_uid,
    conv_status,
    conv_parsing_tool,
    conv_representation_type,
    conv_total_blocks,
    conv_total_characters,
    conv_block_type_freq,
    parser_version,
    parser_pipeline_family,
    parser_profile_name,
    parser_backend_name,
    parser_input_format,
    parser_input_mime,
    parser_options_hash,
    parser_extenders_json,
    created_at
  `)
  .eq('source_uid', sourceUid)
  .maybeSingle();
```

### Display layout

```
┌─────────────────────────────────────────────────────────┐
│ Conversion Details                                       │
├──────────────────────┬──────────────────────────────────┤
│ Parser               │ Docling 2.71.0                   │
│ Pipeline             │ StandardPdfPipeline              │
│ Profile              │ docling_pdf_balanced_default      │
│ Backend              │ DoclingParseV4DocumentBackend     │
│ Input Format         │ pdf (application/pdf)            │
│ Options Hash         │ abc123... (hover to see full)     │
├──────────────────────┼──────────────────────────────────┤
│ Enrichers            │                                   │
│   OCR                │ ✓ Enabled                         │
│   Table Structure    │ ✓ Enabled                         │
│   Code Detection     │ ✗ Disabled                        │
│   Formula Detection  │ ✗ Disabled                        │
│   Picture Classify   │ ✗ Disabled                        │
│   Picture Describe   │ ✗ Disabled                        │
├──────────────────────┼──────────────────────────────────┤
│ Status               │ success                           │
│ Blocks               │ 147                               │
│ Characters           │ 52,340                            │
│ Block Types          │ heading:12 paragraph:98 table:5...│
│ Converted At         │ 2026-02-20 14:32:00              │
└──────────────────────┴──────────────────────────────────┘
```

### Component sketch

```tsx
function ConversionDetailPanel({ sourceUid }: { sourceUid: string }) {
  const [detail, setDetail] = useState<ConversionDetail | null>(null);

  useEffect(() => {
    supabase
      .from(TABLES.conversionParsing)
      .select('*')
      .eq('source_uid', sourceUid)
      .maybeSingle()
      .then(({ data }) => setDetail(data));
  }, [sourceUid]);

  if (!detail) return null;

  const enrichers = detail.parser_extenders_json as Record<string, boolean> | null;

  return (
    <Paper p="md" withBorder>
      <Text fw={600} mb="sm">Conversion Details</Text>

      <SimpleGrid cols={2} spacing="xs">
        <Text size="sm" c="dimmed">Parser</Text>
        <Text size="sm">
          {detail.conv_parsing_tool}{detail.parser_version ? ` ${detail.parser_version}` : ''}
        </Text>

        <Text size="sm" c="dimmed">Pipeline</Text>
        <Text size="sm">{detail.parser_pipeline_family ?? '—'}</Text>

        <Text size="sm" c="dimmed">Profile</Text>
        <Text size="sm">{detail.parser_profile_name ?? '—'}</Text>

        <Text size="sm" c="dimmed">Backend</Text>
        <Text size="sm">{detail.parser_backend_name ?? '—'}</Text>

        <Text size="sm" c="dimmed">Format</Text>
        <Text size="sm">
          {detail.parser_input_format ?? '—'}
          {detail.parser_input_mime ? ` (${detail.parser_input_mime})` : ''}
        </Text>
      </SimpleGrid>

      {enrichers && (
        <>
          <Divider my="sm" />
          <Text size="sm" fw={500} mb="xs">Enrichers</Text>
          <Group gap="xs" wrap="wrap">
            {Object.entries(enrichers).map(([key, enabled]) => (
              <Badge
                key={key}
                size="sm"
                variant={enabled ? 'filled' : 'outline'}
                color={enabled ? 'green' : 'gray'}
              >
                {key.replace(/^do_/, '').replace(/_/g, ' ')}
              </Badge>
            ))}
          </Group>
        </>
      )}

      <Divider my="sm" />
      <SimpleGrid cols={2} spacing="xs">
        <Text size="sm" c="dimmed">Status</Text>
        <Badge size="sm" color={detail.conv_status === 'success' ? 'green' : 'yellow'}>
          {detail.conv_status}
        </Badge>

        <Text size="sm" c="dimmed">Blocks</Text>
        <Text size="sm">{detail.conv_total_blocks?.toLocaleString()}</Text>

        <Text size="sm" c="dimmed">Characters</Text>
        <Text size="sm">{detail.conv_total_characters?.toLocaleString()}</Text>
      </SimpleGrid>
    </Paper>
  );
}
```

---

## 4. Upload Flow — Extended Format Support

### Current state

The ingest edge function accepts any `source_type` registered in `source_type_catalog` (22 types). The frontend upload UI maps file extensions to source types.

### New format mappings

The frontend needs to map these additional extensions to source types:

| Extension(s) | source_type | Notes |
|---|---|---|
| `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff`, `.bmp`, `.webp`, `.gif` | `image` | New: image documents via StandardPdfPipeline |
| `.adoc`, `.asciidoc`, `.asc` | `asciidoc` | New: AsciiDoc via SimplePipeline |
| `.xml` (JATS) | `xml_jats` | Ambiguous: needs content detection or user hint |
| `.xml` (USPTO) | `xml_uspto` | Ambiguous: needs content detection or user hint |
| `.json` | `json_docling` | Only DoclingDocument JSON re-import |
| `.wav`, `.mp3`, `.m4a`, `.aac`, `.ogg`, `.flac` | `audio` | New: audio via AsrPipeline (future) |
| `.vtt` | `vtt` | New: WebVTT subtitles |
| `.tar.gz` (METS) | `mets_gbs` | Specialized: Google Books METS |

### Ambiguity handling

For `.xml` files, the frontend cannot determine if it's JATS or USPTO without inspecting content. Options:

1. **Default to a generic handler** and let the conversion service detect format via Docling's 5-stage format resolution
2. **Ask the user** to select the XML schema type on upload
3. **Send as generic `xml`** and let the conversion service figure it out

Recommendation: Option 1 for now. Add `xml` as a source_type that maps to the docling track, and let Docling's format detection handle disambiguation.

### Upload component changes

```typescript
// In the file upload handler, extend the extension → source_type mapping:
const EXTENSION_TO_SOURCE_TYPE: Record<string, string> = {
  // Existing
  md: 'md',
  txt: 'txt',
  docx: 'docx',
  pptx: 'pptx',
  pdf: 'pdf',
  html: 'html',
  htm: 'html',
  csv: 'csv',
  xlsx: 'xlsx',
  rst: 'rst',
  tex: 'latex',
  latex: 'latex',
  odt: 'odt',
  epub: 'epub',
  rtf: 'rtf',
  org: 'org',
  // NEW
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  tif: 'image',
  tiff: 'image',
  bmp: 'image',
  webp: 'image',
  gif: 'image',
  adoc: 'asciidoc',
  asciidoc: 'asciidoc',
  asc: 'asciidoc',
  xml: 'xml_jats',  // default XML to JATS; can be overridden
  json: 'json_docling',
  vtt: 'vtt',
  // Audio (future — gated behind ASR support)
  // wav: 'audio',
  // mp3: 'audio',
  // m4a: 'audio',
};
```

### File input accept attribute

```typescript
const ACCEPTED_EXTENSIONS = [
  '.md', '.txt', '.docx', '.pptx', '.pdf', '.html', '.htm',
  '.csv', '.xlsx', '.rst', '.tex', '.odt', '.epub', '.rtf', '.org',
  // NEW
  '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.webp', '.gif',
  '.adoc', '.asciidoc', '.xml', '.json', '.vtt',
];
```

---

## 5. Realtime Subscription Fix

### Current issue (C1 from audit)

`source_documents` is not in `supabase_realtime` publication. The frontend's existing subscription code on `source_documents` silently receives no events.

### Fix

This is a **database-side fix** (in `01-database-migration.sql`):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE source_documents;
```

No frontend code changes needed — the subscription code already exists and will start working once the table is added to the publication.

### Verify in `ProjectDetail.tsx`

The existing realtime subscription should look like:

```typescript
const channel = supabase
  .channel('doc-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: TABLES.sourceDocuments,
    filter: `source_uid=eq.${sourceUid}`,
  }, (payload) => {
    // Update local state with new status
    setDocStatus(payload.new.status);
  })
  .subscribe();
```

After the migration, this will start receiving events when `status` changes from `converting` → `ingested` (or `conversion_failed` / `partial_success`).

---

## 6. documents_view Updates

### Current usage

`TABLES.documents` points to `documents_view`, the read-only JOIN of `source_documents` + `conversion_parsing`. This is used for document list pages.

### Impact

The migration recreates `documents_view` with new columns (parser provenance). Frontend queries using `TABLES.documents` will automatically see the new columns without code changes — they just need to include them in the `select()` call if they want to display them.

### Document list enhancement

The projects overview or document list could show:

```typescript
// In the document list query, optionally include:
const { data } = await supabase
  .from(TABLES.documents)
  .select(`
    source_uid, doc_title, source_type, status, uploaded_at,
    conv_total_blocks, conv_parsing_tool,
    parser_pipeline_family, parser_profile_name
  `)
  .eq('project_id', projectId)
  .order('uploaded_at', { ascending: false });
```

This allows showing "Parsed by: Docling 2.71.0 (StandardPdfPipeline)" in the document list without a separate query.

---

## 7. Admin Config Page — Docling Settings

### Location

`web/src/pages/AdminConfig.tsx` (or equivalent superuser settings page)

### New section: "Docling Conversion Settings"

```
┌─────────────────────────────────────────────────────────┐
│ Docling Conversion Settings                              │
├─────────────────────────────────────────────────────────┤
│ Profile:  [docling_pdf_balanced_default     ▾]          │
│                                                          │
│ Enrichers:                                               │
│   [✓] OCR                                                │
│   [✓] Table Structure    Mode: [ACCURATE ▾]             │
│   [ ] Code Detection                                     │
│   [ ] Formula Detection                                  │
│   [ ] Picture Classification                             │
│   [ ] Picture Description    Mode: [api ▾]              │
│                                                          │
│ Layout Model: [Default (Heron)          ▾]              │
│                                                          │
│ Picture Description API URL:                             │
│   [                                          ]           │
│   (Only used when Picture Description is enabled)        │
│                                                          │
│ [Save Changes]                                           │
└─────────────────────────────────────────────────────────┘
```

### Implementation

Uses existing `admin-config` edge function — POST to update policy keys:

```typescript
async function saveDoclingSettings(settings: DoclingSettings) {
  await fetch(`${SUPABASE_URL}/functions/v1/admin-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      updates: [
        { policy_key: 'upload.docling_profile', value_jsonb: settings.profile },
        { policy_key: 'upload.docling_enrichers', value_jsonb: settings.enrichers },
        { policy_key: 'upload.docling_picture_description_api_url', value_jsonb: settings.pictureDescriptionApiUrl },
      ],
    }),
  });
}
```