import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams, type RowClickedEvent } from 'ag-grid-community';
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { createAppGridTheme } from '@/lib/agGridTheme';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow, ProjectRow } from '@/lib/types';

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_COLOR: Record<DocumentRow['status'], string> = {
  uploaded: 'blue',
  converting: 'yellow',
  ingested: 'green',
  conversion_failed: 'red',
  ingest_failed: 'red',
};

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (absMs < minute) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), 'minute');
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (absMs < week) return rtf.format(Math.round(diffMs / day), 'day');
  if (absMs < month) return rtf.format(Math.round(diffMs / week), 'week');
  if (absMs < year) return rtf.format(Math.round(diffMs / month), 'month');
  return rtf.format(Math.round(diffMs / year), 'year');
}

export default function ProjectsHome() {
  const navigate = useNavigate();
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = computedColorScheme === 'dark';
  const [focusedProjectId, setFocusedProjectId] = useLocalStorage<string | null>({
    key: PROJECT_FOCUS_STORAGE_KEY,
    defaultValue: null,
  });
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useShellHeaderTitle({ title: 'Home' });

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      setLoadingProjects(true);
      const { data, error: queryError } = await supabase
        .from(TABLES.projects)
        .select('*')
        .order('updated_at', { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setProjects([]);
        setLoadingProjects(false);
        return;
      }

      const rows = (data ?? []) as ProjectRow[];
      setProjects(rows);
      setLoadingProjects(false);
    };

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (projects.length === 0) {
      if (focusedProjectId !== null) setFocusedProjectId(null);
      return;
    }

    if (!focusedProjectId || !projects.some((project) => project.project_id === focusedProjectId)) {
      setFocusedProjectId(projects[0].project_id);
    }
  }, [focusedProjectId, projects, setFocusedProjectId]);

  useEffect(() => {
    let cancelled = false;

    const loadDocs = async () => {
      if (!focusedProjectId) {
        setDocs([]);
        return;
      }

      setLoadingDocs(true);
      const { data, error: queryError } = await supabase
        .from(TABLES.documents)
        .select('*')
        .eq('project_id', focusedProjectId)
        .order('uploaded_at', { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setDocs([]);
        setLoadingDocs(false);
        return;
      }

      setDocs((data ?? []) as DocumentRow[]);
      setLoadingDocs(false);
    };

    void loadDocs();
    return () => {
      cancelled = true;
    };
  }, [focusedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.project_id === focusedProjectId) ?? null,
    [focusedProjectId, projects],
  );

  const gridTheme = useMemo(() => createAppGridTheme(isDark), [isDark]);

  const columnDefs = useMemo<ColDef<DocumentRow>[]>(() => ([
    {
      headerName: 'Document',
      field: 'doc_title',
      flex: 1.8,
      minWidth: 360,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const row = params.data;
        if (!row || !selectedProject) return null;
        return (
          <Button
            variant="subtle"
            size="compact-sm"
            px={0}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/app/projects/${selectedProject.project_id}/documents/${row.source_uid}`);
            }}
          >
            {row.doc_title}
          </Button>
        );
      },
    },
    {
      headerName: 'Type',
      field: 'source_type',
      width: 120,
      valueFormatter: (params) => String(params.value ?? '').toUpperCase(),
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 150,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const status = params.value as DocumentRow['status'] | undefined;
        if (!status) return null;
        return (
          <Badge size="xs" variant="light" color={STATUS_COLOR[status] ?? 'gray'}>
            {status}
          </Badge>
        );
      },
    },
    {
      headerName: 'Uploaded',
      field: 'uploaded_at',
      width: 160,
      sort: 'desc',
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const value = params.value ? String(params.value) : null;
        if (!value) return <Text size="xs" c="dimmed">--</Text>;
        return <Text size="xs" c="dimmed">{formatRelativeTime(value)}</Text>;
      },
    },
  ]), [navigate, selectedProject]);

  const defaultColDef = useMemo<ColDef<DocumentRow>>(() => ({
    resizable: true,
    sortable: true,
    filter: false,
    suppressHeaderMenuButton: true,
  }), []);

  const parseTarget = selectedProject ? `/app/projects/${selectedProject.project_id}` : '/app/projects';
  const extractTarget = selectedProject
    ? `/app/schemas/apply?projectId=${selectedProject.project_id}`
    : '/app/schemas/apply';
  const editTarget = selectedProject
    ? `/app/schemas/advanced?projectId=${selectedProject.project_id}`
    : '/app/schemas/advanced';

  const handleRowClicked = (event: RowClickedEvent<DocumentRow>) => {
    if (!selectedProject || !event.data) return;
    navigate(`/app/projects/${selectedProject.project_id}/documents/${event.data.source_uid}`);
  };

  return (
    <Stack gap="md">
      {error && <ErrorAlert message={error} />}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <Card
          withBorder
          className="projects-home-action-card"
          onClick={() => navigate(parseTarget)}
        >
          <Stack gap={6}>
            <Text fw={700}>Parse</Text>
            <Text size="sm" c="dimmed">
              Open the selected project document list and parse-ready workflows.
            </Text>
          </Stack>
        </Card>
        <Card
          withBorder
          className="projects-home-action-card"
          onClick={() => navigate(extractTarget)}
        >
          <Stack gap={6}>
            <Text fw={700}>Extract</Text>
            <Text size="sm" c="dimmed">
              Apply schema extraction for the selected project.
            </Text>
          </Stack>
        </Card>
        <Card
          withBorder
          className="projects-home-action-card"
          onClick={() => navigate(editTarget)}
        >
          <Stack gap={6}>
            <Text fw={700}>Edit</Text>
            <Text size="sm" c="dimmed">
              Open advanced schema editing tied to the selected project context.
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>

      <Box className="projects-home-table-wrap">
        <Group justify="space-between" align="center" mb="sm" wrap="wrap">
          <Stack gap={2}>
            <Text fw={700} size="sm">Documents</Text>
            <Text size="xs" c="dimmed">
              {selectedProject ? selectedProject.project_name : 'No project selected'}
            </Text>
          </Stack>
          <Button
            size="xs"
            disabled={!selectedProject}
            onClick={() => {
              if (!selectedProject) return;
              navigate(`/app/projects/${selectedProject.project_id}`);
            }}
          >
            Open project
          </Button>
        </Group>

        {loadingProjects || loadingDocs ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : !selectedProject ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">Create a project to start.</Text>
          </Center>
        ) : docs.length === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">No documents in this project yet.</Text>
          </Center>
        ) : (
          <div
            className="block-viewer-grid grid-font-medium grid-font-family-sans grid-valign-center"
            style={{ height: 620, width: '100%' }}
          >
            <AgGridReact
              theme={gridTheme}
              rowData={docs}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowId={(params) => params.data.source_uid}
              onRowClicked={handleRowClicked}
              rowHeight={56}
              headerHeight={44}
              animateRows={false}
              domLayout="normal"
            />
          </div>
        )}
      </Box>
    </Stack>
  );
}
