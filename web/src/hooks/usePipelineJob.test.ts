import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePipelineJob } from './usePipelineJob';

const getLatestPipelineJobMock = vi.fn();
const getPipelineJobMock = vi.fn();
const createPipelineJobMock = vi.fn();

vi.mock('@/lib/pipelineService', () => ({
  getLatestPipelineJob: (...args: unknown[]) => getLatestPipelineJobMock(...args),
  getPipelineJob: (...args: unknown[]) => getPipelineJobMock(...args),
  createPipelineJob: (...args: unknown[]) => createPipelineJobMock(...args),
}));

describe('usePipelineJob', () => {
  beforeEach(() => {
    getLatestPipelineJobMock.mockReset();
    getPipelineJobMock.mockReset();
    createPipelineJobMock.mockReset();
  });

  it('hydrates the latest job by source set and polls until terminal state', async () => {
    getLatestPipelineJobMock.mockResolvedValue({
      job_id: 'job-1',
      pipeline_kind: 'markdown_index_builder',
      source_set_id: 'set-1',
      status: 'running',
      stage: 'embedding',
      deliverables: [],
    });
    getPipelineJobMock.mockResolvedValue({
      job_id: 'job-1',
      pipeline_kind: 'markdown_index_builder',
      source_set_id: 'set-1',
      status: 'complete',
      stage: 'packaging',
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
      pipelineKind: 'markdown_index_builder',
      sourceSetId: 'set-1',
      pollIntervalMs: 10,
    }));

    expect(getLatestPipelineJobMock).toHaveBeenCalledWith({
      pipelineKind: 'markdown_index_builder',
      sourceSetId: 'set-1',
    });

    await waitFor(() => {
      expect(result.current.job?.status).toBe('complete');
    });

    expect(result.current.job?.deliverables).toHaveLength(1);
    expect(result.current.isPolling).toBe(false);
  });

  it('triggers a manual pipeline job for the selected source set', async () => {
    getLatestPipelineJobMock.mockResolvedValue(null);
    createPipelineJobMock.mockResolvedValue({
      job_id: 'job-2',
      pipeline_kind: 'markdown_index_builder',
      source_set_id: 'set-1',
      status: 'queued',
      stage: 'queued',
    });

    const { result } = renderHook(() => usePipelineJob({
      pipelineKind: 'markdown_index_builder',
      sourceSetId: 'set-1',
    }));

    await act(async () => {
      await result.current.triggerJob();
    });

    expect(createPipelineJobMock).toHaveBeenCalledWith({
      pipelineKind: 'markdown_index_builder',
      sourceSetId: 'set-1',
    });
    expect(result.current.job).toEqual({
      job_id: 'job-2',
      pipeline_kind: 'markdown_index_builder',
      source_set_id: 'set-1',
      status: 'queued',
      stage: 'queued',
      deliverables: [],
    });
  });

  it('clears job state when the source set is unset', async () => {
    getLatestPipelineJobMock.mockResolvedValue(null);

    const { result, rerender } = renderHook(
      ({ sourceSetId }: { sourceSetId: string | null }) => usePipelineJob({
        pipelineKind: 'markdown_index_builder',
        sourceSetId,
      }),
      { initialProps: { sourceSetId: 'set-1' as string | null } },
    );

    await waitFor(() => {
      expect(getLatestPipelineJobMock).toHaveBeenCalledWith({
        pipelineKind: 'markdown_index_builder',
        sourceSetId: 'set-1',
      });
    });

    rerender({ sourceSetId: null });

    await waitFor(() => {
      expect(result.current.job).toBeNull();
    });
  });
});
