import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePipelineSourceSet } from './usePipelineSourceSet';
import type { PipelineSource } from '@/lib/pipelineService';
import type { PipelineSourceSet } from '@/lib/pipelineSourceSetService';

const listPipelineSourcesMock = vi.fn();
const createPipelineSourceSetMock = vi.fn();
const getPipelineSourceSetMock = vi.fn();
const listPipelineSourceSetsMock = vi.fn();
const updatePipelineSourceSetMock = vi.fn();

vi.mock('@/lib/pipelineService', () => ({
  listPipelineSources: (...args: unknown[]) => listPipelineSourcesMock(...args),
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

describe('usePipelineSourceSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPipelineSourcesMock.mockResolvedValue(SOURCES);
    listPipelineSourceSetsMock.mockResolvedValue([]);
    getPipelineSourceSetMock.mockResolvedValue(makeSourceSet(['source-1', 'source-2']));
    createPipelineSourceSetMock.mockResolvedValue(makeSourceSet(['source-1']));
    updatePipelineSourceSetMock.mockResolvedValue(makeSourceSet(['source-1', 'source-2']));
  });

  it('replaces selection with the caller-provided order', async () => {
    const { result } = renderHook(() => usePipelineSourceSet({
      projectId: 'project-1',
      pipelineKind: 'markdown_index_builder',
    }));

    await waitFor(() => {
      expect(result.current.sources).toHaveLength(3);
    });

    act(() => {
      result.current.replaceSelection(['source-3', 'source-1']);
    });

    expect(result.current.selectedSourceUids).toEqual(['source-3', 'source-1']);
    expect(result.current.selectedSources.map((source) => source.source_uid)).toEqual([
      'source-3',
      'source-1',
    ]);
  });

  it('restores ordered membership by replacing the current edited selection exactly', async () => {
    const { result } = renderHook(() => usePipelineSourceSet({
      projectId: 'project-1',
      pipelineKind: 'markdown_index_builder',
    }));

    await waitFor(() => {
      expect(result.current.sources).toHaveLength(3);
    });

    act(() => {
      result.current.toggleSource('source-1');
      result.current.toggleSource('source-2');
    });

    expect(result.current.selectedSourceUids).toEqual(['source-1', 'source-2']);

    act(() => {
      result.current.moveSource('source-2', -1);
    });

    expect(result.current.selectedSourceUids).toEqual(['source-2', 'source-1']);

    act(() => {
      result.current.replaceSelection(['source-3', 'source-1']);
    });

    expect(result.current.selectedSourceUids).toEqual(['source-3', 'source-1']);
    expect(result.current.selectedSources.map((source) => source.source_uid)).toEqual([
      'source-3',
      'source-1',
    ]);
  });
});
