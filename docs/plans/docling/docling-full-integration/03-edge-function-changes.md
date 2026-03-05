# Edge Function Changes

All edge functions live in `supabase/functions/`. Changes are additive — no existing behavior removed.

---

## 1. `_shared/docling.ts` — Enrich Block Extraction

### Current output shape (`DoclingBlockDraft`)
```typescript
{
  block_type: string;
  block_content: string;
  pointer: string;       // e.g. "#/texts/5"
  page_no: number | null;
  parser_block_type: string;
  parser_path: string;
}
```

### New output shape (`DoclingBlockDraft`)
```typescript
export type DoclingBlockDraft = {
  block_type: string;
  block_content: string;
  pointer: string;
  page_no: number | null;
  parser_block_type: string;
  parser_path: string;
  // NEW fields
  raw_element_type: string;              // Native DocItemLabel (the 23-value enum)
  raw_group_type: string | null;         // Parent GroupLabel (the 12-value enum)
  raw_item_ref: string;                  // self_ref pointer
  coordinates_json: Record<string, unknown> | null;  // prov[0].bbox
  parser_metadata_json: Record<string, unknown> | null;  // charspan, level, formatting, etc.
};
```

### New: Build `groupsMap` for parent group resolution

The current code doesn't build a map of group nodes. Add this alongside the existing `textsMap`, `tablesMap`, `picturesMap` construction:

```typescript
// Build groups map from DoclingDocument body
// Groups contain: self_ref, label (GroupLabel enum), children[]
const groupsMap = new Map<string, { self_ref: string; label: string }>();
for (const groupType of ["chapters", "comment_sections", "form_areas",
    "inline_groups", "key_value_areas", "lists", "ordered_lists",
    "picture_areas", "sections", "sheets", "slides", "unspecified_groups"]) {
  const arr = (doc.body as any)?.[groupType];
  if (Array.isArray(arr)) {
    for (const g of arr) {
      if (g.self_ref) {
        groupsMap.set(g.self_ref, { self_ref: g.self_ref, label: g.label ?? groupType });
      }
    }
  }
}
// Also check doc.groups if present (flat array of all groups)
if (Array.isArray((doc as any).groups)) {
  for (const g of (doc as any).groups) {
    if (g.self_ref && !groupsMap.has(g.self_ref)) {
      groupsMap.set(g.self_ref, { self_ref: g.self_ref, label: g.label ?? "unspecified" });
    }
  }
}
```

This map is then used in `resolveAndEmit()` to look up `textItem.parent.$ref` → parent group label.

### Changes to `resolveAndEmit()` function

For **text items** (currently lines 152-183):

```typescript
// Try texts
const textItem = textsMap.get(pointer);
if (textItem) {
  const blockType = mapDoclingLabel(textItem.label);
  const content = textItem.text ?? textItem.orig ?? "";
  const pageNo = textItem.prov?.[0]?.page_no ?? null;

  // Extract doc title (unchanged)
  if (!docTitle && (textItem.label === "title" || textItem.label === "TITLE") && content.trim()) {
    docTitle = content.trim();
  }

  // NEW: Resolve parent group label
  let rawGroupType: string | null = null;
  if (textItem.parent?.$ref) {
    const parentGroup = groupsMap.get(textItem.parent.$ref);
    if (parentGroup?.label) {
      rawGroupType = parentGroup.label.toLowerCase();
    }
  }

  // NEW: Extract bounding box from provenance
  const bbox = textItem.prov?.[0]?.bbox ?? null;
  const coordinatesJson = bbox ? { ...bbox } : null;

  // NEW: Build parser_metadata_json
  const parserMeta: Record<string, unknown> = {};
  const charspan = textItem.prov?.[0]?.charspan;
  if (charspan) parserMeta.charspan = charspan;
  if (textItem.level != null) parserMeta.level = textItem.level;
  if ((textItem as any).formatting) parserMeta.formatting = (textItem as any).formatting;
  if ((textItem as any).hyperlink) parserMeta.hyperlink = (textItem as any).hyperlink;
  if ((textItem as any).code_language) parserMeta.code_language = (textItem as any).code_language;

  blocks.push({
    block_type: blockType,
    block_content: content,
    pointer,
    page_no: pageNo,
    parser_block_type: textItem.label,
    parser_path: pointer,
    // NEW
    raw_element_type: textItem.label.toLowerCase(),
    raw_group_type: rawGroupType,
    raw_item_ref: textItem.self_ref,
    coordinates_json: coordinatesJson,
    parser_metadata_json: Object.keys(parserMeta).length > 0 ? parserMeta : null,
  });

  // Recurse into children (unchanged)
  if (textItem.children) {
    for (const child of textItem.children) resolveAndEmit(child);
  }
  return;
}
```

