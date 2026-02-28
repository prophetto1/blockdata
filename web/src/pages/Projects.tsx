import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { Pagination } from '@ark-ui/react/pagination';
import { toast } from 'sonner';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsDark } from '@/lib/useIsDark';
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
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { ProjectOverviewRow, ProjectRow } from '@/lib/types';
import { createAppGridTheme } from '@/lib/agGridTheme';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type StatusFilter = 'all' | 'active' | 'processing' | 'empty';

const PAGE_SIZE = 12;
const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';
let projectsRpcName: typeof PROJECTS_RPC_NEW | typeof PROJECTS_RPC_LEGACY = PROJECTS_RPC_NEW;

ModuleRegistry.registerModules([AllCommunityModule]);

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString();
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
  const isDark = useIsDark();
  const shouldOpenNewModal = searchParams.get('new') === '1';

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

  const gridTheme = useMemo(() => {
    return createAppGridTheme(isDark);
  }, [isDark]);

  const columnDefs = useMemo<ColDef<ProjectOverviewRow>[]>(() => ([
    {
      headerName: 'Project',
      field: 'project_name',
      flex: 1.2,
      minWidth: 220,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => {
        const row = params.data;
        if (!row) return null;
        return (
          <button
            type="button"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            onClick={() => navigate(`/app/elt/${row.project_id}`)}
          >
            {row.project_name}
          </button>
        );
      },
    },
    {
      headerName: 'Description',
      field: 'description',
      flex: 1.8,
      minWidth: 280,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => (
        <span className="text-sm text-muted-foreground line-clamp-2">
          {params.data?.description || 'No description'}
        </span>
      ),
    },
    {
      headerName: 'Documents',
      field: 'doc_count',
      width: 130,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => (
        <Badge variant="secondary" size="sm">
          <span className="flex items-center gap-1">
            <IconFileText size={12} />
            {params.data?.doc_count ?? 0}
          </span>
        </Badge>
      ),
    },
    {
      headerName: 'Processing',
      field: 'processing_count',
      width: 130,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => {
        const count = params.data?.processing_count ?? 0;
        return (
          <Badge size="sm" variant={count > 0 ? 'yellow' : 'gray'}>
            {count}
          </Badge>
        );
      },
    },
    {
      headerName: 'Updated',
      field: 'updated_at',
      width: 140,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconClock size={12} />
          {formatDate(params.data?.updated_at)}
        </span>
      ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 170,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => {
        const row = params.data;
        if (!row) return null;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate(`/app/elt/${row.project_id}`)}
                  aria-label={`Open ${row.project_name}`}
                >
                  <IconExternalLink size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open project</TooltipContent>
            </Tooltip>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/app/elt/${row.project_id}`)}
            >
              <IconUpload size={12} />
              Upload
            </Button>
          </div>
        );
      },
    },
  ]), [navigate]);

  const defaultColDef = useMemo<ColDef<ProjectOverviewRow>>(() => ({
    resizable: true,
    sortable: true,
    filter: false,
    suppressHeaderMenuButton: true,
  }), []);

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
    toast.success(`Project created: ${name.trim()}`);
    setName('');
    setDesc('');
    closeCreateModal();
    setCreating(false);
    navigate(`/app/elt/${(data as ProjectRow).project_id}`);
  };

  if (loading && projects.length === 0) return <div className="flex justify-center pt-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;

  const hasFilters = debouncedSearch.length > 0 || statusFilter !== 'all';

  const inputClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <>
      <PageHeader title="Projects" subtitle="Organize your documents and annotation runs.">
        <Button size="sm" onClick={openCreateModal}>
          <IconFolderPlus size={14} />
          New project
        </Button>
      </PageHeader>

      {error && <ErrorAlert message={error} />}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-80">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className={`${inputClass} pl-8`}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            placeholder="Search by project name or description"
          />
        </div>
        <SegmentGroupRoot
          value={statusFilter}
          onValueChange={(e) => {
            setStatusFilter(e.value as StatusFilter);
            setPage(1);
          }}
          className="ml-auto"
        >
          <SegmentGroupIndicator />
          {(['all', 'active', 'processing', 'empty'] as const).map((val) => (
            <SegmentGroupItem key={val} value={val}>
              <SegmentGroupItemText>{val.charAt(0).toUpperCase() + val.slice(1)}</SegmentGroupItemText>
              <SegmentGroupItemHiddenInput />
            </SegmentGroupItem>
          ))}
        </SegmentGroupRoot>
      </div>

      {!loading && projects.length === 0 && (
        <div className="flex justify-center py-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <IconFolder size={40} className="text-muted-foreground" />
            </div>
            <span className="text-lg font-semibold">
              {hasFilters ? 'No matching projects' : 'No projects yet'}
            </span>
            <span className="max-w-[420px] text-center text-sm text-muted-foreground">
              {hasFilters
                ? 'Try a broader search or a different filter.'
                : 'Create a project to start uploading documents and running annotations.'}
            </span>
            {!hasFilters && (
              <Button size="lg" onClick={openCreateModal}>
                <IconFolderPlus size={18} />
                Create your first project
              </Button>
            )}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="flex flex-col gap-3">
          <div
            className="block-viewer-grid grid-font-medium grid-font-family-sans grid-valign-center"
            style={{ height: 560, width: '100%' }}
          >
            <AgGridReact
              theme={gridTheme}
              rowData={projects}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={52}
              headerHeight={44}
              animateRows={false}
              domLayout="normal"
              overlayNoRowsTemplate='<span class="text-muted-foreground">No projects found.</span>'
            />
          </div>

          {totalPages > 1 && (
            <div className="flex justify-end">
              <Pagination.Root
                count={totalCount}
                pageSize={PAGE_SIZE}
                siblingCount={1}
                page={page}
                onPageChange={(details) => setPage(details.page)}
                className="flex items-center gap-1"
              >
                <Pagination.PrevTrigger className="inline-flex h-8 w-8 items-center justify-center rounded text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
                  <IconChevronLeft size={16} />
                </Pagination.PrevTrigger>
                <Pagination.Context>
                  {(pagination) =>
                    pagination.pages.map((pg, index) =>
                      pg.type === 'page' ? (
                        <Pagination.Item
                          key={index}
                          {...pg}
                          className="inline-flex h-8 min-w-8 items-center justify-center rounded text-sm font-medium text-muted-foreground hover:text-foreground data-selected:bg-accent data-selected:text-foreground"
                        >
                          {pg.value}
                        </Pagination.Item>
                      ) : (
                        <Pagination.Ellipsis key={index} index={index} className="text-sm text-muted-foreground">
                          &hellip;
                        </Pagination.Ellipsis>
                      ),
                    )
                  }
                </Pagination.Context>
                <Pagination.NextTrigger className="inline-flex h-8 w-8 items-center justify-center rounded text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
                  <IconChevronRight size={16} />
                </Pagination.NextTrigger>
              </Pagination.Root>
            </div>
          )}
        </div>
      )}

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
    </>
  );
}
