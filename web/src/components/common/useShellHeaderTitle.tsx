import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import './ShellHeaderTitle.css';

type ShellHeaderTitleInput = {
  title: ReactNode;
  subtitle?: ReactNode;
};

const DEFAULT_PROJECT_NAME = 'Default Project';

const projectNameCache = new Map<string, string>();
const projectNameRequests = new Map<string, Promise<string | null>>();

function toTitleCase(value: string): string {
  if (!value) return '';
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveMenuLevelOne(pathname: string): string {
  if (pathname.startsWith('/app/flows')) return 'Flows';
  if (pathname.startsWith('/app/projects/list')) return 'Database';
  if (
    pathname.startsWith('/app/projects')
    || pathname.startsWith('/app/upload')
    || pathname.startsWith('/app/extract')
    || pathname.startsWith('/app/transform')
    || pathname.startsWith('/app/documents')
  ) {
    return 'Documents';
  }
  if (pathname.startsWith('/app/schemas')) return 'Schema';
  if (pathname.startsWith('/app/settings') || pathname.startsWith('/app/superuser')) return 'Settings';
  if (pathname.startsWith('/app/agents') || pathname.startsWith('/app/agent-onboarding')) return 'Agents';
  if (pathname.startsWith('/app/experiments')) return 'Experiments';
  if (pathname.startsWith('/app/mcp')) return 'MCP';

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'app' && segments[1]) return toTitleCase(segments[1]);
  return 'BlockData';
}

function resolveRouteProjectId(pathname: string): string | null {
  if (pathname.startsWith('/app/projects/list')) return null;

  const match = pathname.match(/^\/app\/(?:projects|extract|transform|flows)\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  return match[1] ?? null;
}

async function fetchProjectName(projectId: string): Promise<string | null> {
  const cached = projectNameCache.get(projectId);
  if (cached) return cached;

  const pending = projectNameRequests.get(projectId);
  if (pending) return pending;

  const request = supabase
    .from(TABLES.projects)
    .select('project_name')
    .eq('project_id', projectId)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) return null;
      const nextProjectName = String((data as { project_name?: string } | null)?.project_name ?? '').trim();
      if (!nextProjectName) return null;
      projectNameCache.set(projectId, nextProjectName);
      return nextProjectName;
    })
    .catch(() => null)
    .finally(() => {
      projectNameRequests.delete(projectId);
    });

  projectNameRequests.set(projectId, request);
  return request;
}

export function useShellHeaderTitle({ title, subtitle }: ShellHeaderTitleInput) {
  const { setCenter } = useHeaderCenter();
  const location = useLocation();
  const [projectName, setProjectName] = useState<string>(DEFAULT_PROJECT_NAME);

  const menuLevelOne = useMemo(
    () => resolveMenuLevelOne(location.pathname),
    [location.pathname],
  );

  const autoSubtitle = useMemo(
    () => `${projectName}/${menuLevelOne}`,
    [menuLevelOne, projectName],
  );

  const explicitSubtitle = useMemo(
    () => (typeof subtitle === 'string' ? subtitle : null),
    [subtitle],
  );

  const resolvedSubtitle = useMemo(() => {
    if (!location.pathname.startsWith('/app/')) return explicitSubtitle ?? autoSubtitle;
    return autoSubtitle;
  }, [autoSubtitle, explicitSubtitle, location.pathname]);

  useEffect(() => {
    const routeProjectId = resolveRouteProjectId(location.pathname);
    const focusedProjectId = typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
    const projectId = routeProjectId ?? focusedProjectId;

    if (!projectId) {
      setProjectName(DEFAULT_PROJECT_NAME);
      return undefined;
    }

    const cached = projectNameCache.get(projectId);
    if (cached) {
      setProjectName(cached);
      return undefined;
    }

    let cancelled = false;
    void fetchProjectName(projectId).then((resolvedProjectName) => {
      if (cancelled) return;
      setProjectName(resolvedProjectName ?? DEFAULT_PROJECT_NAME);
    });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const centerNode = useMemo(
    () => (
      <div className="shell-header-title">
        {resolvedSubtitle ? (
          <span
            className="shell-header-title-subtitle"
            title={resolvedSubtitle}
          >
            {resolvedSubtitle}
          </span>
        ) : null}
        <span
          className="shell-header-title-main"
          title={typeof title === 'string' ? title : undefined}
        >
          {title}
        </span>
      </div>
    ),
    [resolvedSubtitle, title],
  );

  useEffect(() => {
    setCenter(centerNode);
    return () => setCenter(null);
  }, [centerNode, setCenter]);
}
