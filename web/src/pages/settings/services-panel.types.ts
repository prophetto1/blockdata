/* ------------------------------------------------------------------ */
/*  ServicesPanel — shared types, constants, and pure helpers           */
/* ------------------------------------------------------------------ */

export type ServiceRow = {
  service_id: string;
  service_type: string;
  service_name: string;
  base_url: string;
  health_status: string;
  last_heartbeat: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  description: string | null;
  auth_type: string;
  auth_config: Record<string, unknown>;
  docs_url: string | null;
  primary_stage: string | null;
  created_at: string;
  updated_at: string;
};

export type ParamDef = {
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  description?: string;
  values?: string[];
};

export type ServiceFunctionRow = {
  function_id: string;
  service_id: string;
  function_name: string;
  function_type: string;
  bd_stage: string;
  label: string;
  description: string | null;
  long_description: string | null;
  entrypoint: string;
  http_method: string;
  content_type: string;
  parameter_schema: ParamDef[];
  result_schema: Record<string, unknown> | null;
  enabled: boolean;
  tags: string[] | null;
  auth_type: string | null;
  auth_config: Record<string, unknown> | null;
  request_example: Record<string, unknown> | null;
  response_example: Record<string, unknown> | null;
  examples: unknown[];
  metrics: unknown[];
  when_to_use: string | null;
  provider_docs_url: string | null;
  deprecated: boolean;
  beta: boolean;
  source_task_class: string | null;
  plugin_group: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceTypeRow = {
  service_type: string;
  label: string;
  description: string | null;
};

export type AdminServicesResponse = {
  superuser: { user_id: string; email: string };
  service_types: ServiceTypeRow[];
  services: ServiceRow[];
  functions: ServiceFunctionRow[];
};

export type ServiceDraft = {
  service_type: string;
  service_name: string;
  base_url: string;
  health_status: string;
  enabled: boolean;
  configText: string;
};

export type FunctionDraft = {
  function_name: string;
  function_type: string;
  label: string;
  description: string;
  entrypoint: string;
  http_method: string;
  tagsText: string;
  enabled: boolean;
};

export type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  conversion: 'Conversion',
  custom: 'Custom',
  dbt: 'dbt (Transform)',
  dlt: 'dlt (Load)',
  docling: 'Docling (Parse)',
  edge: 'Edge Functions',
  integration: 'Integration',
  notification: 'Notifications',
  'pipeline-worker': 'Pipeline Worker',
} as const;

export function getServiceTypeLabel(type: string): string {
  return SERVICE_TYPE_LABELS[type] ?? type;
}

export const FUNCTION_TYPE_OPTIONS = [
  'source', 'destination', 'transform', 'parse', 'convert',
  'export', 'test', 'utility', 'macro', 'custom', 'ingest', 'callback', 'flow',
] as const;

export const HTTP_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

export const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function parseJsonTextarea(
  input: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}

export function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseTagsText(input: string): string[] {
  return input
    .split(',')
    .map((v) => v.trim())
    .filter((v, i, all) => v.length > 0 && all.indexOf(v) === i);
}

export function serviceToDraft(row: ServiceRow): ServiceDraft {
  return {
    service_type: row.service_type,
    service_name: row.service_name,
    base_url: row.base_url,
    health_status: row.health_status,
    enabled: row.enabled,
    configText: stringifyValue(row.config ?? {}),
  };
}

export function functionToDraft(row: ServiceFunctionRow): FunctionDraft {
  return {
    function_name: row.function_name,
    function_type: row.function_type,
    label: row.label,
    description: row.description ?? '',
    entrypoint: row.entrypoint,
    http_method: row.http_method,
    tagsText: (row.tags ?? []).join(', '),
    enabled: row.enabled,
  };
}

export function emptyFunctionDraft(): FunctionDraft {
  return {
    function_name: '',
    function_type: 'utility',
    label: '',
    description: '',
    entrypoint: '',
    http_method: 'POST',
    tagsText: '',
    enabled: true,
  };
}
