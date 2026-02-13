import { useCallback, useEffect, useMemo, useState } from 'react';
import { edgeJson } from '@/lib/edge';
import type { AgentCatalogRow, UserAgentConfigRow, UserApiKeyRow } from '@/lib/types';

export type ProviderConnectionView = {
  provider: string;
  connection_type: string;
  status: 'connected' | 'disconnected' | 'error';
  metadata_jsonb: Record<string, unknown>;
};

export type AgentReadiness = {
  is_ready: boolean;
  reasons: string[];
};

export type AgentConfigGetResponse = {
  catalog: AgentCatalogRow[];
  configs: UserAgentConfigRow[];
  readiness: Record<string, AgentReadiness>;
  default_agent_slug: string | null;
  user_api_keys: Pick<UserApiKeyRow, 'provider' | 'key_suffix' | 'is_valid' | 'base_url'>[];
  provider_connections: ProviderConnectionView[];
};

export type AgentConfigSaveInput = {
  agent_slug: string;
  keyword?: string;
  model?: string;
  mode?: string | null;
  mcp_server_ids?: string[];
  config_jsonb?: Record<string, unknown>;
  is_default?: boolean;
};

export function useAgentConfigs() {
  const [data, setData] = useState<AgentConfigGetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await edgeJson<AgentConfigGetResponse>('agent-config', { method: 'GET' });
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveConfig = useCallback(
    async (input: AgentConfigSaveInput) => {
      const resp = await edgeJson<{ ok: boolean; is_ready: boolean; config: UserAgentConfigRow }>('agent-config', {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      await reload();
      return resp;
    },
    [reload],
  );

  const catalogBySlug = useMemo(() => {
    const map = new Map<string, AgentCatalogRow>();
    for (const row of data?.catalog ?? []) map.set(row.agent_slug, row);
    return map;
  }, [data?.catalog]);

  const configBySlug = useMemo(() => {
    const map = new Map<string, UserAgentConfigRow>();
    for (const row of data?.configs ?? []) map.set(row.agent_slug, row);
    return map;
  }, [data?.configs]);

  const keyByProvider = useMemo(() => {
    const map = new Map<string, Pick<UserApiKeyRow, 'provider' | 'key_suffix' | 'is_valid' | 'base_url'>>();
    for (const row of data?.user_api_keys ?? []) map.set(row.provider, row);
    return map;
  }, [data?.user_api_keys]);

  const connectionsByProvider = useMemo(() => {
    const map = new Map<string, ProviderConnectionView[]>();
    for (const row of data?.provider_connections ?? []) {
      const list = map.get(row.provider) ?? [];
      list.push(row);
      map.set(row.provider, list);
    }
    return map;
  }, [data?.provider_connections]);

  return {
    data,
    loading,
    error,
    reload,
    saveConfig,
    catalogBySlug,
    configBySlug,
    keyByProvider,
    connectionsByProvider,
  };
}

