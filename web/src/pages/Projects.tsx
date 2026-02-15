import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Pagination,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import {
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
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type StatusFilter = 'all' | 'active' | 'processing' | 'empty';

const PAGE_SIZE = 12;

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

export default function Projects() {
  const [projects, setProjects] = useState<ProjectOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const navigate = useNavigate();
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = computedColorScheme === 'dark';

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * PAGE_SIZE;
      const { data, error: err } = await supabase.rpc('list_projects_overview_v2', {
        p_search: debouncedSearch || null,
        p_status: statusFilter,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

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
    return themeQuartz.withParams({
      rowVerticalPaddingScale: 0.6,
      browserColorScheme: isDark ? 'dark' : 'light',
      backgroundColor: isDark ? '#09090b' : '#ffffff',
      chromeBackgroundColor: isDark ? '#09090b' : '#ffffff',
      foregroundColor: isDark ? '#fafafa' : '#09090b',
      borderColor: isDark ? '#27272a' : '#e4e4e7',
      subtleTextColor: isDark ? '#a1a1aa' : '#52525b',
    });
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
          <Button
            variant="subtle"
            size="compact-sm"
            px={0}
            onClick={() => navigate(`/app/projects/${row.project_id}`)}
          >
            {row.project_name}
          </Button>
        );
      },
    },
    {
      headerName: 'Description',
      field: 'description',
      flex: 1.8,
      minWidth: 280,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {params.data?.description || 'No description'}
        </Text>
      ),
    },
    {
      headerName: 'Documents',
      field: 'doc_count',
      width: 130,
      cellRenderer: (params: ICellRendererParams<ProjectOverviewRow>) => (
        <Badge size="sm" variant="light">
          <Group gap={4} wrap="nowrap">
            <IconFileText size={12} />
            {params.data?.doc_count ?? 0}
          </Group>
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
          <Badge size="sm" variant="light" color={count > 0 ? 'yellow' : 'gray'}>
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
        <Group gap={4} wrap="nowrap">
          <IconClock size={12} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">
            {formatDate(params.data?.updated_at)}
          </Text>
        </Group>
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
          <Group gap={6} justify="flex-end" wrap="nowrap">
            <Tooltip label="Open project">
              <ActionIcon
                variant="subtle"
                onClick={() => navigate(`/app/projects/${row.project_id}`)}
                aria-label={`Open ${row.project_name}`}
              >
                <IconExternalLink size={15} />
              </ActionIcon>
            </Tooltip>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconUpload size={12} />}
              onClick={() => navigate(`/app/projects/${row.project_id}/upload`)}
            >
              Upload
            </Button>
          </Group>
        );
      },
    },
  ]), [navigate]);

  const defaultColDef = useMemo<ColDef<ProjectOverviewRow>>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
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
    notifications.show({ color: 'green', title: 'Project created', message: name.trim() });
    setName('');
    setDesc('');
    close();
    setCreating(false);
    navigate(`/app/projects/${(data as ProjectRow).project_id}`);
  };

  if (loading && projects.length === 0) return <Center mt="xl"><Loader /></Center>;

  const hasFilters = debouncedSearch.length > 0 || statusFilter !== 'all';

  return (
    <>
      <PageHeader title="Projects" subtitle="Organize your documents and annotation runs.">
        <Button leftSection={<IconFolderPlus size={16} />} onClick={open}>
          New project
        </Button>
      </PageHeader>

      {error && <ErrorAlert message={error} />}

      <Stack gap="sm" mb="md">
        <TextInput
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          placeholder="Search by project name or description"
          leftSection={<IconSearch size={14} />}
        />
        <SegmentedControl
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as StatusFilter);
            setPage(1);
          }}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Processing', value: 'processing' },
            { label: 'Empty', value: 'empty' },
          ]}
        />
      </Stack>

      {!loading && projects.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius="xl" variant="light">
              <IconFolder size={40} />
            </ThemeIcon>
            <Text size="lg" fw={600}>
              {hasFilters ? 'No matching projects' : 'No projects yet'}
            </Text>
            <Text size="sm" c="dimmed" maw={420} ta="center">
              {hasFilters
                ? 'Try a broader search or a different filter.'
                : 'Create a project to start uploading documents and running annotations.'}
            </Text>
            {!hasFilters && (
              <Button size="lg" leftSection={<IconFolderPlus size={18} />} onClick={open}>
                Create your first project
              </Button>
            )}
          </Stack>
        </Center>
      )}

      {projects.length > 0 && (
        <Stack gap="sm">
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
              overlayNoRowsTemplate='<span style="color: var(--mantine-color-dimmed);">No projects found.</span>'
            />
          </div>

          {totalPages > 1 && (
            <Group justify="flex-end">
              <Pagination value={page} onChange={setPage} total={totalPages} />
            </Group>
          )}
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title="New Project" centered>
        <Stack gap="md">
          <TextInput
            label="Project name"
            placeholder="e.g., SCOTUS Analysis"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            data-autofocus
          />
          <TextInput
            label="Description (optional)"
            placeholder="Brief description of this project"
            value={desc}
            onChange={(e) => setDesc(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!name.trim()}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
