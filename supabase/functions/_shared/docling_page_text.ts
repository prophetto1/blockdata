/**
 * Assemble reading-order text per page from a DoclingDocument JSON.
 *
 * Mirrors the traversal in web/src/lib/doclingNativeItems.ts:
 *  - resolves items by self_ref (not $ref index math)
 *  - traverses body AND furniture
 *  - reconstructs tables from table_cells via grid
 *  - walks picture items and recurses into their children (captions, descriptions)
 *  - includes key_value and form item text
 */

// ---------------------------------------------------------------------------
// Types (matching web/src/lib/doclingNativeItems.ts)
// ---------------------------------------------------------------------------

type DoclingRef = { $ref: string };
type DoclingProv = { page_no?: number };

type DoclingTextItem = {
  self_ref: string;
  children?: DoclingRef[];
  label: string;
  prov?: DoclingProv[];
  text?: string;
  orig?: string;
};

type DoclingTableCell = {
  text: string;
  start_row_offset_idx: number;
  start_col_offset_idx: number;
};

type DoclingTableItem = {
  self_ref: string;
  children?: DoclingRef[];
  label: string;
  prov?: DoclingProv[];
  data?: {
    table_cells?: DoclingTableCell[];
    num_rows?: number;
    num_cols?: number;
  };
};

type DoclingPictureItem = {
  self_ref: string;
  children?: DoclingRef[];
  label?: string;
  prov?: DoclingProv[];
};

type DoclingNodeItem = {
  self_ref: string;
  children?: DoclingRef[];
  label?: string;
  name?: string;
};

type DoclingDocument = {
  body?: { children?: DoclingRef[] };
  furniture?: { children?: DoclingRef[] };
  groups?: DoclingNodeItem[];
  texts?: DoclingTextItem[];
  tables?: DoclingTableItem[];
  pictures?: DoclingPictureItem[];
  key_value_items?: DoclingTextItem[];
  form_items?: DoclingTextItem[];
};

// ---------------------------------------------------------------------------
// Table text reconstruction (same logic as doclingNativeItems.ts:198-217)
// ---------------------------------------------------------------------------

function tableToText(table: DoclingTableItem): string {
  const cells = table.data?.table_cells ?? [];
  const numRows = table.data?.num_rows ?? 0;
  const numCols = table.data?.num_cols ?? 0;
  if (cells.length === 0 || numRows === 0 || numCols === 0) {
    return cells.map((cell) => cell.text).join(" ");
  }

  const grid: string[][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => ""),
  );

  for (const cell of cells) {
    if (
      cell.start_row_offset_idx < numRows &&
      cell.start_col_offset_idx < numCols
    ) {
      grid[cell.start_row_offset_idx]![cell.start_col_offset_idx] = cell.text;
    }
  }

  return grid.map((row) => row.join(" | ")).join("\n");
}

// ---------------------------------------------------------------------------
// Page number extraction (same logic as doclingNativeItems.ts:85-92)
// ---------------------------------------------------------------------------

