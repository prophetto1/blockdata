import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import IndexBuilderPage from './IndexBuilderPage';

const platformApiFetchMock = vi.fn();
const useShellHeaderTitleMock = vi.fn();
const uploadPipelineSourceMock = vi.fn();
const downloadPipelineDeliverableMock = vi.fn();
const usePipelineSourceSetMock = vi.fn();
const usePipelineJobMock = vi.fn();
const refreshPipelineSourcesMock = vi.fn();
const persistSourceSetMock = vi.fn();
const triggerJobMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/lib/pipelineService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pipelineService')>('@/lib/pipelineService');
  return {
    ...actual,
    uploadPipelineSource: (...args: unknown[]) => uploadPipelineSourceMock(...args),
    downloadPipelineDeliverable: (...args: unknown[]) => downloadPipelineDeliverableMock(...args),
  };
});

vi.mock('@/hooks/usePipelineJob', () => ({
  usePipelineJob: (...args: unknown[]) => usePipelineJobMock(...args),
}));

vi.mock('@/hooks/usePipelineSourceSet', () => ({
  usePipelineSourceSet: (...args: unknown[]) => usePipelineSourceSetMock(...args),
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: (...args: unknown[]) => useShellHeaderTitleMock(...args),
}));

const useProjectFocusMock = vi.fn();

vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => useProjectFocusMock(),
}));

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
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

