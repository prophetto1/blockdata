/**
 * Docling JSON block extraction utility.
 *
 * Parses a DoclingDocument JSON export (from `export_to_dict()`) and extracts
 * platform blocks with `docling_json_pointer` locators.
 *
 * See docs/product-defining-v2.0/0207-blocks.md for the block type mapping.
 */

// ---------------------------------------------------------------------------
// Types (subset of DoclingDocument JSON structure needed for block extraction)
// ---------------------------------------------------------------------------

type DoclingRef = { $ref: string };

type DoclingProv = {
  page_no?: number;
  bbox?: Record<string, number>;
  charspan?: [number, number];
};

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
};

type DoclingTableCell = {
  text: string;
  row_span: number;
  col_span: number;
  start_row_offset_idx: number;
  end_row_offset_idx: number;
  start_col_offset_idx: number;
  end_col_offset_idx: number;
  column_header?: boolean;
  row_header?: boolean;
};

type DoclingTableItem = {
  self_ref: string;
  parent?: DoclingRef;
  children?: DoclingRef[];
  content_layer?: string;
  label: string;
  prov?: DoclingProv[];
  data?: {
    table_cells?: DoclingTableCell[];
    num_rows?: number;
    num_cols?: number;
  };
  captions?: DoclingRef[];
};

type DoclingPictureItem = {
  self_ref: string;
  parent?: DoclingRef;
  children?: DoclingRef[];
  content_layer?: string;
  label: string;
  prov?: DoclingProv[];
  captions?: DoclingRef[];
};

type DoclingNodeItem = {
  self_ref: string;
  children?: DoclingRef[];
  content_layer?: string;
  name?: string;
  label?: string;
};

