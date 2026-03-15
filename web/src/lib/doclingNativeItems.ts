type DoclingRef = { $ref: string };

type DoclingProv = {
  page_no?: number;
};

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

export type DoclingNativeItem = {
  pointer: string;
  kind: 'text' | 'table' | 'picture' | 'key_value' | 'form' | 'group';
  native_label: string;
  content: string;
  page_no: number | null;
  page_nos: number[];
  block_uid?: string | null;
  source_uid?: string | null;
};

export function extractDoclingNativeItemsFromText(jsonText: string): { items: DoclingNativeItem[] } {
  return extractDoclingNativeItemsFromDict(JSON.parse(jsonText) as DoclingDocument);
}

export function extractDoclingNativeItemsFromDict(doc: DoclingDocument): { items: DoclingNativeItem[] } {
  const textsMap = new Map((doc.texts ?? []).map((item) => [item.self_ref, item]));
  const tablesMap = new Map((doc.tables ?? []).map((item) => [item.self_ref, item]));
  const picturesMap = new Map((doc.pictures ?? []).map((item) => [item.self_ref, item]));
  const groupsMap = new Map((doc.groups ?? []).map((item) => [item.self_ref, item]));
  const kvMap = new Map((doc.key_value_items ?? []).map((item) => [item.self_ref, item]));
  const formMap = new Map((doc.form_items ?? []).map((item) => [item.self_ref, item]));

  const items: DoclingNativeItem[] = [];
  const visited = new Set<string>();

  const extractPageNos = (prov: DoclingProv[] | undefined): number[] => {
    const pageNos = new Set<number>();
    for (const item of prov ?? []) {
      const pageNo = typeof item.page_no === 'number' && Number.isFinite(item.page_no) ? Math.trunc(item.page_no) : null;
      if (pageNo && pageNo > 0) pageNos.add(pageNo);
    }
    return [...pageNos].sort((a, b) => a - b);
  };

  const emit = (item: DoclingNativeItem) => {
    items.push(item);
  };

  const walk = (ref: DoclingRef) => {
    const pointer = ref.$ref;
    if (visited.has(pointer)) return;
    visited.add(pointer);

    const textItem = textsMap.get(pointer);
    if (textItem) {
      const pageNos = extractPageNos(textItem.prov);
      emit({
        pointer,
        kind: 'text',
        native_label: textItem.label,
        content: textItem.text ?? textItem.orig ?? '',
        page_no: pageNos[0] ?? null,
        page_nos: pageNos,
      });
      for (const child of textItem.children ?? []) walk(child);
      return;
    }

    const tableItem = tablesMap.get(pointer);
    if (tableItem) {
      const pageNos = extractPageNos(tableItem.prov);
      emit({
        pointer,
        kind: 'table',
        native_label: tableItem.label,
        content: tableToText(tableItem),
        page_no: pageNos[0] ?? null,
        page_nos: pageNos,
      });
      for (const child of tableItem.children ?? []) walk(child);
      return;
    }

    const pictureItem = picturesMap.get(pointer);
    if (pictureItem) {
      const pageNos = extractPageNos(pictureItem.prov);
      emit({
        pointer,
        kind: 'picture',
        native_label: pictureItem.label ?? 'picture',
        content: '',
        page_no: pageNos[0] ?? null,
        page_nos: pageNos,
      });
      for (const child of pictureItem.children ?? []) walk(child);
      return;
    }

    const kvItem = kvMap.get(pointer);
    if (kvItem) {
      const pageNos = extractPageNos(kvItem.prov);
      emit({
        pointer,
        kind: 'key_value',
        native_label: kvItem.label,
        content: kvItem.text ?? kvItem.orig ?? '',
        page_no: pageNos[0] ?? null,
        page_nos: pageNos,
      });
      for (const child of kvItem.children ?? []) walk(child);
      return;
    }

    const formItem = formMap.get(pointer);
    if (formItem) {
      const pageNos = extractPageNos(formItem.prov);
      emit({
        pointer,
        kind: 'form',
        native_label: formItem.label,
        content: formItem.text ?? formItem.orig ?? '',
        page_no: pageNos[0] ?? null,
        page_nos: pageNos,
      });
      for (const child of formItem.children ?? []) walk(child);
      return;
    }

    const group = groupsMap.get(pointer);
    if (group) {
      emit({
        pointer,
        kind: 'group',
        native_label: group.label ?? group.name ?? 'group',
        content: '',
        page_no: null,
        page_nos: [],
      });
      for (const child of group.children ?? []) walk(child);
    }
  };

  for (const child of doc.body?.children ?? []) walk(child);
  for (const child of doc.furniture?.children ?? []) walk(child);

  return { items };
}

function tableToText(table: DoclingTableItem): string {
  const cells = table.data?.table_cells ?? [];
  const numRows = table.data?.num_rows ?? 0;
  const numCols = table.data?.num_cols ?? 0;
  if (cells.length === 0 || numRows === 0 || numCols === 0) {
    return cells.map((cell) => cell.text).join(' ');
  }

  const grid: string[][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => ''),
  );

  for (const cell of cells) {
    if (cell.start_row_offset_idx < numRows && cell.start_col_offset_idx < numCols) {
      grid[cell.start_row_offset_idx]![cell.start_col_offset_idx] = cell.text;
    }
  }

  return grid.map((row) => row.join(' | ')).join('\n');
}
