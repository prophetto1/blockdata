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

/* ------------------------------------------------------------------ */
/*  Full task_schema parser                                            */
/* ------------------------------------------------------------------ */

export type TaskSchemaInput = {
  name: string;
  type: string;
  required: boolean;
  dynamic: boolean;
  default?: string;
  enum?: string[];
  description?: string;
  title?: string;
};

export type TaskSchemaOutput = {
  name: string;
  type: string;
  description?: string;
  title?: string;
};

export type TaskSchemaExample = {
  title: string;
  code: string;
  lang: string;
};

export type TaskSchemaMetric = {
  name: string;
  type: string;
  unit?: string;
  description?: string;
};

export type TaskSchemaDefinition = {
  name: string;
  propertyNames: string[];
};

export type ParsedTaskSchema = {
  title: string | null;
  description: string | null;
  deprecated: string | null;
  inputs: TaskSchemaInput[];
  outputs: TaskSchemaOutput[];
  examples: TaskSchemaExample[];
  metrics: TaskSchemaMetric[];
  definitions: TaskSchemaDefinition[];
  requiredInputNames: string[];
};

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function resolveType(prop: Record<string, unknown>): string {
  if (typeof prop.type === 'string') return prop.type;
  if (Array.isArray(prop.anyOf)) {
    const types = (prop.anyOf as Record<string, unknown>[])
      .map((a) => (typeof a.type === 'string' ? a.type : null))
      .filter(Boolean);
    const unique = [...new Set(types)];
    return unique.length > 0 ? unique.join(' | ') : 'unknown';
  }
  if (typeof prop.$ref === 'string') {
    const ref = prop.$ref as string;
    const last = ref.split('/').pop() ?? ref;
    return last.split('.').pop() ?? last;
  }
  return 'unknown';
}

export function parseTaskSchema(schema: Record<string, unknown> | null | undefined): ParsedTaskSchema {
  const empty: ParsedTaskSchema = {
    title: null,
    description: null,
    deprecated: null,
    inputs: [],
    outputs: [],
    examples: [],
    metrics: [],
    definitions: [],
    requiredInputNames: [],
  };

  const root = asObject(schema);
  if (!root) return empty;

  /* ---- properties (the task-level wrapper) ---- */
  const propsWrapper = asObject(root.properties);
  const title = propsWrapper ? str(propsWrapper.title) ?? null : null;
  const description = propsWrapper ? str(propsWrapper.description) ?? null : null;
  const deprecated = propsWrapper
    ? (typeof propsWrapper.$deprecated === 'string' ? propsWrapper.$deprecated : null)
    : null;

  /* ---- required input names ---- */
  const requiredInputNames = propsWrapper ? toStringList(propsWrapper.required) : [];

  /* ---- inputs: properties.properties ---- */
  const inputProps = propsWrapper ? asObject(propsWrapper.properties) : null;
  const inputs: TaskSchemaInput[] = [];
  if (inputProps) {
    for (const [name, raw] of Object.entries(inputProps)) {
      const prop = asObject(raw);
      if (!prop) continue;
      const enumVals = Array.isArray(prop.enum)
        ? (prop.enum as unknown[]).filter((v): v is string => typeof v === 'string')
        : undefined;
      inputs.push({
        name,
        type: resolveType(prop),
        required: prop.$required === true || requiredInputNames.includes(name),
        dynamic: prop.$dynamic === true,
        default: str(prop.default !== undefined ? String(prop.default) : undefined),
        enum: enumVals && enumVals.length > 0 ? enumVals : undefined,
        description: str(prop.description),
        title: str(prop.title),
      });
    }
  }

  /* ---- outputs ---- */
  const outputsWrapper = asObject(root.outputs);
  const outputProps = outputsWrapper ? asObject(outputsWrapper.properties) : null;
  const outputs: TaskSchemaOutput[] = [];
  if (outputProps) {
    for (const [name, raw] of Object.entries(outputProps)) {
      const prop = asObject(raw);
      if (!prop) continue;
      outputs.push({
        name,
        type: resolveType(prop),
        description: str(prop.description),
        title: str(prop.title),
      });
    }
  }

  /* ---- examples: properties.$examples ---- */
  const examples: TaskSchemaExample[] = [];
  if (propsWrapper && Array.isArray(propsWrapper.$examples)) {
    for (const raw of propsWrapper.$examples as unknown[]) {
      const ex = asObject(raw);
      if (!ex) continue;
      const code = str(ex.code);
      if (!code) continue;
      examples.push({
        title: str(ex.title) ?? '',
        code,
        lang: str(ex.lang) ?? 'yaml',
      });
    }
  }

  /* ---- metrics: properties.$metrics ---- */
  const metrics: TaskSchemaMetric[] = [];
  if (propsWrapper && Array.isArray(propsWrapper.$metrics)) {
    for (const raw of propsWrapper.$metrics as unknown[]) {
      const m = asObject(raw);
      if (!m || typeof m.name !== 'string') continue;
      metrics.push({
        name: m.name,
        type: str(m.type) ?? 'unknown',
        unit: str(m.unit),
        description: str(m.description),
      });
    }
  }

  /* ---- definitions ---- */
  const defsObj = asObject(root.definitions) ?? asObject(root.$defs);
  const definitions: TaskSchemaDefinition[] = [];
  if (defsObj) {
    for (const [name, raw] of Object.entries(defsObj)) {
      const def = asObject(raw);
      const defProps = def ? asObject(def.properties) : null;
      definitions.push({
        name,
        propertyNames: defProps ? Object.keys(defProps) : [],
      });
    }
  }

  return {
    title,
    description,
    deprecated,
    inputs,
    outputs,
    examples,
    metrics,
    definitions,
    requiredInputNames,
  };
}
