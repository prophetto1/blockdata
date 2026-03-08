import type { FlowLabel, FlowListItem, FlowsSearchParams, FlowsSearchResult } from './flows.types';

const KESTRA_API_BASE = import.meta.env.VITE_KESTRA_API_URL ?? 'http://192.168.0.168:8088';
const KESTRA_AUTH = import.meta.env.VITE_KESTRA_AUTH
  ? String(import.meta.env.VITE_KESTRA_AUTH)
  : btoa('admin@kestra.io:Kestra2026');

type KestraFlowLabel = { key: string; value: string };
type KestraTrigger = { id: string; type: string; [k: string]: unknown };
type KestraFlowResult = {
  id: string;
  namespace: string;
  revision: number;
  updated: string | null;
  description: string | null;
  disabled: boolean;
  deleted: boolean;
  labels: KestraFlowLabel[];
  triggers: KestraTrigger[];
};
type KestraSearchResponse = {
  results: KestraFlowResult[];
  total: number;
};

function toFlowListItem(kf: KestraFlowResult): FlowListItem {
  return {
    routeId: `${kf.namespace}/${kf.id}`,
    flowId: kf.id,
    namespace: kf.namespace,
    labels: (kf.labels ?? []).map((l) => ({ key: l.key, value: l.value })),
    lastExecutionDate: null,
    lastExecutionStatus: null,
    executionStatistics: null,
    revision: kf.revision,
    updatedAt: kf.updated ?? null,
    description: kf.description ?? null,
    disabled: kf.disabled,
    triggerCount: (kf.triggers ?? []).length,
  };
}

export async function loadFlowsList(params: FlowsSearchParams = {}): Promise<FlowsSearchResult> {
  const { query, namespace, labels, page = 1, size = 25, sort, sortDir } = params;

  const url = new URL(`${KESTRA_API_BASE}/api/v1/flows/search`);
  url.searchParams.set('size', String(size));
  url.searchParams.set('page', String(page));
  if (query) url.searchParams.set('q', query);
  if (namespace) url.searchParams.set('namespace', namespace);
  if (sort) url.searchParams.set('sort', `${sort}:${sortDir ?? 'asc'}`);
  if (labels && labels.length > 0) {
    for (const l of labels) url.searchParams.append('labels', l);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${KESTRA_AUTH}` },
  });

  if (!res.ok) {
    throw new Error(`Kestra API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as KestraSearchResponse;
  return {
    results: data.results.map(toFlowListItem),
    total: data.total,
  };
}

export function formatLabelBadge(label: FlowLabel): string {
  return label.value ? `${label.key}:${label.value}` : label.key;
}
