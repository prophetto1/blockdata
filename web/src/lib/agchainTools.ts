import { platformApiFetch } from '@/lib/platformApi';

export type JsonObject = Record<string, unknown>;
export type AgchainToolSourceKind = 'builtin' | 'custom' | 'bridged' | 'mcp_server';

export type AgchainToolRegistryRow = {
  tool_ref: string | null;
  tool_id: string | null;
  tool_name: string;
  display_name: string;
  description: string;
  source_kind: AgchainToolSourceKind;
  scope_kind: 'system' | 'project';
  read_only: boolean;
  approval_mode: string;
  latest_version: AgchainToolVersionDetail | null;
  updated_at: string | null;
};

export type AgchainToolVersionDetail = {
  tool_version_id: string;
  version_label: string;
  status: string;
  input_schema_jsonb?: JsonObject;
  output_schema_jsonb?: JsonObject;
  tool_config_jsonb?: JsonObject;
  parallel_calls_allowed?: boolean;
  discovered_tools?: Array<Record<string, unknown>>;
  last_discovery_validated_at?: string | null;
};

export type AgchainToolDetail = {
  tool_id: string;
  tool_ref: string | null;
  tool_name: string;
  display_name: string;
  description: string;
  source_kind: Exclude<AgchainToolSourceKind, 'builtin'>;
  approval_mode: string;
};

export type AgchainToolDetailResponse = {
  tool: AgchainToolDetail;
  latest_version: AgchainToolVersionDetail | null;
  versions: AgchainToolVersionDetail[];
};

export type AgchainToolListResponse = {
  items: AgchainToolRegistryRow[];
  next_cursor: string | null;
};

export type AgchainToolBootstrapResponse = {
  builtin_catalog: AgchainToolRegistryRow[];
  sandbox_profiles: Array<Record<string, unknown>>;
  source_kind_options: Array<Exclude<AgchainToolSourceKind, 'builtin'>>;
  secret_slot_contract: {
    value_kinds: string[];
  };
};

export type AgchainToolPreviewResponse = {
  normalized_definition: {
    source_kind: AgchainToolSourceKind;
    version_label?: string | null;
    parallel_calls_allowed?: boolean;
    tool_config_jsonb: JsonObject;
  };
  discovered_tools: Array<{
    server_tool_name: string;
    display_name: string;
    description: string;
    input_schema_jsonb: JsonObject;
    preview_tool_ref: string;
  }>;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  missing_secret_slots: Array<{
    slot_key: string;
    value_kind: string;
    default_secret_name_hint?: string | null;
  }>;
};

export type AgchainToolMutationPayload = {
  sourceKind: Exclude<AgchainToolSourceKind, 'builtin'>;
  toolName: string;
  displayName: string;
  description: string;
  approvalMode: string;
  versionLabel: string;
  inputSchemaJsonb: JsonObject;
  outputSchemaJsonb: JsonObject;
  toolConfigJsonb: JsonObject;
  parallelCallsAllowed: boolean;
};

type ToolWriteResponse = {
  tool: AgchainToolRegistryRow;
  latest_version: AgchainToolVersionDetail | null;
  versions: AgchainToolVersionDetail[];
};

type ToolVersionResponse = {
  tool_version: AgchainToolVersionDetail;
};

type ToolPublishResponse = {
  tool: AgchainToolRegistryRow;
  tool_version: AgchainToolVersionDetail;
};

async function readErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { detail?: unknown; error?: unknown; message?: unknown }
    | null;
  if (payload && typeof payload.detail === 'string') return payload.detail;
  if (payload && typeof payload.error === 'string') return payload.error;
  if (payload && typeof payload.message === 'string') return payload.message;
  return `HTTP ${response.status}`;
}

async function requireOk(response: Response): Promise<Response> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const okResponse = await requireOk(response);
  return okResponse.json() as Promise<T>;
}

