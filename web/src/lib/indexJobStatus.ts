import type { PipelineJobSummary } from './pipelineService';

export type IndexJobStatus = 'empty' | 'draft' | 'ready' | 'invalid' | 'running' | 'failed' | 'complete';

export type IndexJobViewModel = {
  id: string;
  name: string;
  status: IndexJobStatus;
  memberCount: number;
  totalBytes: number;
  createdAt: string | null;
  updatedAt: string | null;
  lastRunAt: string | null;
  latestJob: PipelineJobSummary | null;
};

export function deriveIndexJobStatus(
  sourceSet: { source_set_id: string | null; member_count: number } | null,
  latestJob: { status: string } | null,
  hasUnsavedChanges: boolean,
): IndexJobStatus {
  if (!sourceSet) return 'empty';
  if (hasUnsavedChanges || !sourceSet.source_set_id) return 'draft';
  if (sourceSet.member_count === 0) return 'invalid';
  if (!latestJob) return 'ready';
  if (latestJob.status === 'queued' || latestJob.status === 'running') return 'running';
  if (latestJob.status === 'failed') return 'failed';
  if (latestJob.status === 'complete') return 'complete';
  return 'ready';
}