For **table items** (currently lines 186-203):

```typescript
const tableItem = tablesMap.get(pointer);
if (tableItem) {
  const content = tableToText(tableItem);
  const pageNo = tableItem.prov?.[0]?.page_no ?? null;

  // NEW: parent group
  let rawGroupType: string | null = null;
  if (tableItem.parent?.$ref) {
    const parentGroup = groupsMap.get(tableItem.parent.$ref);
    if (parentGroup?.label) rawGroupType = parentGroup.label.toLowerCase();
  }

  // NEW: bbox
  const bbox = tableItem.prov?.[0]?.bbox ?? null;

  // NEW: table-specific metadata
  const parserMeta: Record<string, unknown> = {};
  if (tableItem.data?.num_rows != null) parserMeta.num_rows = tableItem.data.num_rows;
  if (tableItem.data?.num_cols != null) parserMeta.num_cols = tableItem.data.num_cols;
  const charspan = tableItem.prov?.[0]?.charspan;
  if (charspan) parserMeta.charspan = charspan;
  // Capture caption refs for later resolution
  if (tableItem.captions?.length) {
    parserMeta.caption_refs = tableItem.captions.map(c => c.$ref);
  }

  blocks.push({
    block_type: mapDoclingLabel(tableItem.label),
    block_content: content,
    pointer,
    page_no: pageNo,
    parser_block_type: tableItem.label,
    parser_path: pointer,
    // NEW
    raw_element_type: tableItem.label.toLowerCase(),
    raw_group_type: rawGroupType,
    raw_item_ref: tableItem.self_ref,
    coordinates_json: bbox ? { ...bbox } : null,
    parser_metadata_json: Object.keys(parserMeta).length > 0 ? parserMeta : null,
  });

  if (tableItem.children) {
    for (const child of tableItem.children) resolveAndEmit(child);
  }
  return;
}
```

For **picture items** (currently lines 205-231):

```typescript
const picItem = picturesMap.get(pointer);
if (picItem) {
  // Caption text (unchanged)
  let content = "";
  if (picItem.captions) {
    const captionTexts: string[] = [];
    for (const capRef of picItem.captions) {
      const capItem = textsMap.get(capRef.$ref);
      if (capItem?.text) captionTexts.push(capItem.text);
    }
    content = captionTexts.join(" ");
  }
  const pageNo = picItem.prov?.[0]?.page_no ?? null;

  // NEW: parent group
  let rawGroupType: string | null = null;
  if (picItem.parent?.$ref) {
    const parentGroup = groupsMap.get(picItem.parent.$ref);
    if (parentGroup?.label) rawGroupType = parentGroup.label.toLowerCase();
  }

  // NEW: bbox
  const bbox = picItem.prov?.[0]?.bbox ?? null;

  // NEW: picture-specific metadata (classification, description from enrichers)
  const parserMeta: Record<string, unknown> = {};
  const charspan = picItem.prov?.[0]?.charspan;
  if (charspan) parserMeta.charspan = charspan;
  if ((picItem as any).meta?.classification) {
    parserMeta.classification = (picItem as any).meta.classification;
  }
  if ((picItem as any).meta?.description) {
    parserMeta.description = (picItem as any).meta.description;
  }
  if ((picItem as any).image?.mimetype) {
    parserMeta.image_mimetype = (picItem as any).image.mimetype;
  }

  blocks.push({
    block_type: "figure",
    block_content: content,
    pointer,
    page_no: pageNo,
    parser_block_type: picItem.label ?? "picture",
    parser_path: pointer,
    // NEW
    raw_element_type: (picItem.label ?? "picture").toLowerCase(),
    raw_group_type: rawGroupType,
    raw_item_ref: picItem.self_ref,
    coordinates_json: bbox ? { ...bbox } : null,
    parser_metadata_json: Object.keys(parserMeta).length > 0 ? parserMeta : null,
  });

  if (picItem.children) {
    for (const child of picItem.children) resolveAndEmit(child);
  }
  return;
}
```

