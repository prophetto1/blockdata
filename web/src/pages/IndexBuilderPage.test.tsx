import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import IndexBuilderPage from './IndexBuilderPage';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

const useShellHeaderTitleMock = vi.fn();
vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: (...args: unknown[]) => useShellHeaderTitleMock(...args),
}));

const useProjectFocusMock = vi.fn();
vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => useProjectFocusMock(),
}));

const platformApiFetchMock = vi.fn();
vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

const uploadPipelineSourceMock = vi.fn();
const downloadPipelineDeliverableMock = vi.fn();
vi.mock('@/lib/pipelineService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pipelineService')>('@/lib/pipelineService');
  return {
    ...actual,
    uploadPipelineSource: (...args: unknown[]) => uploadPipelineSourceMock(...args),
    downloadPipelineDeliverable: (...args: unknown[]) => downloadPipelineDeliverableMock(...args),
  };
});

const usePipelineSourceSetMock = vi.fn();
vi.mock('@/hooks/usePipelineSourceSet', () => ({
  usePipelineSourceSet: (...args: unknown[]) => usePipelineSourceSetMock(...args),
}));

const usePipelineJobMock = vi.fn();
vi.mock('@/hooks/usePipelineJob', () => ({
  usePipelineJob: (...args: unknown[]) => usePipelineJobMock(...args),
}));

const listPipelineSourceSetsMock = vi.fn();
vi.mock('@/lib/pipelineSourceSetService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pipelineSourceSetService')>('@/lib/pipelineSourceSetService');
  return {
    ...actual,
    listPipelineSourceSets: (...args: unknown[]) => listPipelineSourceSetsMock(...args),
  };
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  }
});

