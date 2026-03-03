import { edgeFetch } from '@/lib/edge';

export type IntegrationCatalogSource = 'primary' | 'temp';

export type IntegrationCatalogItem = {
  item_id: string;
  source: string;
  external_id: string;
  plugin_name: string;
  plugin_title: string | null;
  plugin_group: string | null;
  plugin_version: string | null;
  categories: string[] | null;
  task_class: string;
  task_title: string | null;
  task_description: string | null;
  task_schema?: Record<string, unknown> | null;
  task_markdown?: string | null;
  enabled: boolean;
  mapped_service_id?: string | null;
  mapped_function_id?: string | null;
  mapping_notes?: string | null;
  source_updated_at: string | null;
  created_at: string | null;
};

export type IntegrationServiceOption = {
  service_id: string;
  service_type: string;
  service_name: string;
  base_url: string | null;
  enabled: boolean;
};

export type IntegrationFunctionOption = {
  function_id: string;
  service_id: string;
  function_name: string;
  function_type: string | null;
  label: string | null;
  entrypoint: string | null;
  enabled: boolean;
};

type CatalogResponse = {
  items?: unknown;
  services?: unknown;
  functions?: unknown;
};

export type LoadIntegrationCatalogResult = {
  items: IntegrationCatalogItem[];
  services: IntegrationServiceOption[];
  functions: IntegrationFunctionOption[];
};

export type UpdateCatalogItemPayload = {
  enabled?: boolean;
  mapped_service_id?: string | null;
  mapped_function_id?: string | null;
  mapping_notes?: string | null;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function readJsonResponse<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function loadIntegrationCatalog(
  source: IntegrationCatalogSource = 'primary',
  opts?: { includeSchema?: boolean },
): Promise<LoadIntegrationCatalogResult> {
  const params = new URLSearchParams();
  if (source === 'temp') params.set('catalog_source', 'temp');
  if (opts?.includeSchema) params.set('include', 'schema');
  const qs = params.toString() ? `?${params}` : '';
  const resp = await edgeFetch(`admin-integration-catalog${qs}`, { method: 'GET' });
  const payload = await readJsonResponse<CatalogResponse>(resp);
  return {
    items: asArray<IntegrationCatalogItem>(payload.items),
    services: asArray<IntegrationServiceOption>(payload.services),
    functions: asArray<IntegrationFunctionOption>(payload.functions),
  };
}

export async function updateIntegrationCatalogItem(
  itemId: string,
  patch: UpdateCatalogItemPayload,
  source: IntegrationCatalogSource = 'primary',
): Promise<void> {
  const qs = source === 'temp' ? '?catalog_source=temp' : '';
  const resp = await edgeFetch(`admin-integration-catalog${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: 'item',
      item_id: itemId,
      ...patch,
    }),
  });
  await readJsonResponse(resp);
}

export async function syncIntegrationCatalog(source: IntegrationCatalogSource = 'primary'): Promise<void> {
  const qs = source === 'temp' ? '?catalog_source=temp' : '';
  const resp = await edgeFetch(`admin-integration-catalog${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: 'sync_kestra',
      dry_run: false,
    }),
  });
  await readJsonResponse(resp);
}