For **key_value_items** (currently lines 233-247):

```typescript
const kvItem = kvMap.get(pointer);
if (kvItem) {
  const content = kvItem.text ?? kvItem.orig ?? "";
  const pageNo = kvItem.prov?.[0]?.page_no ?? null;

  let rawGroupType: string | null = null;
  if (kvItem.parent?.$ref) {
    const parentGroup = groupsMap.get(kvItem.parent.$ref);
    if (parentGroup?.label) rawGroupType = parentGroup.label.toLowerCase();
  }

  const bbox = kvItem.prov?.[0]?.bbox ?? null;
  const parserMeta: Record<string, unknown> = {};
  const charspan = kvItem.prov?.[0]?.charspan;
  if (charspan) parserMeta.charspan = charspan;

  blocks.push({
    block_type: "key_value_region",
    block_content: content,
    pointer,
    page_no: pageNo,
    parser_block_type: kvItem.label,
    parser_path: pointer,
    raw_element_type: kvItem.label.toLowerCase(),
    raw_group_type: rawGroupType,
    raw_item_ref: kvItem.self_ref,
    coordinates_json: bbox ? { ...bbox } : null,
    parser_metadata_json: Object.keys(parserMeta).length > 0 ? parserMeta : null,
  });
  return;
}
```

For **form_items** (currently lines 249-263): same pattern as key_value_items.

### Type additions to `DoclingDocument`

Add to the type definitions at the top of the file:

```typescript
// Extend DoclingTextItem to include optional format-specific fields
type DoclingTextItem = {
  self_ref: string;
  parent?: DoclingRef;
  children?: DoclingRef[];
  content_layer?: string;
  label: string;
  prov?: DoclingProv[];
  text?: string;
  orig?: string;
  level?: number;
  // NEW optional fields
  formatting?: Record<string, unknown>;  // DOCX: bold, italic, underline
  hyperlink?: string;                     // HTML: href
  code_language?: string;                 // Code blocks: detected language
  enumerated?: boolean;                   // List items: numbered
  marker?: string;                        // List items: bullet/number marker
};

// Extend DoclingPictureItem to include enrichment metadata
type DoclingPictureItem = {
  self_ref: string;
  parent?: DoclingRef;
  children?: DoclingRef[];
  content_layer?: string;
  label: string;
  prov?: DoclingProv[];
  captions?: DoclingRef[];
  // NEW optional fields
  meta?: {
    classification?: {
      predictions?: Array<{
        class_name: string;
        confidence: number;
        created_by?: string;
      }>;
    };
    description?: {
      text: string;
      created_by?: string;
    };
  };
  image?: {
    mimetype?: string;
    dpi?: number;
    size?: { width: number; height: number };
    uri?: string;
  };
};
```

---

## 2. `conversion-complete/index.ts` — Persist Provenance + Enriched Blocks

### Callback body type update

```typescript
type ConversionCompleteBody = {
  source_uid: string;
  conversion_job_id: string;
  track?: "mdast" | "docling" | "pandoc" | null;
  md_key: string;
  docling_key?: string | null;
  pandoc_key?: string | null;
  success: boolean;
  error?: string | null;
  // NEW fields
  parser_provenance?: {
    version?: string | null;
    pipeline_family?: string | null;
    profile_name?: string | null;
    backend_name?: string | null;
    input_format?: string | null;
    input_mime?: string | null;
    options_json?: Record<string, unknown> | null;
    options_hash?: string | null;
    extenders_json?: Record<string, unknown> | null;
  } | null;
  conversion_status?: string | null;
  conversion_errors?: Array<Record<string, unknown>>;
  conversion_timings?: Record<string, unknown>;
};
```

