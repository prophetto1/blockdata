import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import IndexBuilderPage from './IndexBuilderPage';
import type { IndexJobViewModel } from '@/lib/indexJobStatus';
import type { PipelineJob, PipelineSource } from '@/lib/pipelineService';

const mockUseIndexBuilderList = vi.fn();
vi.mock('@/hooks/useIndexBuilderList', () => ({
  useIndexBuilderList: () => mockUseIndexBuilderList(),
}));

const mockUseIndexBuilderJob = vi.fn();
vi.mock('@/hooks/useIndexBuilderJob', () => ({
  useIndexBuilderJob: (...args: unknown[]) => mockUseIndexBuilderJob(...args),
}));

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

function defaultListHook() {
  return {
    indexJobs: [] as IndexJobViewModel[],
    isLoading: false,
    error: null,
    refreshList: vi.fn(),
    resolvedProjectId: 'project-1',
  };
}

function defaultJobHook() {
  return {
    jobName: 'Test Job',
    status: 'ready' as const,
    hasUnsavedChanges: false,
    isNewJob: false,
    isLoading: false,
    loadError: null,
    downloadError: null,
    downloadingKind: null,
    updateName: vi.fn(),
    saveDraft: vi.fn(),
    startRun: vi.fn(),
    retryRun: vi.fn(),
    handleUpload: vi.fn(),
    handleDownload: vi.fn(),
    discardChanges: vi.fn(),
    pipelineSourceSet: {
      sources: [] as PipelineSource[],
      selectedSourceUids: [] as string[],
      selectedSources: [] as PipelineSource[],
      sourcesLoading: false,
      sourcesError: null,
      sourceSetLabel: 'Test Job',
      activeSourceSetId: 'set-1',
      sourceSetError: null,
      isPersisting: false,
      setSourceSetLabel: vi.fn(),
      toggleSource: vi.fn(),
      moveSource: vi.fn(),
      removeSource: vi.fn(),
      appendSelection: vi.fn(),
      refreshSources: vi.fn(),
      refreshSourceSet: vi.fn(),
      resetSelection: vi.fn(),
      loadSourceSet: vi.fn(),
      persistSourceSet: vi.fn(),
    },
    pipelineJob: {
      job: null as PipelineJob | null,
      jobLoading: false,
      jobError: null,
      triggerError: null,
      isTriggering: false,
      isPolling: false,
      refreshLatestJob: vi.fn(),
      triggerJob: vi.fn(),
    },
    service: {
      slug: 'index-builder',
      pipelineKind: 'markdown_index_builder',
      label: 'Index Builder',
      description: 'Test',
      eligibleSourceTypes: ['md'],
      deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
    },
    resolvedProjectId: 'project-1',
  };
}

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-display">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderPage(initialEntry = '/app/pipeline-services/index-builder') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/app/pipeline-services/index-builder"
          element={(
            <>
              <IndexBuilderPage />
              <LocationProbe />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IndexBuilderPage — list view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIndexBuilderList.mockReturnValue(defaultListHook());
    mockUseIndexBuilderJob.mockReturnValue(defaultJobHook());
  });

  it('renders empty state when no jobs exist', () => {
    renderPage();
    expect(screen.getByText('No index definitions yet.')).toBeInTheDocument();
    expect(screen.getByText(/select a saved definition or create one/i)).toBeInTheDocument();
    expect(screen.queryByText('Index Definitions')).not.toBeInTheDocument();
  });

  it('renders job rows with definition counts', () => {
    const jobs: IndexJobViewModel[] = [
      {
        id: 'set-1',
        name: 'Legal corpus',
        status: 'complete',
        memberCount: 3,
        totalBytes: 50000,
        createdAt: '2026-03-30T08:00:00Z',
        updatedAt: '2026-03-30T08:30:00Z',
        lastRunAt: '2026-03-30T08:10:00Z',
        latestJob: null,
      },
      {
        id: 'set-2',
        name: 'Onboarding docs',
        status: 'ready',
        memberCount: 1,
        totalBytes: 12000,
        createdAt: null,
        updatedAt: null,
        lastRunAt: null,
        latestJob: null,
      },
    ];
    mockUseIndexBuilderList.mockReturnValue({ ...defaultListHook(), indexJobs: jobs });
    renderPage();
    expect(screen.getByText('Legal corpus')).toBeInTheDocument();
    expect(screen.getByText('Onboarding docs')).toBeInTheDocument();
    expect(screen.getByText('3 documents')).toBeInTheDocument();
    expect(screen.getByText('1 document')).toBeInTheDocument();
  });
});

