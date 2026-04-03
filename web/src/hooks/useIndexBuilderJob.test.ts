import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIndexBuilderJob } from './useIndexBuilderJob';
import type { PipelineJob, PipelineSource } from '@/lib/pipelineService';
import type { PipelineSourceSet } from '@/lib/pipelineSourceSetService';

const useProjectFocusMock = vi.fn();
const useResolvedPipelineServiceMock = vi.fn();
const useShellHeaderTitleMock = vi.fn();
const mockUsePipelineJob = vi.fn();

const listPipelineSourcesMock = vi.fn();
const createPipelineSourceSetMock = vi.fn();
const getPipelineSourceSetMock = vi.fn();
const listPipelineSourceSetsMock = vi.fn();
const updatePipelineSourceSetMock = vi.fn();
const uploadPipelineSourceMock = vi.fn();
const downloadPipelineDeliverableMock = vi.fn();

vi.mock('./useProjectFocus', () => ({
  useProjectFocus: () => useProjectFocusMock(),
}));

vi.mock('@/pages/usePipelineServicesOverview', () => ({
  useResolvedPipelineService: (...args: unknown[]) => useResolvedPipelineServiceMock(...args),
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: (...args: unknown[]) => useShellHeaderTitleMock(...args),
}));

vi.mock('./usePipelineJob', () => ({
  usePipelineJob: (...args: unknown[]) => mockUsePipelineJob(...args),
}));

vi.mock('@/lib/pipelineService', () => ({
  listPipelineSources: (...args: unknown[]) => listPipelineSourcesMock(...args),
  uploadPipelineSource: (...args: unknown[]) => uploadPipelineSourceMock(...args),
  downloadPipelineDeliverable: (...args: unknown[]) => downloadPipelineDeliverableMock(...args),
}));

vi.mock('@/lib/pipelineSourceSetService', () => ({
  createPipelineSourceSet: (...args: unknown[]) => createPipelineSourceSetMock(...args),
  getPipelineSourceSet: (...args: unknown[]) => getPipelineSourceSetMock(...args),
  listPipelineSourceSets: (...args: unknown[]) => listPipelineSourceSetsMock(...args),
  updatePipelineSourceSet: (...args: unknown[]) => updatePipelineSourceSetMock(...args),
}));

const SOURCES: PipelineSource[] = [
  {
    pipeline_source_id: 'psrc-1',
    source_uid: 'source-1',
    project_id: 'project-1',
    doc_title: 'Alpha.md',
    source_type: 'md',
    byte_size: 101,
  },
  {
    pipeline_source_id: 'psrc-2',
    source_uid: 'source-2',
    project_id: 'project-1',
    doc_title: 'Beta.md',
    source_type: 'md',
    byte_size: 202,
  },
  {
    pipeline_source_id: 'psrc-3',
    source_uid: 'source-3',
    project_id: 'project-1',
    doc_title: 'Gamma.md',
    source_type: 'md',
    byte_size: 303,
  },
];

function makeSourceSet(
  sourceUids: string[],
  label = 'Saved set',
  sourceSetId = 'set-1',
): PipelineSourceSet {
  return {
    source_set_id: sourceSetId,
    project_id: 'project-1',
    label,
    member_count: sourceUids.length,
    total_bytes: sourceUids.length * 100,
    items: sourceUids.map((sourceUid, index) => {
      const source = SOURCES.find((item) => item.source_uid === sourceUid);
      if (!source) {
        throw new Error(`Missing source fixture for ${sourceUid}`);
      }
      return {
        ...source,
        source_order: index,
      };
    }),
    latest_job: null,
  };
}

