import { useCallback, useEffect, useState } from 'react';
import { useProjectFocus } from './useProjectFocus';
import { useResolvedPipelineService } from '@/pages/usePipelineServicesOverview';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { listPipelineSourceSets } from '@/lib/pipelineSourceSetService';
import { deriveIndexJobStatus, type IndexJobViewModel } from '@/lib/indexJobStatus';

export function useIndexBuilderList() {
  const { resolvedProjectId } = useProjectFocus();
  const { service } = useResolvedPipelineService('index-builder');
  const pipelineKind = service?.pipelineKind ?? null;

  useShellHeaderTitle({
    breadcrumbs: ['Pipeline Services', service?.label ?? 'Index Builder'],
  });

  const [indexJobs, setIndexJobs] = useState<IndexJobViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    if (!resolvedProjectId || !pipelineKind) {
      setIndexJobs([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const items = await listPipelineSourceSets({
        projectId: resolvedProjectId,
        pipelineKind,
      });
      setIndexJobs(
        items.map((item): IndexJobViewModel => ({
          id: item.source_set_id,
          name: item.label,
          status: deriveIndexJobStatus(
            { source_set_id: item.source_set_id, member_count: item.member_count },
            item.latest_job,
            false,
          ),
          memberCount: item.member_count,
          totalBytes: item.total_bytes,
          createdAt: item.created_at ?? null,
          updatedAt: item.updated_at ?? null,
          lastRunAt: item.latest_job?.started_at ?? null,
          latestJob: item.latest_job,
        })),
      );
    } catch {
      setIndexJobs([]);
      setError('Unable to load index definitions.');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedProjectId, pipelineKind]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  return {
    indexJobs,
    isLoading,
    error,
    refreshList,
    resolvedProjectId,
  };
}