describe('IndexBuilderPage — job detail view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const jobs: IndexJobViewModel[] = [
      {
        id: 'set-1',
        name: 'Test Job',
        status: 'ready',
        memberCount: 2,
        totalBytes: 30000,
        createdAt: '2026-03-30T08:00:00Z',
        updatedAt: '2026-03-30T08:30:00Z',
        lastRunAt: null,
        latestJob: null,
      },
    ];
    mockUseIndexBuilderList.mockReturnValue({ ...defaultListHook(), indexJobs: jobs });
    mockUseIndexBuilderJob.mockImplementation((jobId: string | null) => (
      jobId === 'new'
        ? { ...defaultJobHook(), isNewJob: true, status: 'draft', jobName: 'Untitled definition' }
        : defaultJobHook()
    ));
  });

  it('clicking a job row shows job detail', () => {
    renderPage();
    fireEvent.click(screen.getByText('Test Job'));
    expect(screen.getByDisplayValue('Test Job')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getAllByText('Never run').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 documents')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /new definition/i })).toBeInTheDocument();
    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/app/pipeline-services/index-builder?job=set-1',
    );
  });

  it('shows loading skeleton while job loads', () => {
    mockUseIndexBuilderJob.mockReturnValue({ ...defaultJobHook(), isLoading: true });
    renderPage();
    fireEvent.click(screen.getByText('Test Job'));
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state when load fails', () => {
    mockUseIndexBuilderJob.mockReturnValue({ ...defaultJobHook(), loadError: 'Unable to load this job.' });
    renderPage();
    fireEvent.click(screen.getByText('Test Job'));
    expect(screen.getByText('Unable to load this job.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new definition/i })).toBeInTheDocument();
  });

  it('renders files and config side by side', () => {
    renderPage();
    fireEvent.click(screen.getByText('Test Job'));
    expect(screen.getByText(/drop markdown files here/i)).toBeInTheDocument();
    expect(screen.getByText('Current processing defaults')).toBeInTheDocument();
  });

  it('renders latest run empty state and download area', () => {
    renderPage();
    fireEvent.click(screen.getByText('Test Job'));
    expect(screen.getByRole('heading', { name: 'Latest run' })).toBeInTheDocument();
    expect(screen.getByText(/no artifacts yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/save this definition and start a run when you're ready/i)).not.toBeInTheDocument();
  });

  it('renders downloads when run is complete', () => {
    const completeJob: PipelineJob = {
      job_id: 'job-1',
      pipeline_kind: 'markdown_index_builder',
      source_set_id: 'set-1',
      status: 'complete',
      stage: 'packaging',
      deliverables: [
        {
          deliverable_kind: 'lexical_sqlite',
          filename: 'asset.lexical.sqlite',
          content_type: 'application/octet-stream',
          byte_size: 102400,
          created_at: '2026-03-30T08:20:00Z',
        },
        {
          deliverable_kind: 'semantic_zip',
          filename: 'asset.semantic.zip',
          content_type: 'application/zip',
          byte_size: 204800,
          created_at: '2026-03-30T08:20:00Z',
        },
      ],
    };
    mockUseIndexBuilderJob.mockReturnValue({
      ...defaultJobHook(),
      status: 'complete',
      pipelineJob: { ...defaultJobHook().pipelineJob, job: completeJob },
    });
    renderPage();
    fireEvent.click(screen.getByText('Test Job'));
    expect(screen.getByText('asset.lexical.sqlite')).toBeInTheDocument();
    expect(screen.getByText('asset.semantic.zip')).toBeInTheDocument();
  });

});

describe('IndexBuilderPage — one-page search params', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const jobs: IndexJobViewModel[] = [
      {
        id: 'set-1',
        name: 'Test Job',
        status: 'ready',
        memberCount: 2,
        totalBytes: 30000,
        createdAt: '2026-03-30T08:00:00Z',
        updatedAt: '2026-03-30T08:30:00Z',
        lastRunAt: null,
        latestJob: null,
      },
    ];
    mockUseIndexBuilderList.mockReturnValue({ ...defaultListHook(), indexJobs: jobs });
    mockUseIndexBuilderJob.mockImplementation((jobId: string | null) => {
      if (jobId === 'new') {
        return { ...defaultJobHook(), isNewJob: true, status: 'draft', jobName: 'Untitled definition' };
      }

      if (jobId === 'missing') {
        return { ...defaultJobHook(), loadError: 'Unable to load this job.' };
      }

      return defaultJobHook();
    });
  });

  it('opens existing detail from the same-route job search param', () => {
    renderPage('/app/pipeline-services/index-builder?job=set-1');

    expect(screen.getByDisplayValue('Test Job')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new definition/i })).toBeInTheDocument();
    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/app/pipeline-services/index-builder?job=set-1',
    );
  });

  it('opens the draft flow from ?job=new on first render', () => {
    renderPage('/app/pipeline-services/index-builder?job=new');

    expect(screen.getByDisplayValue('Untitled definition')).toBeInTheDocument();
    expect(screen.getByText('Save definition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new definition/i })).toBeInTheDocument();
  });

  it('treats a blank job query as list view', () => {
    renderPage('/app/pipeline-services/index-builder?job=');

    expect(screen.getByRole('button', { name: /new definition/i })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Test Job')).not.toBeInTheDocument();
  });

  it('shows load errors for stale params and lets the user return to the list', () => {
    renderPage('/app/pipeline-services/index-builder?job=missing');

    expect(screen.getByText('Unable to load this job.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /return to list/i }));
    expect(screen.getByRole('button', { name: /new definition/i })).toBeInTheDocument();
    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/app/pipeline-services/index-builder',
    );
  });

  it('refreshes the jobs table and replaces ?job=new after the first save', () => {
    const refreshList = vi.fn();
    mockUseIndexBuilderList.mockReturnValue({ ...defaultListHook(), refreshList });
    mockUseIndexBuilderJob.mockImplementation((jobId: string | null, options?: { onJobSaved?: (sourceSetId: string) => void }) => {
      if (jobId === 'new') {
        return {
          ...defaultJobHook(),
          isNewJob: true,
          status: 'draft',
          jobName: 'Untitled definition',
          saveDraft: vi.fn(() => options?.onJobSaved?.('set-created')),
        };
      }
      return defaultJobHook();
    });

    renderPage('/app/pipeline-services/index-builder?job=new');
    fireEvent.click(screen.getByRole('button', { name: /save definition/i }));

    expect(refreshList).toHaveBeenCalled();
    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/app/pipeline-services/index-builder?job=set-created',
    );
  });
});