function buildPipelineJobHook() {
  return {
    job: null as PipelineJob | null,
    jobLoading: false,
    jobError: null,
    triggerError: null,
    isTriggering: false,
    isPolling: false,
    refreshLatestJob: vi.fn().mockResolvedValue(undefined),
    triggerJob: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useIndexBuilderJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useProjectFocusMock.mockReturnValue({ resolvedProjectId: 'project-1' });
    useResolvedPipelineServiceMock.mockReturnValue({
      service: {
        slug: 'index-builder',
        pipelineKind: 'markdown_index_builder',
        label: 'Index Builder',
        description: 'Test service',
        eligibleSourceTypes: ['md'],
        deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
      },
    });
    useShellHeaderTitleMock.mockReturnValue(undefined);
    mockUsePipelineJob.mockReturnValue(buildPipelineJobHook());

    listPipelineSourcesMock.mockResolvedValue(SOURCES);
    listPipelineSourceSetsMock.mockResolvedValue([]);
    getPipelineSourceSetMock.mockResolvedValue(makeSourceSet(['source-1', 'source-2']));
    createPipelineSourceSetMock.mockResolvedValue(makeSourceSet(['source-1', 'source-2']));
    updatePipelineSourceSetMock.mockImplementation(({ pipelineSourceIds, label, sourceSetId }) => (
      Promise.resolve(
        makeSourceSet(
          (pipelineSourceIds ?? []).map((pipelineSourceId: string) => {
            const source = SOURCES.find((item) => item.pipeline_source_id === pipelineSourceId);
            if (!source) {
              throw new Error(`Missing source fixture for ${pipelineSourceId}`);
            }
            return source.source_uid;
          }),
          label ?? 'Saved set',
          sourceSetId ?? 'set-1',
        ),
      )
    ));
    uploadPipelineSourceMock.mockResolvedValue(undefined);
    downloadPipelineDeliverableMock.mockResolvedValue(new Blob());
  });

  async function renderExistingJob() {
    const hook = renderHook(() => useIndexBuilderJob('set-1'));

    await waitFor(() => {
      expect(hook.result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(hook.result.current.jobName).toBe('Saved set');
    });

    expect(hook.result.current.pipelineSourceSet.selectedSourceUids).toEqual([
      'source-1',
      'source-2',
    ]);

    return hook;
  }

  it('starts a new draft with no checked membership even when other saved source sets exist', async () => {
    listPipelineSourceSetsMock.mockResolvedValue([
      makeSourceSet(['source-1', 'source-2'], 'Existing set', 'set-existing'),
    ]);

    const hook = renderHook(() => useIndexBuilderJob('new'));

    await waitFor(() => {
      expect(hook.result.current.isLoading).toBe(false);
    });

    expect(hook.result.current.isNewJob).toBe(true);
    expect(hook.result.current.pipelineSourceSet.activeSourceSetId).toBeNull();
    expect(hook.result.current.pipelineSourceSet.selectedSourceUids).toEqual([]);
  });

  it('marks existing jobs dirty when file membership is toggled', async () => {
    const hook = await renderExistingJob();

    act(() => {
      hook.result.current.pipelineSourceSet.toggleSource('source-3');
    });

    await waitFor(() => {
      expect(hook.result.current.hasUnsavedChanges).toBe(true);
    });
  });

  it('marks existing jobs dirty when a selected file is removed', async () => {
    const hook = await renderExistingJob();

    act(() => {
      hook.result.current.pipelineSourceSet.removeSource('source-1');
    });

    await waitFor(() => {
      expect(hook.result.current.hasUnsavedChanges).toBe(true);
    });
  });

  it('restores the saved label and ordered file membership on discard', async () => {
    const hook = await renderExistingJob();

    act(() => {
      hook.result.current.updateName('Edited set');
      hook.result.current.pipelineSourceSet.toggleSource('source-3');
      hook.result.current.pipelineSourceSet.removeSource('source-1');
    });

    await waitFor(() => {
      expect(hook.result.current.hasUnsavedChanges).toBe(true);
    });

    act(() => {
      hook.result.current.discardChanges();
    });

    await waitFor(() => {
      expect(hook.result.current.jobName).toBe('Saved set');
    });

    expect(hook.result.current.pipelineSourceSet.selectedSourceUids).toEqual([
      'source-1',
      'source-2',
    ]);
  });

  it('persists file membership edits before starting a run', async () => {
    const hook = await renderExistingJob();
    const pipelineJobHook = mockUsePipelineJob.mock.results[0]?.value as ReturnType<typeof buildPipelineJobHook>;

    act(() => {
      hook.result.current.pipelineSourceSet.toggleSource('source-3');
    });

    await waitFor(() => {
      expect(hook.result.current.hasUnsavedChanges).toBe(true);
    });

    await act(async () => {
      await hook.result.current.startRun();
    });

    expect(updatePipelineSourceSetMock).toHaveBeenCalledWith({
      pipelineKind: 'markdown_index_builder',
      sourceSetId: 'set-1',
      label: 'Saved set',
      pipelineSourceIds: ['psrc-1', 'psrc-2', 'psrc-3'],
    });
    expect(pipelineJobHook.triggerJob).toHaveBeenCalledWith('set-1');
    expect(updatePipelineSourceSetMock.mock.invocationCallOrder[0]).toBeLessThan(
      pipelineJobHook.triggerJob.mock.invocationCallOrder[0],
    );
  });

  it('adds newly uploaded files into the current draft selection', async () => {
    const newSource: PipelineSource = {
      pipeline_source_id: 'psrc-4',
      source_uid: 'source-4',
      project_id: 'project-1',
      doc_title: 'Delta.md',
      source_type: 'md',
      byte_size: 404,
    };
    listPipelineSourcesMock
      .mockResolvedValueOnce([SOURCES[0], SOURCES[1]])
      .mockResolvedValueOnce([SOURCES[0], SOURCES[1], newSource]);
    uploadPipelineSourceMock.mockResolvedValue({
      sourceUid: 'source-4',
      reservation: {},
      completed: {},
    });

    const hook = renderHook(() => useIndexBuilderJob('new'));

    await waitFor(() => {
      expect(hook.result.current.pipelineSourceSet.sources).toHaveLength(2);
    });

    const file = new File(['# delta'], 'Delta.md', { type: 'text/markdown' });

    await act(async () => {
      await hook.result.current.handleUpload([file]);
    });

    await waitFor(() => {
      expect(hook.result.current.pipelineSourceSet.sources).toHaveLength(3);
    });

    expect(hook.result.current.pipelineSourceSet.selectedSourceUids).toEqual(['source-4']);
  });
});
