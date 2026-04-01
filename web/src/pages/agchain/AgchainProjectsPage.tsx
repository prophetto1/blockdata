import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AgchainProjectCreateDialog } from '@/components/agchain/AgchainProjectCreateDialog';
import {
  broadcastAgchainProjectListChanged,
  setStoredAgchainWorkspaceFocus,
} from '@/lib/agchainProjectFocus';
import {
  createAgchainProject,
  fetchAgchainProjects,
  type AgchainProjectCreateRequest,
  type AgchainProjectRow,
} from '@/lib/agchainWorkspaces';
import { AgchainPageFrame } from './AgchainPageFrame';

function overviewPathForProject(projectSlug: string) {
  return `/app/agchain/overview?project=${encodeURIComponent(projectSlug)}`;
}

export default function AgchainProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createOpen = searchParams.get('new') === '1';
  const [items, setItems] = useState<AgchainProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchAgchainProjects();
        if (!cancelled) {
          setItems(response.items);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load AGChain projects.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  function setCreateOpen(open: boolean) {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set('new', '1');
    } else {
      next.delete('new');
    }
    setSearchParams(next, { replace: !open });
  }

  async function handleCreateProject(payload: AgchainProjectCreateRequest) {
    setCreating(true);
    setError(null);
    try {
      const result = await createAgchainProject({
        ...payload,
        seed_initial_benchmark: true,
        initial_benchmark_name: payload.project_name,
      });
      setStoredAgchainWorkspaceFocus({
        focusedProjectId: result.project_id,
        focusedProjectSlug: result.project_slug,
      });
      broadcastAgchainProjectListChanged({
        focusedProjectId: result.project_id,
        focusedProjectSlug: result.project_slug,
      });
      setCreateOpen(false);
      navigate(overviewPathForProject(result.project_slug));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create AGChain project.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <AgchainPageFrame className="gap-6 py-8">
      <header className="flex flex-col gap-2" data-testid="agchain-projects-page">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          AGChain Projects
        </p>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Projects and evaluations</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Project is the shared workspace parent for benchmarks, datasets, traces, prompts, scorers, tools, runs,
            and results. Choose or create the workspace that the rest of the AGChain shell will scope itself around.
          </p>
        </div>
        {!createOpen ? (
          <div className="pt-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create Project
            </Button>
          </div>
        ) : null}
      </header>
      <AgchainProjectCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        creating={creating}
        error={error}
        onCreate={handleCreateProject}
      />
      <section className="rounded-3xl border border-border/70 bg-card/70 shadow-sm">
        <div className="border-b border-border/70 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Project registry</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each row anchors one AGChain workspace. Benchmarks remain child resources under the selected project.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Slug</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Primary benchmark</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-6 py-8 text-muted-foreground" colSpan={5}>
                    Loading AGChain project workspaces...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-muted-foreground" colSpan={5}>
                    No AGChain project workspaces have been created yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.project_id} className="border-t border-border/60 align-top">
                    <td className="px-6 py-4 font-medium text-foreground">{item.project_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.project_slug}</td>
                    <td className="max-w-sm px-6 py-4 text-muted-foreground">{item.description}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.primary_benchmark_name ?? item.primary_benchmark_slug ?? 'Not seeded yet'}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                        href={overviewPathForProject(item.project_slug)}
                      >
                        Open Project
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AgchainPageFrame>
  );
}