### Docling branch changes (lines 256-361)

In the docling branch, update `conversion_parsing` insert:

```typescript
// Map Docling ConversionStatus to platform conv_status
const convStatus = body.conversion_status === "PARTIAL_SUCCESS"
  ? "partial_success"
  : "success";

const prov = body.parser_provenance;

const { error: convInsErr } = await supabaseAdmin
  .from("conversion_parsing")
  .insert({
    conv_uid,
    source_uid,
    conv_status: convStatus,
    conv_parsing_tool: "docling",
    conv_representation_type: "doclingdocument_json",
    conv_total_blocks,
    conv_block_type_freq: freqMap,
    conv_total_characters,
    conv_locator: docling_key,
    // NEW: parser provenance
    parser_version: prov?.version ?? null,
    parser_pipeline_family: prov?.pipeline_family ?? null,
    parser_profile_name: prov?.profile_name ?? null,
    parser_backend_name: prov?.backend_name ?? null,
    parser_input_format: prov?.input_format ?? null,
    parser_input_mime: prov?.input_mime ?? null,
    parser_options_json: prov?.options_json ?? null,
    parser_options_hash: prov?.options_hash ?? null,
    parser_extenders_json: prov?.extenders_json ?? null,
    // Conversion-level metadata (status, errors, timings, confidence)
    conversion_meta_json: (body.conversion_status || body.conversion_errors?.length || body.conversion_timings)
      ? {
          conversion_status: body.conversion_status ?? null,
          errors: body.conversion_errors ?? [],
          timings: body.conversion_timings ?? {},
        }
      : null,
  });
```

Update block row construction:

```typescript
const blockRows = extracted.blocks.map((b, idx) => ({
  block_uid: `${conv_uid}:${idx}`,
  conv_uid,
  block_index: idx,
  block_type: b.block_type,
  block_locator: {
    type: "docling_json_pointer",
    pointer: b.pointer,
    parser_block_type: b.parser_block_type,
    parser_path: b.parser_path,
    ...(b.page_no != null ? { page_no: b.page_no } : {}),
  },
  block_content: b.block_content,
  // NEW columns
  raw_element_type: b.raw_element_type,
  raw_group_type: b.raw_group_type,
  raw_item_ref: b.raw_item_ref,
  page_no: b.page_no,
  coordinates_json: b.coordinates_json,
  parser_metadata_json: b.parser_metadata_json,
}));
```

Enrich `artifact_meta` for representation:

```typescript
await insertRepresentationArtifact(supabaseAdmin, {
  source_uid,
  conv_uid,
  parsing_tool: "docling",
  representation_type: "doclingdocument_json",
  artifact_locator: docling_key!,
  artifact_hash: conv_uid,
  artifact_size_bytes: doclingBytes.byteLength,
  artifact_meta: {
    source_type: docRow.source_type,
    role: "primary",
    // NEW: parser provenance subset
    parser: {
      version: prov?.version ?? null,
      pipeline_family: prov?.pipeline_family ?? null,
      profile_name: prov?.profile_name ?? null,
      options_hash: prov?.options_hash ?? null,
    },
    // NEW: conversion-level metadata
    conversion_status: body.conversion_status ?? null,
    errors: body.conversion_errors ?? [],
    timings: body.conversion_timings ?? {},
  },
});
```

### Handle partial_success status

After blocks insert, when updating source_documents status:

```typescript
// Map conversion_status to document status
let docStatus = "ingested";
if (body.conversion_status === "PARTIAL_SUCCESS") {
  docStatus = "partial_success";
}

const { error: finalErr } = await supabaseAdmin
  .from("source_documents")
  .update({ status: docStatus, error: null })
  .eq("source_uid", source_uid);
```

