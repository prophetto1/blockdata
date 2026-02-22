import type { SchemaFieldMeta } from '@/lib/schema-fields';

const DEWRAP_PREFIX_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'he',
  'if',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'so',
  'the',
  'to',
  'we',
]);

export function stringifyDebugConfig(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (typeof currentValue === 'function') {
        return `[Function ${currentValue.name || 'anonymous'}]`;
      }
      if (typeof currentValue === 'symbol') {
        return currentValue.toString();
      }
      if (currentValue instanceof Set) {
        return Array.from(currentValue);
      }
      if (currentValue instanceof Map) {
        return Array.from(currentValue.entries());
      }
      if (typeof currentValue === 'object' && currentValue !== null) {
        if (seen.has(currentValue)) return '[Circular]';
        seen.add(currentValue);
      }
      return currentValue;
    },
    2,
  );
}

export function normalizeBlockContentForDisplay(value: unknown): string {
  if (typeof value !== 'string') return '';

  let text = value.replace(/\r\n?/g, '\n');
  text = text.replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, '$1-$2');
  text = text.replace(/\b([A-Za-z]{2})\s*\n\s*([A-Za-z]{2,})\b/g, (_match, left: string, right: string) => {
    return DEWRAP_PREFIX_STOP_WORDS.has(left.toLowerCase()) ? `${left} ${right}` : `${left}${right}`;
  });
  text = text.replace(/\b([A-Za-z]{3,})\s*\n\s*([A-Za-z]{1,2})(?=\s+[A-Z])/g, '$1$2');
  text = text.replace(/\s*\n\s*/g, ' ');
  text = text.replace(/\s{2,}/g, ' ').trim();

  return text;
}

export function parseEditedValue(value: unknown, meta: SchemaFieldMeta | undefined): unknown {
  if (value === null || value === undefined) return null;

  if (meta?.type === 'number') {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (meta?.type === 'boolean') {
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
  }

  if ((meta?.type === 'array' || meta?.type === 'object') && typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

export function prettyCellValue(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'string') return value || '--';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function parserNativeMetaFromLocator(locator: unknown): {
  parserBlockType: string | null;
  parserPath: string | null;
} {
  if (!locator || typeof locator !== 'object' || Array.isArray(locator)) {
    return { parserBlockType: null, parserPath: null };
  }
  const obj = locator as Record<string, unknown>;
  const parserBlockType = typeof obj.parser_block_type === 'string' ? obj.parser_block_type : null;
  const parserPath = typeof obj.parser_path === 'string'
    ? obj.parser_path
    : typeof obj.path === 'string'
      ? obj.path
      : typeof obj.pointer === 'string'
        ? obj.pointer
        : null;
  return { parserBlockType, parserPath };
}

export function extractPagesFromLocator(locator: unknown): number[] {
  if (!locator || typeof locator !== 'object' || Array.isArray(locator)) return [];
  const obj = locator as Record<string, unknown>;
  const pages = new Set<number>();

  const pageNosValue = obj.page_nos;
  if (Array.isArray(pageNosValue)) {
    for (const value of pageNosValue) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const page = Math.trunc(value);
      if (page > 0) pages.add(page);
    }
  }

  const singlePageValue = obj.page_no;
  if (pages.size === 0 && typeof singlePageValue === 'number' && Number.isFinite(singlePageValue)) {
    const page = Math.trunc(singlePageValue);
    if (page > 0) pages.add(page);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function formatPageLabels(pages: number[]): string | null {
  if (pages.length === 0) return null;
  return pages.map((page) => `p${page}`).join(', ');
}
