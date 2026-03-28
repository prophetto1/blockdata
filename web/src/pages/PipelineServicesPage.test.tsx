import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import PipelineServicesPage from './PipelineServicesPage';

const platformApiFetchMock = vi.fn();
const useShellHeaderTitleMock = vi.fn();
const uploadPipelineSourceMock = vi.fn();
const downloadPipelineDeliverableMock = vi.fn();
const usePipelineJobMock = vi.fn();
const setSelectedSourceUidMock = vi.fn();
const refreshSourcesMock = vi.fn();
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

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: (...args: unknown[]) => useShellHeaderTitleMock(...args),
}));

const useProjectFocusMock = vi.fn();

vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => useProjectFocusMock(),
}));

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
        <Route path="/app/pipeline-services" element={<PipelineServicesPage />} />
        <Route path="/app/pipeline-services/:serviceSlug" element={<PipelineServicesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PipelineServicesPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useShellHeaderTitleMock.mockReset();
    uploadPipelineSourceMock.mockReset();
    downloadPipelineDeliverableMock.mockReset();
    usePipelineJobMock.mockReset();
    setSelectedSourceUidMock.mockReset();
    refreshSourcesMock.mockReset();
    triggerJobMock.mockReset();
    useProjectFocusMock.mockReset();
    useProjectFocusMock.mockReturnValue({ resolvedProjectId: null });
    usePipelineJobMock.mockReturnValue({
      sources: [],
      sourcesLoading: false,
      sourcesError: null,
      selectedSourceUid: null,
      setSelectedSourceUid: setSelectedSourceUidMock,
      job: null,
      jobLoading: false,
      jobError: null,
      triggerError: null,
      isTriggering: false,
      isPolling: false,
      refreshSources: refreshSourcesMock,
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

  it('renders the pipeline services landing surface and loads definitions', async () => {
    renderAt('/app/pipeline-services');

    expect(screen.getByRole('heading', { name: 'Pipeline Services' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Open Index Builder' })).toBeInTheDocument();
    });

    expect(platformApiFetchMock).toHaveBeenCalledWith('/pipelines/definitions');
    expect(screen.getByText('Build lexical and semantic retrieval packages from markdown sources.')).toBeInTheDocument();
  });

  it('renders the dedicated Index Builder route as the selected service', async () => {
    renderAt('/app/pipeline-services/index-builder');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Index Builder' })).toBeInTheDocument();
    });

    expect(screen.getByText('Pipeline kind')).toBeInTheDocument();
    expect(screen.getByText('markdown_index_builder')).toBeInTheDocument();
    expect(screen.getByText('lexical_sqlite, semantic_zip')).toBeInTheDocument();
    expect(screen.getByText('md, markdown')).toBeInTheDocument();
  });

  it('refreshes owned sources and selects the uploaded markdown source without auto-starting a job', async () => {
    useProjectFocusMock.mockReturnValue({ resolvedProjectId: 'project-1' });
    usePipelineJobMock.mockReturnValue({
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
      selectedSourceUid: 'source-1',
      setSelectedSourceUid: setSelectedSourceUidMock,
      job: null,
      jobLoading: false,
      jobError: null,
      triggerError: null,
      isTriggering: false,
      isPolling: false,
      refreshSources: refreshSourcesMock,
      refreshLatestJob: vi.fn(),
      triggerJob: triggerJobMock,
    });
    uploadPipelineSourceMock.mockResolvedValue({
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
    });

    renderAt('/app/pipeline-services/index-builder');

    const input = await screen.findByLabelText('Upload markdown source');
    fireEvent.change(input, {
      target: {
        files: [new File(['# Upload'], 'uploaded.md', { type: 'text/markdown' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

    await waitFor(() => {
      expect(uploadPipelineSourceMock).toHaveBeenCalledWith({
        projectId: 'project-1',
        serviceSlug: 'index-builder',
        file: expect.any(File),
      });
    });
    await waitFor(() => {
      expect(refreshSourcesMock).toHaveBeenCalled();
    });
    expect(setSelectedSourceUidMock).toHaveBeenCalledWith('source-2');
    expect(triggerJobMock).not.toHaveBeenCalled();
  });
});