### Pandoc and mdast branches — null columns

For pandoc and mdast branches, the new columns are simply not set (NULL by default):

```typescript
// Pandoc branch: blockRows unchanged, new columns default to NULL
const blockRows = extracted.blocks.map((b, idx) => ({
  block_uid: `${conv_uid}:${idx}`,
  conv_uid,
  block_index: idx,
  block_type: b.block_type,
  block_locator: { ... },  // unchanged
  block_content: b.block_content,
  // New columns intentionally omitted — default to NULL
  // raw_element_type, raw_group_type, raw_item_ref, page_no,
  // coordinates_json, parser_metadata_json
}));
```

The conversion_parsing insert for pandoc/mdast also omits the parser_* columns (default NULL).

---

## 3. `ingest/process-convert.ts` — Forward Profile and Enricher Config

### Changes to the conversion service request body

```typescript
body: JSON.stringify({
  source_uid,
  conversion_job_id,
  track: ingest_track,
  source_type,
  source_download_url: signedDownload.signedUrl,
  output: {
    bucket,
    key: md_key,
    signed_upload_url: signedUpload.signedUrl,
    token: signedUpload.token ?? null,
  },
  docling_output,
  pandoc_output,
  callback_url,
  // NEW: forward profile and enricher config from runtime policy
  profile: runtimePolicy.upload.docling_profile ?? null,
  enricher_config: runtimePolicy.upload.docling_enrichers ?? null,
}),
```

---

## 4. `_shared/admin_policy.ts` — Add New Policy Keys

### New fields in the runtime policy type

```typescript
// In the upload policy section, add:
upload: {
  // ... existing fields ...
  docling_profile: string | null;          // "docling_pdf_balanced_default" etc.
  docling_enrichers: {
    do_ocr: boolean;
    do_table_structure: boolean;
    do_code_enrichment: boolean;
    do_formula_enrichment: boolean;
    do_picture_classification: boolean;
    do_picture_description: boolean;
    picture_description_mode: string | null;
    layout_model: string | null;
    table_structure_mode: string | null;
  } | null;
};
```

### Default values in `loadRuntimePolicy()`

```typescript
docling_profile: policyMap.get("upload.docling_profile")?.value_jsonb ?? "docling_pdf_balanced_default",
docling_enrichers: policyMap.get("upload.docling_enrichers")?.value_jsonb ?? {
  do_ocr: true,
  do_table_structure: true,
  do_code_enrichment: false,
  do_formula_enrichment: false,
  do_picture_classification: false,
  do_picture_description: false,
  picture_description_mode: null,
  layout_model: null,
  table_structure_mode: null,
},
```

---

## 5. `_shared/pandoc.ts` and `_shared/markdown.ts` — No Changes

The pandoc and mdast extractors do not produce the new fields. Their `BlockDraft` types remain unchanged. The new columns on `blocks` default to NULL for non-docling tracks.

If we later want to capture `page_no` from pandoc (it doesn't provide this) or richer metadata from mdast, those would be separate follow-ups.

---

## 6. `_shared/representation.ts` — No Type Changes

The `artifact_meta` field is already `Record<string, unknown>`. The edge function just puts richer data in it. No type or function signature changes needed.

---

## 7. Test Updates

### `_shared/docling.test.ts`

Add test cases verifying:

1. `raw_element_type` is populated for each block type
2. `raw_group_type` is resolved from parent group node
3. `coordinates_json` captures bbox from prov
4. `parser_metadata_json` captures charspan, level, formatting
5. Picture items capture classification/description from meta
6. Table items capture num_rows/num_cols
7. Blocks without prov have null coordinates
8. Blocks without parent group have null raw_group_type

### `conversion-complete` integration test

Verify:
1. Callback with `parser_provenance` persists to conversion_parsing
2. Callback without `parser_provenance` (old format) still works
3. `partial_success` status maps correctly
4. Block rows include new columns
5. `artifact_meta` includes parser subset
