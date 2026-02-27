import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

type ProjectBootstrapRow = {
  project_id: string;
  project_name: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PROJECT_NAME = 'Default Project';
const DEFAULT_PROJECT_DESCRIPTION = 'Auto-created for new accounts';

function readFocusedProjectId(): string | null {
  try {
    const raw = window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeFocusedProjectId(id: string) {
  window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, JSON.stringify(id));
}

async function loadProjects(): Promise<ProjectBootstrapRow[]> {
  const { data, error } = await supabase
    .from(TABLES.projects)
    .select('project_id, project_name, workspace_id, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectBootstrapRow[];
}

export default function ProjectsHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let projects = await loadProjects();
      const focusedProjectId = readFocusedProjectId();

      if (projects.length === 0) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error('Not authenticated');

        const { data: createdProject, error: createError } = await supabase
          .from(TABLES.projects)
          .insert({
            owner_id: authData.user.id,
            workspace_id: crypto.randomUUID(),
            project_name: DEFAULT_PROJECT_NAME,
            description: DEFAULT_PROJECT_DESCRIPTION,
          })
          .select('project_id, project_name, workspace_id, created_at, updated_at')
          .single();

        if (createError) {
          const createErrorCode = (createError as { code?: string }).code ?? null;
          if (createErrorCode !== '23505') throw new Error(createError.message);
          projects = await loadProjects();
        } else {
          projects = [createdProject as ProjectBootstrapRow];
        }
      }

      if (projects.length === 0) {
        throw new Error('Unable to resolve a project for this account.');
      }

      const focusedProject = focusedProjectId
        ? projects.find((project) => project.project_id === focusedProjectId)
        : null;
      const defaultProject = projects.find(
        (project) => project.project_name.trim().toLowerCase() === DEFAULT_PROJECT_NAME.toLowerCase(),
      );
      const targetProject = focusedProject ?? defaultProject ?? projects[0];

      writeFocusedProjectId(targetProject.project_id);
      navigate(`/app/elt/${targetProject.project_id}`, { replace: true });
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : String(bootstrapError));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap, retryToken]);

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorAlert message={error} />
        <button
          type="button"
          className="w-fit rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
          onClick={() => setRetryToken((value) => value + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-center justify-center">
      <span className="text-sm text-muted-foreground">Resolving project...</span>
    </div>
  );
}