type DoclingDocument = {
  schema_name?: string;
  version?: string;
  name?: string;
  origin?: Record<string, unknown>;
  furniture: DoclingNodeItem;
  body: DoclingNodeItem;
  groups?: DoclingNodeItem[];
  texts: DoclingTextItem[];
  pictures: DoclingPictureItem[];
  tables: DoclingTableItem[];
  key_value_items?: DoclingTextItem[];
  form_items?: DoclingTextItem[];
  pages?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Public API (mirrors _shared/markdown.ts shape)
// ---------------------------------------------------------------------------

export type DoclingBlockDraft = {
  block_type: string;
  block_content: string;
  pointer: string; // e.g. "#/texts/5"
  page_no: number | null;
  page_nos: number[];
  parser_block_type: string;
  parser_path: string;
};

export type ExtractDoclingBlocksResult = {
  docTitle: string | null;
  blocks: DoclingBlockDraft[];
};

function getNativeBlockType(label: string | undefined, fallback: string): string {
  if (typeof label !== "string") return fallback;
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Extract blocks from DoclingDocument JSON bytes.
 * Traverses `body.children[]` then `furniture.children[]` in order.
 */
export function extractDoclingBlocks(
  jsonBytes: Uint8Array,
): ExtractDoclingBlocksResult {
  const text = new TextDecoder().decode(jsonBytes);
  const doc: DoclingDocument = JSON.parse(text);

  // Build lookup maps for resolving $ref pointers.
  const textsMap = new Map<string, DoclingTextItem>();
  for (const item of doc.texts ?? []) textsMap.set(item.self_ref, item);

  const tablesMap = new Map<string, DoclingTableItem>();
  for (const item of doc.tables ?? []) tablesMap.set(item.self_ref, item);

  const picturesMap = new Map<string, DoclingPictureItem>();
  for (const item of doc.pictures ?? []) picturesMap.set(item.self_ref, item);

  const groupsMap = new Map<string, DoclingNodeItem>();
  for (const item of doc.groups ?? []) groupsMap.set(item.self_ref, item);

  const kvMap = new Map<string, DoclingTextItem>();
  for (const item of doc.key_value_items ?? []) kvMap.set(item.self_ref, item);

  const formMap = new Map<string, DoclingTextItem>();
  for (const item of doc.form_items ?? []) formMap.set(item.self_ref, item);

  const blocks: DoclingBlockDraft[] = [];
  let docTitle: string | null = null;

  const visited = new Set<string>();

  function extractPageNos(prov: DoclingProv[] | undefined): number[] {
    if (!prov || prov.length === 0) return [];
    const pages = new Set<number>();
    for (const entry of prov) {
      const raw = entry?.page_no;
      if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
      const page = Math.trunc(raw);
      if (page > 0) pages.add(page);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  function resolveAndEmit(ref: DoclingRef): void {
    const pointer = ref.$ref;
    if (visited.has(pointer)) return;
    visited.add(pointer);

    // Try texts
    const textItem = textsMap.get(pointer);
    if (textItem) {
      const blockType = getNativeBlockType(textItem.label, "text");
      const content = textItem.text ?? textItem.orig ?? "";
      const pageNos = extractPageNos(textItem.prov);
      const pageNo = pageNos[0] ?? null;

      // Extract doc title from first TITLE item
      if (
        !docTitle &&
        (textItem.label === "title" || textItem.label === "TITLE") &&
        content.trim()
      ) {
        docTitle = content.trim();
      }

      blocks.push({
        block_type: blockType,
        block_content: content,
        pointer,
        page_no: pageNo,
        page_nos: pageNos,
        parser_block_type: textItem.label,
        parser_path: pointer,
      });

      // Always recurse into children — in DoclingDocument, headings/titles act
      // as container nodes for paragraphs, lists, tables nested under them.
      // The visited set prevents cycles.
      if (textItem.children) {
        for (const child of textItem.children) resolveAndEmit(child);
      }
      return;
    }

    // Try tables
    const tableItem = tablesMap.get(pointer);
    if (tableItem) {
      const content = tableToText(tableItem);
      const pageNos = extractPageNos(tableItem.prov);
      const pageNo = pageNos[0] ?? null;
      blocks.push({
        block_type: getNativeBlockType(tableItem.label, "table"),
        block_content: content,
        pointer,
        page_no: pageNo,
        page_nos: pageNos,
        parser_block_type: tableItem.label,
        parser_path: pointer,
      });
      if (tableItem.children) {
        for (const child of tableItem.children) resolveAndEmit(child);
      }
      return;
    }

    // Try pictures
    const picItem = picturesMap.get(pointer);
    if (picItem) {
      // Use caption text if available, otherwise empty
      let content = "";
      if (picItem.captions) {
        const captionTexts: string[] = [];
        for (const capRef of picItem.captions) {
          const capItem = textsMap.get(capRef.$ref);
          if (capItem?.text) captionTexts.push(capItem.text);
        }
        content = captionTexts.join(" ");
      }
      const pageNos = extractPageNos(picItem.prov);
      const pageNo = pageNos[0] ?? null;
      blocks.push({
        block_type: getNativeBlockType(picItem.label, "picture"),
        block_content: content,
        pointer,
        page_no: pageNo,
        page_nos: pageNos,
        parser_block_type: picItem.label ?? "picture",
        parser_path: pointer,
      });
      if (picItem.children) {
        for (const child of picItem.children) resolveAndEmit(child);
      }
      return;
    }

    // Try key_value_items
    const kvItem = kvMap.get(pointer);
    if (kvItem) {
      const content = kvItem.text ?? kvItem.orig ?? "";
      const pageNos = extractPageNos(kvItem.prov);
      const pageNo = pageNos[0] ?? null;
      blocks.push({
        block_type: getNativeBlockType(kvItem.label, "key_value_region"),
        block_content: content,
        pointer,
        page_no: pageNo,
        page_nos: pageNos,
        parser_block_type: kvItem.label,
        parser_path: pointer,
      });
      return;
    }

    // Try form_items
    const formItem = formMap.get(pointer);
    if (formItem) {
      const content = formItem.text ?? formItem.orig ?? "";
      const pageNos = extractPageNos(formItem.prov);
      const pageNo = pageNos[0] ?? null;
      blocks.push({
        block_type: getNativeBlockType(formItem.label, "form"),
        block_content: content,
        pointer,
        page_no: pageNo,
        page_nos: pageNos,
        parser_block_type: formItem.label,
        parser_path: pointer,
      });
      return;
    }

    // Groups
    const group = groupsMap.get(pointer);
    if (group) {
      if (group.label === "inline" && group.children) {
        // Inline groups contain text fragments split by the parser (e.g. bracket
        // syntax misread as markdown links). Merge children into one block.
        const parts: string[] = [];
        const allPageNos = new Set<number>();
        for (const childRef of group.children) {
          visited.add(childRef.$ref);
          const textItem = textsMap.get(childRef.$ref);
          if (textItem) {
            parts.push(textItem.text ?? textItem.orig ?? "");
            for (const p of extractPageNos(textItem.prov)) allPageNos.add(p);
          }
        }
        const pageNos = Array.from(allPageNos).sort((a, b) => a - b);
        blocks.push({
          block_type: getNativeBlockType(group.label ?? group.name, "inline"),
          block_content: parts.join(""),
          pointer,
          page_no: pageNos[0] ?? null,
          page_nos: pageNos,
          parser_block_type: "inline",
          parser_path: pointer,
        });
      } else if (group.children) {
        for (const child of group.children) resolveAndEmit(child);
      }
      return;
    }

    // Unknown ref — skip silently
  }

  // Traverse body children (main reading order)
  for (const ref of doc.body?.children ?? []) {
    resolveAndEmit(ref);
  }

  // Traverse furniture children (page headers/footers)
  for (const ref of doc.furniture?.children ?? []) {
    resolveAndEmit(ref);
  }

  return { docTitle, blocks };
}

/**
 * Convert a Docling table item to a text representation.
 * Reconstructs a pipe-delimited table from cell data.
 */
function tableToText(table: DoclingTableItem): string {
  const cells = table.data?.table_cells;
  if (!cells || cells.length === 0) return "";

  const numRows = table.data?.num_rows ?? 0;
  const numCols = table.data?.num_cols ?? 0;
  if (numRows === 0 || numCols === 0) return cells.map((c) => c.text).join(" ");

  // Build a 2D grid
  const grid: string[][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => ""),
  );

  for (const cell of cells) {
    const r = cell.start_row_offset_idx;
    const c = cell.start_col_offset_idx;
    if (r < numRows && c < numCols) {
      grid[r][c] = cell.text;
    }
  }

  return grid.map((row) => row.join(" | ")).join("\n");
}