function renderAt(pathname: string) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/app/pipeline-services/index-builder" element={<IndexBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IndexBuilderPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    platformApiFetchMock.mockReset();
    useShellHeaderTitleMock.mockReset();
    uploadPipelineSourceMock.mockReset();
    downloadPipelineDeliverableMock.mockReset();
    usePipelineSourceSetMock.mockReset();
    usePipelineJobMock.mockReset();
    refreshPipelineSourcesMock.mockReset();
    persistSourceSetMock.mockReset();
    triggerJobMock.mockReset();
    useProjectFocusMock.mockReset();
    useProjectFocusMock.mockReturnValue({ resolvedProjectId: null });
    usePipelineSourceSetMock.mockReturnValue({
      sources: [],
      sourcesLoading: false,
      sourcesError: null,
      sourceSetLabel: 'Release corpus',
      selectedSourceUids: [],
      selectedSources: [],
      activeSourceSetId: null,
      sourceSetError: null,
      isPersisting: false,
      setSourceSetLabel: vi.fn(),
      toggleSource: vi.fn(),
      moveSource: vi.fn(),
      removeSource: vi.fn(),
      refreshSources: refreshPipelineSourcesMock,
      refreshSourceSet: vi.fn(),
      persistSourceSet: persistSourceSetMock,
    });
    usePipelineJobMock.mockReturnValue({
      job: null,
      jobLoading: false,
      jobError: null,
      triggerError: null,
      isTriggering: false,
      isPolling: false,
      refreshLatestJob: vi.fn(),
      triggerJob: triggerJobMock,
    });
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
  });

  it('renders the dedicated Index Builder workbench with service-local tabs', async () => {
    renderAt('/app/pipeline-services/index-builder');

    expect(await screen.findByRole('heading', { name: 'Index Builder' })).toBeInTheDocument();
    expect(screen.getByText('Runs & Downloads')).toBeInTheDocument();
    expect(screen.queryByText('Service Overview')).not.toBeInTheDocument();
    expect(useShellHeaderTitleMock).toHaveBeenCalledWith({
      breadcrumbs: ['Pipeline Services', 'Index Builder'],
    });
  });

  it('uploads multiple markdown files without auto-starting a job', async () => {
    useProjectFocusMock.mockReturnValue({ resolvedProjectId: 'project-1' });
    usePipelineSourceSetMock.mockReturnValue({
      sources: [
        {
          source_uid: 'source-1',
          project_id: 'project-1',
          doc_title: 'Guide.md',
          source_type: 'md',
        },
      ],
      sourcesLoading: false,
      sourcesError: null,
      sourceSetLabel: 'Release corpus',
      selectedSourceUids: ['source-1'],
      selectedSources: [
        {
          source_uid: 'source-1',
          project_id: 'project-1',
          doc_title: 'Guide.md',
          source_type: 'md',
        },
      ],
      activeSourceSetId: null,
      sourceSetError: null,
      isPersisting: false,
      setSourceSetLabel: vi.fn(),
      toggleSource: vi.fn(),
      moveSource: vi.fn(),
      removeSource: vi.fn(),
      refreshSources: refreshPipelineSourcesMock,
      refreshSourceSet: vi.fn(),
      persistSourceSet: persistSourceSetMock,
    });
    uploadPipelineSourceMock
      .mockResolvedValueOnce({
        sourceUid: 'source-2',
        reservation: {
          reservation_id: 'res-1',
          signed_upload_url: 'https://upload.example/res-1',
        },
        completed: {
          storage_object_id: 'obj-1',
          object_key: 'users/user-1/pipeline-services/index-builder/projects/project-1/sources/source-2/source/uploaded.md',
          byte_size: 9,
        },
      })
      .mockResolvedValueOnce({
        sourceUid: 'source-3',
        reservation: {
          reservation_id: 'res-2',
          signed_upload_url: 'https://upload.example/res-2',
        },
        completed: {
          storage_object_id: 'obj-2',
          object_key: 'users/user-1/pipeline-services/index-builder/projects/project-1/sources/source-3/source/notes.md',
          byte_size: 9,
        },
      });

    renderAt('/app/pipeline-services/index-builder');

    const input = await screen.findByLabelText('Add markdown files');
    fireEvent.change(input, {
      target: {
        files: [
          new File(['# Upload'], 'uploaded.md', { type: 'text/markdown' }),
          new File(['# Notes'], 'notes.md', { type: 'text/markdown' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));

    await waitFor(() => {
      expect(uploadPipelineSourceMock).toHaveBeenNthCalledWith(1, {
        projectId: 'project-1',
        serviceSlug: 'index-builder',
        file: expect.any(File),
      });
    });
    await waitFor(() => {
      expect(uploadPipelineSourceMock).toHaveBeenNthCalledWith(2, {
        projectId: 'project-1',
        serviceSlug: 'index-builder',
        file: expect.any(File),
      });
    });
    await waitFor(() => {
      expect(refreshPipelineSourcesMock).toHaveBeenCalled();
    });
    expect(triggerJobMock).not.toHaveBeenCalled();
  });

  it('persists the selected source set before triggering a pipeline job and switches to Runs & Downloads', async () => {
    useProjectFocusMock.mockReturnValue({ resolvedProjectId: 'project-1' });
    usePipelineSourceSetMock.mockReturnValue({
      sources: [
        {
          source_uid: 'source-1',
          project_id: 'project-1',
          doc_title: 'Guide.md',
          source_type: 'md',
        },
      ],
      sourcesLoading: false,
      sourcesError: null,
      sourceSetLabel: 'Release corpus',
      selectedSourceUids: ['source-1'],
      selectedSources: [
        {
          source_uid: 'source-1',
          project_id: 'project-1',
          doc_title: 'Guide.md',
          source_type: 'md',
        },
      ],
      activeSourceSetId: null,
      sourceSetError: null,
      isPersisting: false,
      setSourceSetLabel: vi.fn(),
      toggleSource: vi.fn(),
      moveSource: vi.fn(),
      removeSource: vi.fn(),
      refreshSources: refreshPipelineSourcesMock,
      refreshSourceSet: vi.fn(),
      persistSourceSet: persistSourceSetMock.mockResolvedValue({
        source_set_id: 'set-1',
        project_id: 'project-1',
        label: 'Release corpus',
        member_count: 1,
        total_bytes: 128,
        items: [],
        latest_job: null,
      }),
    });

    renderAt('/app/pipeline-services/index-builder');

    expect(screen.queryByRole('heading', { name: 'Processing' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Start processing' }));

    await waitFor(() => {
      expect(persistSourceSetMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(triggerJobMock).toHaveBeenCalledWith('set-1');
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Processing' })).toBeInTheDocument();
    });
    expect(screen.getByText('Active source set')).toBeInTheDocument();
    expect(screen.getAllByText('Release corpus').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Deliverables' })).toBeInTheDocument();
  });

  it('ignores legacy workbench state keyed to the old shared Pipeline Services tabs', async () => {
    window.localStorage.setItem('pipeline-services-index-builder-v1', JSON.stringify([
      {
        id: 'pane-pipeline-services',
        tabs: ['pipeline-services-catalog', 'pipeline-services-overview'],
        activeTab: 'pipeline-services-overview',
        width: 100,
      },
    ]));

    renderAt('/app/pipeline-services/index-builder');

    expect(await screen.findByRole('heading', { name: 'Index Builder' })).toBeInTheDocument();
    expect(screen.getByText('Runs & Downloads')).toBeInTheDocument();
    expect(screen.queryByText('Service Overview')).not.toBeInTheDocument();
  });
});
