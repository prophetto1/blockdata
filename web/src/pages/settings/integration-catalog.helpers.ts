export function taskClassHoverText(
  taskDescription: string | null | undefined,
  taskTitle: string | null | undefined,
  taskClass: string,
): string {
  const description = typeof taskDescription === 'string' ? taskDescription.trim() : '';
  if (description) return description;

  const title = typeof taskTitle === 'string' ? taskTitle.trim() : '';
  if (title) return title;

  return taskClass;
}

type TaskSchemaSummary = {
  propertyKeys: string[];
  requiredKeys: string[];
  outputKeys: string[];
  definitionKeys: string[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function objectKeys(value: unknown): string[] {
  const objectValue = asObject(value);
  if (!objectValue) return [];
  return Object.keys(objectValue);
}

function outputKeys(value: unknown): string[] {
  const outputObject = asObject(value);
  if (outputObject) return Object.keys(outputObject);

  if (!Array.isArray(value)) return [];
  const keys: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      if (trimmed.length > 0) keys.push(trimmed);
      continue;
    }
    const objectEntry = asObject(entry);
    if (!objectEntry) continue;

    const name = objectEntry.name;
    const key = objectEntry.key;
    const id = objectEntry.id;
    const candidate = typeof name === 'string'
      ? name
      : typeof key === 'string'
      ? key
      : typeof id === 'string'
      ? id
      : '';
    const trimmed = candidate.trim();
    if (trimmed.length > 0) keys.push(trimmed);
  }

  return keys;
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function extractTaskSchemaSummary(schema: Record<string, unknown> | null | undefined): TaskSchemaSummary {
  const root = asObject(schema) ?? {};
  const propertyKeys = objectKeys(root.properties);
  const requiredKeys = toStringList(root.required);
  const definitionKeys = objectKeys(root.definitions);
  const defsKeys = objectKeys(root.$defs);
  const outputNames = outputKeys(root.outputs);

  return {
    propertyKeys: dedupePreserveOrder(propertyKeys),
    requiredKeys: dedupePreserveOrder(requiredKeys),
    outputKeys: dedupePreserveOrder(outputNames),
    definitionKeys: dedupePreserveOrder([...definitionKeys, ...defsKeys]),
  };
}

export function markdownPreview(markdown: string | null | undefined, maxLength = 120): string {
  if (typeof markdown !== 'string') return '';
  const normalized = markdown.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function compactListPreview(values: string[], visibleCount = 2): string {
  if (!Array.isArray(values) || values.length === 0) return 'none';
  const compact = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (compact.length === 0) return 'none';

  if (compact.length <= visibleCount) return compact.join(', ');
  const shown = compact.slice(0, visibleCount).join(', ');
  const remaining = compact.length - visibleCount;
  return `${shown} +${remaining}`;
}

export function buildTaskDetailSourceUrl(baseSourceUrl: string, taskClass: string): string | undefined {
  const base = typeof baseSourceUrl === 'string' ? baseSourceUrl.trim() : '';
  const cls = typeof taskClass === 'string' ? taskClass.trim() : '';
  if (!base || !cls) return undefined;
  return `${base.replace(/\/+$/, '')}/${encodeURIComponent(cls)}`;
}

export function showMappingColumnsForSource(source: 'primary' | 'temp'): boolean {
  return source !== 'temp';
}

export function showMetadataColumnsForSource(source: 'primary' | 'temp'): boolean {
  return source !== 'temp';
}
