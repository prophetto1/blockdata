import { useEffect, useMemo, useState } from 'react';
import { PaginationRoot, PaginationPrevTrigger, PaginationNextTrigger, PaginationItem, PaginationEllipsis, PaginationContext } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SegmentGroupRoot,
  SegmentGroupIndicator,
  SegmentGroupItem,
  SegmentGroupItemText,
  SegmentGroupItemHiddenInput,
} from '@/components/ui/segment-group';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconFolder,
  IconFolderPlus,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { ProjectOverviewRow, ProjectRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { notifyProjectListChanged } from '@/lib/projectFocus';
import { cn } from '@/lib/utils';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';

type StatusFilter = 'all' | 'active' | 'processing' | 'empty';

const PAGE_SIZE = 12;
const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';
let projectsRpcName: typeof PROJECTS_RPC_NEW | typeof PROJECTS_RPC_LEGACY = PROJECTS_RPC_NEW;

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
}

function isMissingRpcError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    /could not find the function/i.test(error.message ?? '') ||
    /function .* does not exist/i.test(error.message ?? '')
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 250);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldOpenNewModal = searchParams.get('new') === '1';
  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  const openCreateModal = () => {
    if (!shouldOpenNewModal) {
      const next = new URLSearchParams(searchParams);
      next.set('new', '1');
      setSearchParams(next, { replace: true });
    }
    open();
  };

  const closeCreateModal = () => {
    close();
    if (shouldOpenNewModal) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (!shouldOpenNewModal || opened) return;
    open();
  }, [opened, open, shouldOpenNewModal]);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * PAGE_SIZE;
      const rpcParams = {
        p_search: debouncedSearch || null,
        p_status: statusFilter,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      };

      let { data, error: err } = await supabase.rpc(projectsRpcName, rpcParams);

      if (err && projectsRpcName === PROJECTS_RPC_NEW && isMissingRpcError(err)) {
        projectsRpcName = PROJECTS_RPC_LEGACY;
        const fallback = await supabase.rpc(projectsRpcName, rpcParams);
        data = fallback.data;
        err = fallback.error;
      }

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setProjects([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const normalized: ProjectOverviewRow[] = rows.map((row) => ({
        project_id: String(row.project_id),
        owner_id: String(row.owner_id),
        workspace_id: row.workspace_id ? String(row.workspace_id) : null,
        project_name: String(row.project_name),
        description: row.description ? String(row.description) : null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
        doc_count: toCount(row.doc_count),
        processing_count: toCount(row.processing_count),
        last_activity_at: String(row.last_activity_at ?? row.updated_at),
        total_count: toCount(row.total_count),
      }));

      setProjects(normalized);
      setTotalCount(normalized[0]?.total_count ?? 0);
      setLoading(false);
    };

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, statusFilter, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount],
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setCreating(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setCreating(false);
      return;
    }

    const { data, error: err } = await supabase
      .from(TABLES.projects)
      .insert({
        owner_id: user.id,
        project_name: name.trim(),
        description: desc.trim() || null,
      })
      .select('project_id, owner_id, workspace_id, project_name, description, created_at, updated_at')
      .single();

    if (err) {
      setError(err.message);
      setCreating(false);
      return;
    }
    const newId = (data as ProjectRow).project_id;
    toast.success(`Project created: ${name.trim()}`);
    setName('');
    setDesc('');
    closeCreateModal();
    setCreating(false);
    notifyProjectListChanged(newId);
    navigate(`/app/assets`);
  };

  const hasFilters = debouncedSearch.length > 0 || statusFilter !== 'all';

  const inputClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
      <PageHeader title="Projects" subtitle="Organize your documents and annotation runs." />

      {error && <ErrorAlert message={error} />}

      {/* Large empty state — only when no projects at all and no filters */}
      {!loading && totalCount === 0 && !hasFilters && (
        <div className="flex justify-center py-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <IconFolder size={40} className="text-muted-foreground" />
            </div>
            <span className="text-lg font-semibold">No projects yet</span>
            <span className="max-w-[420px] text-center text-sm text-muted-foreground">
              Create a project to start uploading documents and running annotations.
            </span>
            <Button size="lg" onClick={openCreateModal}>
              <IconFolderPlus size={18} />
              Create your first project
            </Button>
          </div>
        </div>
      )}

      {/* Table card — shown when there are projects or active filters */}
      {(totalCount > 0 || hasFilters || loading) && (
        <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b border-border px-3 py-2">
            <label className="relative min-w-0 max-w-sm flex-1">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                <HugeiconsIcon icon={Search01Icon} size={utilityIconSize} strokeWidth={utilityIconStroke} className="text-muted-foreground" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value);
                  setPage(1);
                }}
                placeholder="Search projects"
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <div className="ml-auto flex items-center gap-3">
              <SegmentGroupRoot
                value={statusFilter}
                onValueChange={(e) => {
                  setStatusFilter(e.value as StatusFilter);
                  setPage(1);
                }}
              >
                <SegmentGroupIndicator />
                {(['all', 'active', 'processing', 'empty'] as const).map((val) => (
                  <SegmentGroupItem key={val} value={val}>
                    <SegmentGroupItemText>{val.charAt(0).toUpperCase() + val.slice(1)}</SegmentGroupItemText>
                    <SegmentGroupItemHiddenInput />
                  </SegmentGroupItem>
                ))}
              </SegmentGroupRoot>
              <span className="shrink-0 text-xs text-muted-foreground">
                {projects.length} of {totalCount}
              </span>
            </div>
          </div>

          {/* Scrollable table area */}
          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {hasFilters ? 'No matching projects.' : 'No projects found.'}
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pl-5 pr-3 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Documents</th>
                    <th className="px-3 py-2 font-medium">Processing</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                    <th className="py-2 pl-3 pr-5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((row) => (
                    <tr
                      key={row.project_id}
                      onDoubleClick={() => navigate(`/app/elt/${row.project_id}`)}
                      className={cn('border-b border-border/60 hover:bg-accent/50')}
                    >
                      <td className="py-2 pl-5 pr-3 align-middle">
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="truncate text-sm font-medium text-foreground hover:underline"
                            onClick={() => navigate(`/app/elt/${row.project_id}`)}
                          >
                            {row.project_name}
                          </button>
                          <div className="truncate text-xs text-muted-foreground" title={row.project_id}>
                            {row.project_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                        <span className="line-clamp-2">{row.description || '--'}</span>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Badge variant="secondary" size="sm">
                          <span className="flex items-center gap-1">
                            <IconFileText size={12} />
                            {row.doc_count}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Badge size="sm" variant={row.processing_count > 0 ? 'yellow' : 'gray'}>
                          {row.processing_count}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <IconClock size={12} />
                          {formatDate(row.updated_at)}
                        </span>
                      </td>
                      <td className="py-2 pl-3 pr-5 align-middle text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/app/elt/${row.project_id}`)}
                          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
                        >
                          <IconExternalLink size={12} />
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* Pagination — outside the card */}
      {totalPages > 1 && (
        <div className="flex justify-end">
          <PaginationRoot
            count={totalCount}
            pageSize={PAGE_SIZE}
            siblingCount={1}
            page={page}
            onPageChange={(details) => setPage(details.page)}
            className="flex items-center gap-1"
          >
            <PaginationPrevTrigger className="inline-flex h-8 w-8 items-center justify-center rounded text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
              <IconChevronLeft size={16} />
            </PaginationPrevTrigger>
            <PaginationContext>
              {(pagination) =>
                pagination.pages.map((pg, index) =>
                  pg.type === 'page' ? (
                    <PaginationItem
                      key={index}
                      {...pg}
                      className="inline-flex h-8 min-w-8 items-center justify-center rounded text-sm font-medium text-muted-foreground hover:text-foreground data-selected:bg-accent data-selected:text-foreground"
                    >
                      {pg.value}
                    </PaginationItem>
                  ) : (
                    <PaginationEllipsis key={index} index={index} className="text-sm text-muted-foreground">
                      &hellip;
                    </PaginationEllipsis>
                  ),
                )
              }
            </PaginationContext>
            <PaginationNextTrigger className="inline-flex h-8 w-8 items-center justify-center rounded text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
              <IconChevronRight size={16} />
            </PaginationNextTrigger>
          </PaginationRoot>
        </div>
      )}

      {/* New Project dialog */}
      <DialogRoot open={opened} onOpenChange={(e) => { if (!e.open) closeCreateModal(); }}>
        <DialogContent>
          <DialogCloseTrigger />
          <DialogTitle>New Project</DialogTitle>
          <DialogBody>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Project name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g., SCOTUS Analysis"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.currentTarget.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Description (optional)</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Brief description of this project"
                  value={desc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDesc(e.currentTarget.value)}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateModal}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating && <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