function extractFirstPageNo(prov: DoclingProv[] | undefined): number | null {
  for (const item of prov ?? []) {
    const pageNo =
      typeof item.page_no === "number" && Number.isFinite(item.page_no)
        ? Math.trunc(item.page_no)
        : null;
    if (pageNo && pageNo > 0) return pageNo;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Document traversal (mirrors doclingNativeItems.ts:74-196)
// ---------------------------------------------------------------------------

export function assemblePageText(doc: DoclingDocument): Map<number, string> {
  const textsMap = new Map(
    (doc.texts ?? []).map((item) => [item.self_ref, item]),
  );
  const tablesMap = new Map(
    (doc.tables ?? []).map((item) => [item.self_ref, item]),
  );
  const picturesMap = new Map(
    (doc.pictures ?? []).map((item) => [item.self_ref, item]),
  );
  const kvMap = new Map(
    (doc.key_value_items ?? []).map((item) => [item.self_ref, item]),
  );
  const formMap = new Map(
    (doc.form_items ?? []).map((item) => [item.self_ref, item]),
  );
  const groupsMap = new Map(
    (doc.groups ?? []).map((item) => [item.self_ref, item]),
  );

  const pages = new Map<number, string[]>();
  const visited = new Set<string>();

  function addToPage(pageNo: number | null, text: string): void {
    const page = pageNo ?? 1; // unlocated items go to page 1
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page)!.push(text);
  }

  function walk(ref: DoclingRef): void {
    const pointer = ref.$ref;
    if (visited.has(pointer)) return;
    visited.add(pointer);

    const textItem = textsMap.get(pointer);
    if (textItem) {
      const content = textItem.text ?? textItem.orig ?? "";
      if (content.trim()) addToPage(extractFirstPageNo(textItem.prov), content);
      for (const child of textItem.children ?? []) walk(child);
      return;
    }

    const tableItem = tablesMap.get(pointer);
    if (tableItem) {
      const content = tableToText(tableItem);
      if (content.trim()) addToPage(extractFirstPageNo(tableItem.prov), content);
      for (const child of tableItem.children ?? []) walk(child);
      return;
    }

    // Picture items: no text content of their own, but children may contain
    // captions or descriptions that must not be silently dropped.
    // Mirrors doclingNativeItems.ts:133-146.
    const pictureItem = picturesMap.get(pointer);
    if (pictureItem) {
      for (const child of pictureItem.children ?? []) walk(child);
      return;
    }

    const kvItem = kvMap.get(pointer);
    if (kvItem) {
      const content = kvItem.text ?? kvItem.orig ?? "";
      if (content.trim()) addToPage(extractFirstPageNo(kvItem.prov), content);
      for (const child of kvItem.children ?? []) walk(child);
      return;
    }

    const formItem = formMap.get(pointer);
    if (formItem) {
      const content = formItem.text ?? formItem.orig ?? "";
      if (content.trim()) addToPage(extractFirstPageNo(formItem.prov), content);
      for (const child of formItem.children ?? []) walk(child);
      return;
    }

    const group = groupsMap.get(pointer);
    if (group) {
      for (const child of group.children ?? []) walk(child);
    }
  }

  // Traverse body AND furniture (same as doclingNativeItems.ts:192-193)
  for (const child of doc.body?.children ?? []) walk(child);
  for (const child of doc.furniture?.children ?? []) walk(child);

  const result = new Map<number, string>();
  for (const [page, texts] of pages) {
    result.set(page, texts.join("\n\n"));
  }
  return result;
}

/**
 * Get total page count from a DoclingDocument.
 * Scans all provenance entries (including pictures) to find the maximum page number.
 */
export function getPageCount(doc: DoclingDocument): number {
  let max = 0;
  for (const collection of [
    "texts",
    "tables",
    "pictures",
    "key_value_items",
    "form_items",
  ] as const) {
    const items = doc[collection];
    if (!items) continue;
    for (const item of items) {
      if (!item.prov) continue;
      for (const p of item.prov) {
        const pageNo =
          typeof p.page_no === "number" && Number.isFinite(p.page_no)
            ? Math.trunc(p.page_no)
            : 0;
        if (pageNo > max) max = pageNo;
      }
    }
  }
  return max;
}

/**
 * Build extraction work item descriptors for a job.
 * Document mode: one item with page_number null.
 * Page mode: one item per page in the requested range.
 */
export function buildExtractionItems(args: {
  totalPages: number;
  extractionTarget: "document" | "page";
  pageRange?: { start: number; end: number } | null;
}) {
  if (args.extractionTarget === "document") {
    return [{ target_kind: "document" as const, page_number: null }];
  }

  const start = args.pageRange?.start ?? 1;
  const end = args.pageRange?.end ?? args.totalPages;
  const items: Array<{ target_kind: "page"; page_number: number }> = [];
  for (let page = start; page <= end; page += 1) {
    items.push({ target_kind: "page", page_number: page });
  }
  return items;
}