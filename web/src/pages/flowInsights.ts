export type FlowRunSummary = {
  run_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_blocks: number | null;
  completed_blocks: number | null;
  failed_blocks: number | null;
};

export type FlowDocumentSummary = {
  source_uid: string;
  doc_title: string;
  status: string;
  uploaded_at: string;
  source_type: string;
};

export type FlowDependencyProject = {
  project_id: string;
  project_name: string;
  updated_at: string;
};

export type FlowRevisionItem = {
  id: string;
  type: 'flow-update' | 'document-upload' | 'document-status' | 'run-start' | 'run-complete';
  title: string;
  timestamp: string;
  detail: string;
};

export type FlowMetrics = {
  totalRuns: number;
  runningRuns: number;
  successRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  successRate: number;
  avgDurationMs: number;
};

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoDurationHours(value: string): number | null {
  const match = /^PT(\d+)H$/i.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return hours;
}

export function filterRunsByTimeRange(
  runs: FlowRunSummary[],
  timeRangeIso: string | null,
  now: Date = new Date(),
): FlowRunSummary[] {
  if (!timeRangeIso) return runs;
  const hours = parseIsoDurationHours(timeRangeIso);
  if (hours === null) return runs;
  const threshold = now.getTime() - (hours * 60 * 60 * 1000);
  return runs.filter((run) => {
    const started = toMs(run.started_at);
    return started !== null && started >= threshold;
  });
}

export function computeFlowMetrics(runs: FlowRunSummary[]): FlowMetrics {
  const totalRuns = runs.length;
  const runningRuns = runs.filter((run) => run.status === 'running').length;
  const successRuns = runs.filter((run) => run.status === 'complete').length;
  const failedRuns = runs.filter((run) => run.status === 'failed').length;
  const cancelledRuns = runs.filter((run) => run.status === 'cancelled').length;

  const terminalRuns = successRuns + failedRuns + cancelledRuns;
  const successRate = terminalRuns > 0 ? (successRuns / terminalRuns) * 100 : 0;

  const durations = runs
    .map((run) => {
      const started = toMs(run.started_at);
      const completed = toMs(run.completed_at);
      if (started === null || completed === null) return null;
      const duration = completed - started;
      return duration >= 0 ? duration : null;
    })
    .filter((duration): duration is number => typeof duration === 'number');

  const avgDurationMs = durations.length > 0
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : 0;

  return {
    totalRuns,
    runningRuns,
    successRuns,
    failedRuns,
    cancelledRuns,
    successRate,
    avgDurationMs,
  };
}

export function buildRevisionItems(
  docs: FlowDocumentSummary[],
  runs: FlowRunSummary[],
  projectUpdatedAt: string | null,
): FlowRevisionItem[] {
  const revisions: FlowRevisionItem[] = [];

  if (projectUpdatedAt) {
    revisions.push({
      id: `project:${projectUpdatedAt}`,
      type: 'flow-update',
      title: 'Flow configuration updated',
      timestamp: projectUpdatedAt,
      detail: 'Project metadata changed.',
    });
  }

  for (const doc of docs) {
    revisions.push({
      id: `doc-upload:${doc.source_uid}`,
      type: 'document-upload',
      title: doc.doc_title || doc.source_uid,
      timestamp: doc.uploaded_at,
      detail: `Uploaded (${doc.source_type})`,
    });
    if (doc.status !== 'uploaded') {
      revisions.push({
        id: `doc-status:${doc.source_uid}`,
        type: 'document-status',
        title: doc.doc_title || doc.source_uid,
        timestamp: doc.uploaded_at,
        detail: `Current status: ${doc.status}`,
      });
    }
  }

  for (const run of runs) {
    revisions.push({
      id: `run-start:${run.run_id}`,
      type: 'run-start',
      title: `Execution ${run.run_id}`,
      timestamp: run.started_at,
      detail: 'Execution started',
    });
    if (run.completed_at) {
      revisions.push({
        id: `run-complete:${run.run_id}`,
        type: 'run-complete',
        title: `Execution ${run.run_id}`,
        timestamp: run.completed_at,
        detail: `Execution finished with status: ${run.status}`,
      });
    }
  }

  return revisions
    .filter((item) => toMs(item.timestamp) !== null)
    .sort((a, b) => (toMs(b.timestamp) ?? 0) - (toMs(a.timestamp) ?? 0));
}

export function estimatePeakConcurrency(runs: FlowRunSummary[], now: Date = new Date()): number {
  const events: Array<{ at: number; delta: number }> = [];

  for (const run of runs) {
    const start = toMs(run.started_at);
    if (start === null) continue;
    const end = toMs(run.completed_at) ?? now.getTime();
    if (end < start) continue;
    events.push({ at: start, delta: 1 });
    events.push({ at: end, delta: -1 });
  }

  events.sort((a, b) => {
    if (a.at === b.at) return b.delta - a.delta;
    return a.at - b.at;
  });

  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    if (current > peak) peak = current;
  }

  return peak;
}

export function buildDependencyItems(
  currentFlowId: string,
  workspaceProjects: FlowDependencyProject[],
): FlowDependencyProject[] {
  return workspaceProjects
    .filter((project) => project.project_id !== currentFlowId)
    .sort((a, b) => (toMs(b.updated_at) ?? 0) - (toMs(a.updated_at) ?? 0));
}
