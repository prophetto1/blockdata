import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIndexBuilderList } from './useIndexBuilderList';

const useProjectFocusMock = vi.fn();
const useResolvedPipelineServiceMock = vi.fn();
const useShellHeaderTitleMock = vi.fn();
const listPipelineSourceSetsMock = vi.fn();

vi.mock('./useProjectFocus', () => ({
  useProjectFocus: () => useProjectFocusMock(),
}));

vi.mock('@/pages/usePipelineServicesOverview', () => ({
  useResolvedPipelineService: (...args: unknown[]) => useResolvedPipelineServiceMock(...args),
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: (...args: unknown[]) => useShellHeaderTitleMock(...args),
}));

vi.mock('@/lib/pipelineSourceSetService', () => ({
  listPipelineSourceSets: (...args: unknown[]) => listPipelineSourceSetsMock(...args),
}));

describe('useIndexBuilderList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectFocusMock.mockReturnValue({ resolvedProjectId: 'project-1' });
    useResolvedPipelineServiceMock.mockReturnValue({
      service: {
        slug: 'index-builder',
        pipelineKind: 'markdown_index_builder',
        label: 'Index Builder',
      },
    });
    useShellHeaderTitleMock.mockReturnValue(undefined);
    listPipelineSourceSetsMock.mockResolvedValue([
      {
        source_set_id: 'set-1',
        label: 'Research corpus',
        member_count: 2,
        total_bytes: 2048,
        created_at: '2026-04-08T18:00:00Z',
        updated_at: '2026-04-08T18:05:00Z',
        latest_job: null,
      },
    ]);
  });

  it('loads and maps index definitions for the focused project', async () => {
    const hook = renderHook(() => useIndexBuilderList());

    await waitFor(() => {
      expect(hook.result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(hook.result.current.indexJobs).toHaveLength(1);
    });

    expect(useShellHeaderTitleMock).toHaveBeenCalledWith({
      breadcrumbs: ['Pipeline Services', 'Index Builder'],
    });
    expect(listPipelineSourceSetsMock).toHaveBeenCalledWith({
      projectId: 'project-1',
      pipelineKind: 'markdown_index_builder',
    });
    expect(hook.result.current.indexJobs[0]).toMatchObject({
      id: 'set-1',
      name: 'Research corpus',
      memberCount: 2,
      totalBytes: 2048,
    });
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.resolvedProjectId).toBe('project-1');
  });

  it('skips loading when the project focus or pipeline kind is unavailable', async () => {
    useProjectFocusMock.mockReturnValue({ resolvedProjectId: null });

    const hook = renderHook(() => useIndexBuilderList());

    await waitFor(() => {
      expect(hook.result.current.indexJobs).toEqual([]);
    });

    expect(listPipelineSourceSetsMock).not.toHaveBeenCalled();
    expect(hook.result.current.error).toBeNull();
  });

  it('reports a friendly error when the list request fails', async () => {
    listPipelineSourceSetsMock.mockRejectedValueOnce(new Error('boom'));

    const hook = renderHook(() => useIndexBuilderList());

    await waitFor(() => {
      expect(hook.result.current.error).toBe('Unable to load index definitions.');
    });

    expect(hook.result.current.indexJobs).toEqual([]);
    expect(hook.result.current.isLoading).toBe(false);
  });
});
