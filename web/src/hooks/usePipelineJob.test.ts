import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePipelineJob } from './usePipelineJob';

const listPipelineSourcesMock = vi.fn();
const getLatestPipelineJobMock = vi.fn();
const getPipelineJobMock = vi.fn();
const createPipelineJobMock = vi.fn();

vi.mock('@/lib/pipelineService', () => ({
  listPipelineSources: (...args: unknown[]) => listPipelineSourcesMock(...args),
  getLatestPipelineJob: (...args: unknown[]) => getLatestPipelineJobMock(...args),
  getPipelineJob: (...args: unknown[]) => getPipelineJobMock(...args),
  createPipelineJob: (...args: unknown[]) => createPipelineJobMock(...args),
}));

describe('usePipelineJob', () => {
  beforeEach(() => {
    listPipelineSourcesMock.mockReset();
    getLatestPipelineJobMock.mockReset();
    getPipelineJobMock.mockReset();
    createPipelineJobMock.mockReset();
  });

  it('loads owned sources, hydrates the latest job, and polls until terminal state', async () => {
    listPipelineSourcesMock.mockResolvedValue([
      {
        source_uid: 'source-1',
        project_id: 'project-1',
        doc_title: 'Guide.md',
        source_type: 'md',
      },
    ]);
    getLatestPipelineJobMock.mockResolvedValue({
      job_id: 'job-1',
      pipeline_kind: 'markdown_index_builder',
      source_uid: 'source-1',
      status: 'running',
      stage: 'embedding',
      deliverables: [],
    });
    getPipelineJobMock.mockResolvedValue({
      job_id: 'job-1',
      pipeline_kind: 'markdown_index_builder',
      source_uid: 'source-1',
      status: 'complete',
      stage: 'complete',
      deliverables: [
        {
          deliverable_kind: 'semantic_zip',
          filename: 'asset.semantic.zip',
          content_type: 'application/zip',
          byte_size: 321,
          created_at: '2026-03-28T00:00:00Z',
        },
      ],
    });

    const { result } = renderHook(() => usePipelineJob({
      projectId: 'project-1',
      pipelineKind: 'markdown_index_builder',
      pollIntervalMs: 10,
    }));

    await waitFor(() => {
      expect(result.current.sources).toHaveLength(1);
    });

    expect(result.current.selectedSourceUid).toBe('source-1');
    expect(getLatestPipelineJobMock).toHaveBeenCalledWith({
      pipelineKind: 'markdown_index_builder',
      sourceUid: 'source-1',
    });

    await waitFor(() => {
      expect(result.current.job?.status).toBe('complete');
    });

    expect(result.current.job?.deliverables).toHaveLength(1);
    expect(result.current.isPolling).toBe(false);
  });

  it('triggers a manual pipeline job for the selected source', async () => {
    listPipelineSourcesMock.mockResolvedValue([
      {
        source_uid: 'source-1',
        project_id: 'project-1',
        doc_title: 'Guide.md',
        source_type: 'md',
      },
    ]);
    getLatestPipelineJobMock.mockResolvedValue(null);
    createPipelineJobMock.mockResolvedValue({
      job_id: 'job-2',
      pipeline_kind: 'markdown_index_builder',
      source_uid: 'source-1',
      status: 'queued',
      stage: 'queued',
    });

    const { result } = renderHook(() => usePipelineJob({
      projectId: 'project-1',
      pipelineKind: 'markdown_index_builder',
    }));

    await waitFor(() => {
      expect(result.current.selectedSourceUid).toBe('source-1');
    });

    await act(async () => {
      await result.current.triggerJob();
    });

    expect(createPipelineJobMock).toHaveBeenCalledWith({
      pipelineKind: 'markdown_index_builder',
      sourceUid: 'source-1',
    });
    expect(result.current.job).toEqual({
      job_id: 'job-2',
      pipeline_kind: 'markdown_index_builder',
      source_uid: 'source-1',
      status: 'queued',
      stage: 'queued',
      deliverables: [],
    });
  });

  it('can refresh sources and select a newly uploaded source without auto-starting a job', async () => {
    listPipelineSourcesMock
      .mockResolvedValueOnce([
        {
          source_uid: 'source-1',
          project_id: 'project-1',
          doc_title: 'Guide.md',
          source_type: 'md',
        },
      ])
      .mockResolvedValueOnce([
        {
          source_uid: 'source-1',
          project_id: 'project-1',
          doc_title: 'Guide.md',
          source_type: 'md',
        },
        {
          source_uid: 'source-2',
          project_id: 'project-1',
          doc_title: 'Uploaded.md',
          source_type: 'md',
        },
      ]);
    getLatestPipelineJobMock.mockResolvedValue(null);

    const { result } = renderHook(() => usePipelineJob({
      projectId: 'project-1',
      pipelineKind: 'markdown_index_builder',
    }));

    await waitFor(() => {
      expect(result.current.selectedSourceUid).toBe('source-1');
    });

    await act(async () => {
      await result.current.refreshSources();
      result.current.setSelectedSourceUid('source-2');
    });

    expect(result.current.sources).toHaveLength(2);
    expect(result.current.selectedSourceUid).toBe('source-2');
    expect(createPipelineJobMock).not.toHaveBeenCalled();
  });
});