export async function listAgchainTools(
  projectId: string,
  params: {
    source_kind?: string | null;
    include_archived?: boolean;
    cursor?: string | null;
  } = {},
): Promise<AgchainToolListResponse> {
  const searchParams = new URLSearchParams({ project_id: projectId });
  if (params.source_kind) searchParams.set('source_kind', params.source_kind);
  if (typeof params.include_archived === 'boolean') {
    searchParams.set('include_archived', String(params.include_archived));
  }
  if (params.cursor) searchParams.set('cursor', params.cursor);
  return parseJsonResponse<AgchainToolListResponse>(
    await platformApiFetch(`/agchain/tools?${searchParams.toString()}`),
  );
}

export async function fetchAgchainToolsBootstrap(projectId: string): Promise<AgchainToolBootstrapResponse> {
  const params = new URLSearchParams({ project_id: projectId });
  return parseJsonResponse<AgchainToolBootstrapResponse>(
    await platformApiFetch(`/agchain/tools/new/bootstrap?${params.toString()}`),
  );
}

export async function previewAgchainTool(
  projectId: string,
  sourceKind: Exclude<AgchainToolSourceKind, 'builtin'>,
  draft: Record<string, unknown>,
): Promise<AgchainToolPreviewResponse> {
  return parseJsonResponse<AgchainToolPreviewResponse>(
    await platformApiFetch('/agchain/tools/new/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        source_kind: sourceKind,
        draft,
      }),
    }),
  );
}

export async function fetchAgchainToolDetail(projectId: string, toolId: string): Promise<AgchainToolDetailResponse> {
  const params = new URLSearchParams({ project_id: projectId });
  return parseJsonResponse<AgchainToolDetailResponse>(
    await platformApiFetch(`/agchain/tools/${toolId}/detail?${params.toString()}`),
  );
}

export async function createAgchainTool(
  projectId: string,
  payload: AgchainToolMutationPayload,
): Promise<ToolWriteResponse> {
  return parseJsonResponse<ToolWriteResponse>(
    await platformApiFetch('/agchain/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        tool: {
          tool_name: payload.toolName,
          display_name: payload.displayName,
          description: payload.description,
          source_kind: payload.sourceKind,
          approval_mode: payload.approvalMode,
        },
        initial_version: {
          version_label: payload.versionLabel,
          input_schema_jsonb: payload.inputSchemaJsonb,
          output_schema_jsonb: payload.outputSchemaJsonb,
          tool_config_jsonb: payload.toolConfigJsonb,
          parallel_calls_allowed: payload.parallelCallsAllowed,
          status: 'draft',
        },
      }),
    }),
  );
}

export async function updateAgchainToolMetadata(
  projectId: string,
  toolId: string,
  payload: Pick<AgchainToolMutationPayload, 'displayName' | 'description' | 'approvalMode'>,
) {
  return parseJsonResponse<{ tool: AgchainToolDetail }>(
    await platformApiFetch(`/agchain/tools/${toolId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        display_name: payload.displayName,
        description: payload.description,
        approval_mode: payload.approvalMode,
        sandbox_requirement_jsonb: {},
      }),
    }),
  );
}

export async function updateAgchainToolVersion(
  projectId: string,
  toolId: string,
  toolVersionId: string,
  payload: Pick<
    AgchainToolMutationPayload,
    'versionLabel' | 'inputSchemaJsonb' | 'outputSchemaJsonb' | 'toolConfigJsonb' | 'parallelCallsAllowed'
  >,
): Promise<ToolVersionResponse> {
  return parseJsonResponse<ToolVersionResponse>(
    await platformApiFetch(`/agchain/tools/${toolId}/versions/${toolVersionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        version_label: payload.versionLabel,
        input_schema_jsonb: payload.inputSchemaJsonb,
        output_schema_jsonb: payload.outputSchemaJsonb,
        tool_config_jsonb: payload.toolConfigJsonb,
        parallel_calls_allowed: payload.parallelCallsAllowed,
      }),
    }),
  );
}

export async function publishAgchainToolVersion(projectId: string, toolId: string, toolVersionId: string) {
  return parseJsonResponse<ToolPublishResponse>(
    await platformApiFetch(`/agchain/tools/${toolId}/versions/${toolVersionId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    }),
  );
}

export async function archiveAgchainTool(projectId: string, toolId: string) {
  return parseJsonResponse<{ tool: AgchainToolDetail }>(
    await platformApiFetch(`/agchain/tools/${toolId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    }),
  );
}
