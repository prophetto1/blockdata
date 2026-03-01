/* ------------------------------------------------------------------ */
/*  ServicesPanel — API layer (zero React dependency)                  */
/* ------------------------------------------------------------------ */

import { edgeFetch } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import type {
  AdminServicesResponse,
  FunctionDraft,
  ServiceDraft,
  ServiceTypeRow,
} from './services-panel.types';
import { isPlainRecord, parseJsonTextarea, parseTagsText } from './services-panel.types';

/* ------------------------------------------------------------------ */
/*  Generic mutation executor                                          */
/* ------------------------------------------------------------------ */

type MutationResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

async function servicesMutation(
  method: 'POST' | 'PATCH' | 'DELETE',
  body: Record<string, unknown>,
): Promise<MutationResult> {
  try {
    const resp = await edgeFetch('admin-services', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      // Keep raw fallback.
    }
    if (!resp.ok) {
      throw new Error(
        (payload.error as string) ?? text ?? `HTTP ${resp.status}`,
      );
    }
    return { ok: true, payload };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ------------------------------------------------------------------ */
/*  Data loading                                                       */
/* ------------------------------------------------------------------ */

export async function loadAllServices(): Promise<
  | { ok: true; data: AdminServicesResponse }
  | { ok: false; error: string }
> {
  try {
    const resp = await edgeFetch('admin-services', { method: 'GET' });
    const text = await resp.text();
    let payload: AdminServicesResponse | { error?: string } = {};
    try {
      payload = text
        ? (JSON.parse(text) as AdminServicesResponse)
        : (payload as AdminServicesResponse);
    } catch {
      // Keep raw fallback.
    }
    if (!resp.ok) {
      const errPayload = payload as { error?: string };
      throw new Error(errPayload.error ?? text ?? `HTTP ${resp.status}`);
    }
    const data = payload as AdminServicesResponse;
    return {
      ok: true,
      data: {
        superuser: data.superuser,
        service_types: Array.isArray(data.service_types)
          ? data.service_types
          : [],
        services: Array.isArray(data.services) ? data.services : [],
        functions: Array.isArray(data.functions) ? data.functions : [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ------------------------------------------------------------------ */
/*  Service mutations                                                  */
/* ------------------------------------------------------------------ */

export async function toggleServiceEnabled(
  serviceId: string,
  enabled: boolean,
): Promise<MutationResult> {
  return servicesMutation('PATCH', {
    target: 'service',
    service_id: serviceId,
    enabled,
  });
}

export async function saveService(
  serviceId: string,
  draft: ServiceDraft,
): Promise<MutationResult> {
  const parsedConfig = parseJsonTextarea(draft.configText);
  if (
    !parsedConfig.ok ||
    typeof parsedConfig.value !== 'object' ||
    parsedConfig.value === null ||
    Array.isArray(parsedConfig.value)
  ) {
    return {
      ok: false,
      error: `Service config JSON must be an object${
        parsedConfig.ok ? '' : `: ${parsedConfig.error}`
      }.`,
    };
  }
  if (
    !draft.base_url.trim() ||
    !draft.service_name.trim() ||
    !draft.service_type.trim()
  ) {
    return {
      ok: false,
      error: 'Service type, service name, and base URL are required.',
    };
  }
  return servicesMutation('PATCH', {
    target: 'service',
    service_id: serviceId,
    service_type: draft.service_type.trim(),
    service_name: draft.service_name.trim(),
    base_url: draft.base_url.trim(),
    health_status: draft.health_status,
    enabled: draft.enabled,
    config: parsedConfig.value,
  });
}

export async function deleteService(
  serviceId: string,
): Promise<MutationResult> {
  return servicesMutation('DELETE', {
    target: 'service',
    service_id: serviceId,
  });
}

export async function createService(
  draft: ServiceDraft,
  _serviceTypes: ServiceTypeRow[],
): Promise<MutationResult> {
  const parsedConfig = parseJsonTextarea(draft.configText);
  if (
    !parsedConfig.ok ||
    typeof parsedConfig.value !== 'object' ||
    parsedConfig.value === null ||
    Array.isArray(parsedConfig.value)
  ) {
    return {
      ok: false,
      error: `Service config JSON must be an object${
        parsedConfig.ok ? '' : `: ${parsedConfig.error}`
      }.`,
    };
  }
  if (
    !draft.service_type.trim() ||
    !draft.service_name.trim() ||
    !draft.base_url.trim()
  ) {
    return {
      ok: false,
      error: 'Service type, service name, and base URL are required.',
    };
  }
  return servicesMutation('POST', {
    target: 'service',
    service_type: draft.service_type.trim(),
    service_name: draft.service_name.trim(),
    base_url: draft.base_url.trim(),
    health_status: draft.health_status,
    enabled: draft.enabled,
    config: parsedConfig.value,
  });
}

/* ------------------------------------------------------------------ */
/*  Function mutations                                                 */
/* ------------------------------------------------------------------ */

export async function toggleFunctionEnabled(
  functionId: string,
  enabled: boolean,
): Promise<MutationResult> {
  return servicesMutation('PATCH', {
    target: 'function',
    function_id: functionId,
    enabled,
  });
}

export async function saveFunction(
  functionId: string,
  draft: FunctionDraft,
): Promise<MutationResult> {
  if (
    !draft.function_name.trim() ||
    !draft.label.trim() ||
    !draft.entrypoint.trim()
  ) {
    return {
      ok: false,
      error: 'Function name, label, and entrypoint are required.',
    };
  }
  return servicesMutation('PATCH', {
    target: 'function',
    function_id: functionId,
    function_name: draft.function_name.trim(),
    function_type: draft.function_type,
    label: draft.label.trim(),
    description: draft.description.trim() || null,
    entrypoint: draft.entrypoint.trim(),
    http_method: draft.http_method,
    enabled: draft.enabled,
    tags: parseTagsText(draft.tagsText),
  });
}

export async function deleteFunction(
  functionId: string,
): Promise<MutationResult> {
  return servicesMutation('DELETE', {
    target: 'function',
    function_id: functionId,
  });
}

export async function createFunction(
  serviceId: string,
  draft: FunctionDraft,
): Promise<MutationResult> {
  if (
    !draft.function_name.trim() ||
    !draft.label.trim() ||
    !draft.entrypoint.trim()
  ) {
    return {
      ok: false,
      error: 'Function name, label, and entrypoint are required.',
    };
  }
  return servicesMutation('POST', {
    target: 'function',
    service_id: serviceId,
    function_name: draft.function_name.trim(),
    function_type: draft.function_type,
    label: draft.label.trim(),
    description: draft.description.trim() || null,
    entrypoint: draft.entrypoint.trim(),
    http_method: draft.http_method,
    enabled: draft.enabled,
    tags: parseTagsText(draft.tagsText),
  });
}

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

export async function importRegistryJson(
  rawText: string,
): Promise<MutationResult> {
  const parsed = parseJsonTextarea(rawText);
  if (!parsed.ok) {
    return { ok: false, error: `Invalid JSON file: ${parsed.error}` };
  }

  let payload: Record<string, unknown> = {};
  if (Array.isArray(parsed.value)) {
    payload = { plugins: parsed.value };
  } else if (isPlainRecord(parsed.value)) {
    payload = parsed.value;
  } else {
    return {
      ok: false,
      error: 'Import JSON must be an object or an array of plugins.',
    };
  }

  return servicesMutation('POST', {
    target: 'import_registry',
    import_mode: 'upsert',
    ...payload,
  });
}

/* ------------------------------------------------------------------ */
/*  Real-time subscription                                             */
/* ------------------------------------------------------------------ */

export function subscribeToServiceChanges(
  onChangeCallback: () => void,
): { unsubscribe: () => void } {
  const channel = supabase
    .channel('admin-services-registry')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_registry' },
      () => onChangeCallback(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_functions' },
      () => onChangeCallback(),
    )
    .subscribe();

  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}