afterEach(() => {
  cleanup();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function defaultSourceSetHook() {
  return {
    sources: [],
    sourcesLoading: false,
    sourcesError: null,
    sourceSetLabel: '',
    selectedSourceUids: [],
    selectedSources: [],
    activeSourceSetId: null,
    sourceSetError: null,
    isPersisting: false,
    setSourceSetLabel: vi.fn(),
    toggleSource: vi.fn(),
    moveSource: vi.fn(),
    removeSource: vi.fn(),
    refreshSources: vi.fn(),
    refreshSourceSet: vi.fn(),
    resetSelection: vi.fn(),
    loadSourceSet: vi.fn(),
    persistSourceSet: vi.fn(),
  };
}

function defaultJobHook() {
  return {
    job: null,
    jobLoading: false,
    jobError: null,
    triggerError: null,
    isTriggering: false,
    isPolling: false,
    refreshLatestJob: vi.fn(),
    triggerJob: vi.fn(),
  };
}

function setupDefaults() {
  useProjectFocusMock.mockReturnValue({ resolvedProjectId: 'project-1' });
  usePipelineSourceSetMock.mockReturnValue(defaultSourceSetHook());
  usePipelineJobMock.mockReturnValue(defaultJobHook());
  listPipelineSourceSetsMock.mockResolvedValue([]);
  platformApiFetchMock.mockResolvedValue(
    jsonResponse({
      items: [
        {
          pipeline_kind: 'markdown_index_builder',
          label: 'Index Builder',
          supports_manual_trigger: true,
          eligible_source_types: ['md', 'markdown'],
          deliverable_kinds: ['lexical_sqlite', 'semantic_zip'],
        },
      ],
    }),
  );
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/app/pipeline-services/index-builder']}>
      <Routes>
        <Route path="/app/pipeline-services/index-builder" element={<IndexBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('IndexBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  it('renders empty state with intro card and New Index Job button', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Index Builder' })).toBeInTheDocument();
    expect(screen.getByText(/upload markdown files/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /new index job/i }).length).toBeGreaterThan(0);
  });

  it('renders Index Jobs list with correct heading', async () => {
    listPipelineSourceSetsMock.mockResolvedValue([
      {
        source_set_id: 'set-1',
        project_id: 'project-1',
        label: 'Legal corpus v2',
        member_count: 3,
        total_bytes: 50000,
        created_at: '2026-03-30T08:00:00Z',
        updated_at: '2026-03-30T08:30:00Z',
        latest_job: { job_id: 'job-1', pipeline_kind: 'markdown_index_builder', source_set_id: 'set-1', status: 'complete', stage: 'packaging', started_at: '2026-03-30T08:10:00Z' },
      },
      {
        source_set_id: 'set-2',
        project_id: 'project-1',
        label: 'Onboarding docs',
        member_count: 1,
        total_bytes: 12000,
        created_at: '2026-03-30T09:00:00Z',
        updated_at: '2026-03-30T09:05:00Z',
        latest_job: null,
      },
    ]);
    renderPage();
    expect(await screen.findByText('Index Jobs')).toBeInTheDocument();
    expect(await screen.findByText('Legal corpus v2')).toBeInTheDocument();
    expect(screen.getByText('Onboarding docs')).toBeInTheDocument();
  });

  it('selecting a job populates the detail pane', async () => {
    listPipelineSourceSetsMock.mockResolvedValue([
      {
        source_set_id: 'set-1',
        project_id: 'project-1',
        label: 'Legal corpus v2',
        member_count: 3,
        total_bytes: 50000,
        created_at: '2026-03-30T08:00:00Z',
        updated_at: '2026-03-30T08:30:00Z',
        latest_job: { job_id: 'job-1', pipeline_kind: 'markdown_index_builder', source_set_id: 'set-1', status: 'complete', stage: 'packaging', started_at: '2026-03-30T08:10:00Z' },
      },
    ]);
    const loadSourceSetMock = vi.fn().mockResolvedValue({
      source_set_id: 'set-1',
      label: 'Legal corpus v2',
      member_count: 3,
      total_bytes: 50000,
      items: [],
      latest_job: null,
    });
    usePipelineSourceSetMock.mockReturnValue({
      ...defaultSourceSetHook(),
      loadSourceSet: loadSourceSetMock,
    });
    renderPage();
    const row = await screen.findByText('Legal corpus v2');
    fireEvent.click(row);
    await waitFor(() => {
      expect(loadSourceSetMock).toHaveBeenCalledWith('set-1');
    });
  });

  it('creating a new job shows draft state with Save draft button and Files tab', async () => {
    renderPage();
    const newJobButtons = await screen.findAllByRole('button', { name: /new index job/i });
    fireEvent.click(newJobButtons[0]);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Untitled index job')).toBeInTheDocument();
    });
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('save draft calls persistSourceSet', async () => {
    const persistMock = vi.fn().mockResolvedValue({
      source_set_id: 'set-new',
      project_id: 'project-1',
      label: 'Untitled index job',
      member_count: 0,
      total_bytes: 0,
      items: [],
      latest_job: null,
    });
    usePipelineSourceSetMock.mockReturnValue({
      ...defaultSourceSetHook(),
      persistSourceSet: persistMock,
    });
    renderPage();
    const newJobButtons = await screen.findAllByRole('button', { name: /new index job/i });
    fireEvent.click(newJobButtons[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => {
      expect(persistMock).toHaveBeenCalled();
    });
  });

  it('unsaved changes on a saved job shows Save and start', async () => {
    listPipelineSourceSetsMock.mockResolvedValue([
      {
        source_set_id: 'set-1',
        project_id: 'project-1',
        label: 'Legal corpus v2',
        member_count: 3,
        total_bytes: 50000,
        created_at: '2026-03-30T08:00:00Z',
        updated_at: '2026-03-30T08:30:00Z',
        latest_job: null,
      },
    ]);
    usePipelineSourceSetMock.mockReturnValue({
      ...defaultSourceSetHook(),
      loadSourceSet: vi.fn().mockResolvedValue({
        source_set_id: 'set-1',
        label: 'Legal corpus v2',
        member_count: 3,
        total_bytes: 50000,
        items: [],
        latest_job: null,
      }),
    });
    renderPage();
    const row = await screen.findByText('Legal corpus v2');
    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Legal corpus v2')).toBeInTheDocument();
    });
    // Edit the name to trigger unsaved changes
    const nameInput = screen.getByDisplayValue('Legal corpus v2');
    fireEvent.change(nameInput, { target: { value: 'Legal corpus v3' } });
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /save and start/i })).toBeInTheDocument();
  });

  it('artifacts tab shows deliverables for completed job', async () => {
    listPipelineSourceSetsMock.mockResolvedValue([
      {
        source_set_id: 'set-1',
        project_id: 'project-1',
        label: 'Legal corpus v2',
        member_count: 3,
        total_bytes: 50000,
        created_at: '2026-03-30T08:00:00Z',
        updated_at: '2026-03-30T08:30:00Z',
        latest_job: { job_id: 'job-1', pipeline_kind: 'markdown_index_builder', source_set_id: 'set-1', status: 'complete', stage: 'packaging', started_at: '2026-03-30T08:10:00Z' },
      },
    ]);
    usePipelineSourceSetMock.mockReturnValue({
      ...defaultSourceSetHook(),
      loadSourceSet: vi.fn().mockResolvedValue({
        source_set_id: 'set-1',
        label: 'Legal corpus v2',
        member_count: 3,
        total_bytes: 50000,
        items: [],
        latest_job: null,
      }),
    });
    usePipelineJobMock.mockReturnValue({
      ...defaultJobHook(),
      job: {
        job_id: 'job-1',
        pipeline_kind: 'markdown_index_builder',
        source_set_id: 'set-1',
        status: 'complete',
        stage: 'packaging',
        deliverables: [
          { deliverable_kind: 'lexical_sqlite', filename: 'asset.lexical.sqlite', content_type: 'application/octet-stream', byte_size: 102400, created_at: '2026-03-30T08:20:00Z' },
          { deliverable_kind: 'semantic_zip', filename: 'asset.semantic.zip', content_type: 'application/zip', byte_size: 204800, created_at: '2026-03-30T08:20:00Z' },
        ],
      },
    });
    renderPage();
    const row = await screen.findByText('Legal corpus v2');
    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Legal corpus v2')).toBeInTheDocument();
    });
    // Click Artifacts tab
    fireEvent.click(screen.getByText('Artifacts'));
    await waitFor(() => {
      expect(screen.getByText('asset.lexical.sqlite')).toBeInTheDocument();
    });
    expect(screen.getByText('asset.semantic.zip')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /download/i }).length).toBe(2);
  });
});
