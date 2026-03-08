import yaml from 'js-yaml';

export type FlowLabel = { key: string; value: string };

export type FlowInput = {
  id: string;
  type: string;
  required?: boolean;
  defaults?: string;
  description?: string;
};

export type FlowTask = {
  id: string;
  type: string;
  description?: string;
  [key: string]: unknown;
};

export type FlowConcurrency = {
  limit?: number;
  behavior?: string;
};

export type FlowRetry = {
  type?: 'constant' | 'exponential' | 'random';
  [key: string]: unknown;
};

export type FlowWorkerGroup = {
  fallback?: string;
  key?: string;
};

export type FlowDocument = {
  id: string;
  namespace: string;
  description?: string;
  labels?: FlowLabel[];
  inputs?: FlowInput[];
  tasks: FlowTask[];
  triggers?: unknown[];
  errors?: unknown[];
  finally?: unknown[];
  outputs?: unknown[];
  checks?: unknown[];
  concurrency?: FlowConcurrency;
  disabled?: boolean;
  retry?: FlowRetry;
  sla?: unknown[];
  variables?: Record<string, unknown>;
  workerGroup?: FlowWorkerGroup;
  pluginDefaults?: unknown[];
  afterExecution?: unknown[];
  _extra: Record<string, unknown>;
};

const KNOWN_KEYS = new Set([
  'id', 'namespace', 'description', 'labels', 'inputs', 'tasks',
  'triggers', 'errors', 'finally', 'outputs', 'checks',
  'concurrency', 'disabled', 'retry', 'sla', 'variables',
  'workerGroup', 'pluginDefaults', 'afterExecution',
]);

function toLabels(raw: unknown): FlowLabel[] | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, string> => item != null && typeof item === 'object')
      .map((item) => ({ key: String(item.key ?? ''), value: String(item.value ?? '') }));
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));
  }
  return undefined;
}

function fromLabels(labels: FlowLabel[] | undefined): Record<string, string> | undefined {
  if (!labels || labels.length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const { key, value } of labels) {
    if (key) out[key] = value;
  }
  return out;
}

function toInputs(raw: unknown): FlowInput[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? ''),
      type: String(item.type ?? 'STRING'),
      required: item.required === true ? true : undefined,
      defaults: item.defaults != null ? String(item.defaults) : undefined,
      description: item.description != null ? String(item.description) : undefined,
    }));
}

function toTasks(raw: unknown): FlowTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      ...item,
      id: String(item.id ?? ''),
      type: String(item.type ?? ''),
    })) as FlowTask[];
}

function toArray(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw;
}

function toConcurrency(raw: unknown): FlowConcurrency | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    limit: typeof obj.limit === 'number' ? obj.limit : undefined,
    behavior: typeof obj.behavior === 'string' ? obj.behavior : undefined,
  };
}

function toRetry(raw: unknown): FlowRetry | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  return { ...obj, type: typeof obj.type === 'string' ? obj.type.toLowerCase() as FlowRetry['type'] : undefined };
}

function toWorkerGroup(raw: unknown): FlowWorkerGroup | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    fallback: typeof obj.fallback === 'string' ? obj.fallback : undefined,
    key: typeof obj.key === 'string' ? obj.key : undefined,
  };
}

function toVariables(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return raw as Record<string, unknown>;
}

export function parseFlowYaml(source: string): FlowDocument | null {
  try {
    const raw = yaml.load(source);
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;

    const id = obj.id != null ? String(obj.id) : '';
    const namespace = obj.namespace != null ? String(obj.namespace) : '';
    const tasks = toTasks(obj.tasks);

    if (!id && !namespace && tasks.length === 0) return null;

    const _extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!KNOWN_KEYS.has(k)) _extra[k] = v;
    }

    return {
      id,
      namespace,
      description: obj.description != null ? String(obj.description) : undefined,
      labels: toLabels(obj.labels),
      inputs: toInputs(obj.inputs),
      tasks,
      triggers: toArray(obj.triggers),
      errors: toArray(obj.errors),
      finally: toArray(obj.finally),
      outputs: toArray(obj.outputs),
      checks: toArray(obj.checks),
      concurrency: toConcurrency(obj.concurrency),
      disabled: obj.disabled === true ? true : undefined,
      retry: toRetry(obj.retry),
      sla: toArray(obj.sla),
      variables: toVariables(obj.variables),
      workerGroup: toWorkerGroup(obj.workerGroup),
      pluginDefaults: toArray(obj.pluginDefaults),
      afterExecution: toArray(obj.afterExecution),
      _extra,
    };
  } catch {
    return null;
  }
}

export function serializeFlowDocument(doc: FlowDocument): string {
  const obj: Record<string, unknown> = {};

  obj.id = doc.id;
  obj.namespace = doc.namespace;
  if (doc.description != null && doc.description.length > 0) {
    obj.description = doc.description;
  }

  const serializedLabels = fromLabels(doc.labels);
  if (serializedLabels && Object.keys(serializedLabels).length > 0) {
    obj.labels = serializedLabels;
  }

  if (doc.inputs && doc.inputs.length > 0) {
    obj.inputs = doc.inputs.map((input) => {
      const out: Record<string, unknown> = { id: input.id, type: input.type };
      if (input.required) out.required = true;
      if (input.defaults != null) out.defaults = input.defaults;
      if (input.description != null) out.description = input.description;
      return out;
    });
  }

  obj.tasks = doc.tasks.map((task) => {
    const { id: taskId, type, description, ...rest } = task;
    const out: Record<string, unknown> = { id: taskId, type };
    if (description != null && description.length > 0) out.description = description;
    Object.assign(out, rest);
    return out;
  });

  if (doc.triggers && doc.triggers.length > 0) obj.triggers = doc.triggers;
  if (doc.errors && doc.errors.length > 0) obj.errors = doc.errors;
  if (doc.finally && doc.finally.length > 0) obj.finally = doc.finally;
  if (doc.outputs && doc.outputs.length > 0) obj.outputs = doc.outputs;
  if (doc.checks && doc.checks.length > 0) obj.checks = doc.checks;
  if (doc.concurrency) obj.concurrency = doc.concurrency;
  if (doc.disabled) obj.disabled = true;
  if (doc.retry) obj.retry = doc.retry;
  if (doc.sla && doc.sla.length > 0) obj.sla = doc.sla;
  if (doc.variables && Object.keys(doc.variables).length > 0) obj.variables = doc.variables;
  if (doc.workerGroup) obj.workerGroup = doc.workerGroup;
  if (doc.pluginDefaults && doc.pluginDefaults.length > 0) obj.pluginDefaults = doc.pluginDefaults;
  if (doc.afterExecution && doc.afterExecution.length > 0) obj.afterExecution = doc.afterExecution;

  for (const [k, v] of Object.entries(doc._extra)) {
    obj[k] = v;
  }

  return yaml.dump(obj, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}
