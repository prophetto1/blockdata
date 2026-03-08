import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PROJECT_FOCUS_STORAGE_KEY,
  PROJECT_LIST_CHANGED_EVENT,
  readFocusedProjectId,
} from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

export type ProjectOption = {
  value: string;
  label: string;
  docCount: number;
  workspaceId: string | null;
};

const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isMissingRpcError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    /could not find the function/i.test(error.message ?? '') ||
    /function .* does not exist/i.test(error.message ?? '')
  );
}

export function useProjectFocus() {
  const location = useLocation();
  const activeProjectMatch = location.pathname.match(/^\/app\/elt\/([^/]+)/);
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null;

  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(() => readFocusedProjectId());
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Persist focused project
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedProjectId = activeProjectId ?? focusedProjectId;
    if (persistedProjectId) {
      window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, persistedProjectId);
      return;
    }
    window.localStorage.removeItem(PROJECT_FOCUS_STORAGE_KEY);
  }, [activeProjectId, focusedProjectId]);

  const loadProjectOptions = useCallback(async () => {
    setLoading(true);

    const rpcParams = {
      p_search: null,
      p_status: 'all',
      p_limit: 200,
      p_offset: 0,
    };

    let rows: Array<Record<string, unknown>> = [];
    let { data, error } = await supabase.rpc(PROJECTS_RPC_NEW, rpcParams);

    if (error && isMissingRpcError(error)) {
      const fallback = await supabase.rpc(PROJECTS_RPC_LEGACY, rpcParams);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      const fallbackProjects = await supabase
        .from(TABLES.projects)
        .select('project_id, project_name')
        .order('project_name', { ascending: true });

      if (fallbackProjects.error) {
        setProjectOptions([]);
        setLoading(false);
        return;
      }

      rows = ((fallbackProjects.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        doc_count: 0,
      }));
    } else {
      rows = (data ?? []) as Array<Record<string, unknown>>;
    }

    const nextOptions = rows
      .map((row) => ({
        value: String(row.project_id ?? ''),
        label: String(row.project_name ?? 'Untitled project'),
        docCount: toCount(row.doc_count),
        workspaceId: row.workspace_id ? String(row.workspace_id) : null,
      }))
      .filter((row) => row.value.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    setProjectOptions(nextOptions);
    setLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    void loadProjectOptions();
  }, [loadProjectOptions]);

  // Reload on project list changed event
  useEffect(() => {
    const handler = (e: Event) => {
      const focusId = (e as CustomEvent).detail?.focusProjectId;
      setFocusedProjectId(focusId ?? null);
      void loadProjectOptions();
    };
    window.addEventListener(PROJECT_LIST_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_LIST_CHANGED_EVENT, handler);
  }, [loadProjectOptions]);

  useEffect(() => {
    if (activeProjectId) return;
    if (focusedProjectId) return;
    if (projectOptions.length === 0) return;
    setFocusedProjectId(projectOptions[0]!.value);
  }, [activeProjectId, focusedProjectId, projectOptions]);

  const resolvedProjectId = useMemo(() => {
    const candidate = activeProjectId ?? focusedProjectId ?? projectOptions[0]?.value ?? null;
    if (!candidate) return null;
    return projectOptions.some((p) => p.value === candidate) ? candidate : null;
  }, [activeProjectId, focusedProjectId, projectOptions]);

  const resolvedProjectName = useMemo(() => {
    if (!resolvedProjectId) return null;
    return projectOptions.find((p) => p.value === resolvedProjectId)?.label ?? null;
  }, [resolvedProjectId, projectOptions]);

  return {
    projectOptions,
    loading,
    focusedProjectId,
    setFocusedProjectId,
    activeProjectId,
    resolvedProjectId,
    resolvedProjectName,
    reload: loadProjectOptions,
  };
}
