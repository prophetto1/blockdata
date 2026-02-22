const DEFAULT_DOCLING_LABEL_BY_BLOCK_TYPE: Record<string, string> = {
  heading: 'section_header',
  paragraph: 'text',
  list_item: 'list_item',
  code_block: 'code',
  table: 'table',
  figure: 'picture',
  caption: 'caption',
  footnote: 'footnote',
  page_header: 'page_header',
  page_footer: 'page_footer',
  checkbox: 'checkbox_unselected',
  form_region: 'form',
  key_value_region: 'key_value_region',
};

const FALLBACK_OVERLAY_BY_BLOCK_TYPE: Record<string, { border: string; bg: string }> = {
  heading: { border: '#0ea5e9', bg: 'rgba(14,165,233,0.14)' },
  page_header: { border: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
  page_footer: { border: '#d97706', bg: 'rgba(217,119,6,0.16)' },
  paragraph: { border: '#38bdf8', bg: 'rgba(56,189,248,0.14)' },
};

export function normalizeNativeLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized.length > 0 ? normalized : null;
}

function resolveOverlayKey(
  blockType: string,
  parserBlockType: unknown,
  nodeLabel: unknown,
  overlayBorderMap?: Record<string, string>,
  overlayBgMap?: Record<string, string>,
): string | null {
  const normalizedBlockType = normalizeNativeLabel(blockType);
  const normalizedParserBlockType = normalizeNativeLabel(parserBlockType);
  const normalizedNodeLabel = normalizeNativeLabel(nodeLabel);
  const defaultDoclingLabel = normalizedBlockType
    ? DEFAULT_DOCLING_LABEL_BY_BLOCK_TYPE[normalizedBlockType] ?? normalizedBlockType
    : null;

  const candidates = [
    normalizedParserBlockType,
    normalizedNodeLabel,
    defaultDoclingLabel,
    normalizedBlockType,
  ].filter((value, index, values): value is string => (
    value !== null && values.indexOf(value) === index
  ));

  for (const candidate of candidates) {
    if (overlayBorderMap?.[candidate] || overlayBgMap?.[candidate]) {
      return candidate;
    }
  }

  return candidates[0] ?? null;
}

export function resolveOverlayColors(
  blockType: string,
  parserBlockType: unknown,
  nodeLabel: unknown,
  overlayBorderMap?: Record<string, string>,
  overlayBgMap?: Record<string, string>,
): { border?: string; bg?: string } {
  const overlayKey = resolveOverlayKey(blockType, parserBlockType, nodeLabel, overlayBorderMap, overlayBgMap);
  const normalizedBlockType = normalizeNativeLabel(blockType);
  const fallback = normalizedBlockType ? FALLBACK_OVERLAY_BY_BLOCK_TYPE[normalizedBlockType] : undefined;
  return {
    border: (overlayKey ? overlayBorderMap?.[overlayKey] : undefined) ?? fallback?.border,
    bg: (overlayKey ? overlayBgMap?.[overlayKey] : undefined) ?? fallback?.bg,
  };
}

