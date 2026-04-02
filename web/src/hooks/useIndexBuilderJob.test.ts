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
    source_uid: 'source-1',
    project_id: 'project-1',
    doc_title: 'Alpha.md',
    source_type: 'md',
    byte_size: 101,
  },
  {
    source_uid: 'source-2',
    project_id: 'project-1',
    doc_title: 'Beta.md',
    source_type: 'md',
    byte_size: 202,
  },
  {
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
    updatePipelineSourceSetMock.mockImplementation(({ sourceUids, label, sourceSetId }) => (
      Promise.resolve(makeSourceSet(sourceUids ?? [], label ?? 'Saved set', sourceSetId ?? 'set-1'))
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
      sourceUids: ['source-1', 'source-2', 'source-3'],
    });
    expect(pipelineJobHook.triggerJob).toHaveBeenCalledWith('set-1');
    expect(updatePipelineSourceSetMock.mock.invocationCallOrder[0]).toBeLessThan(
      pipelineJobHook.triggerJob.mock.invocationCallOrder[0],
    );
  });
});
