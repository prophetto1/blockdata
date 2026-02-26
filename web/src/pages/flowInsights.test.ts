import { describe, expect, it } from 'vitest';
import {
  buildDependencyItems,
  buildRevisionItems,
  computeFlowMetrics,
  estimatePeakConcurrency,
  filterRunsByTimeRange,
  type FlowDependencyProject,
  type FlowDocumentSummary,
  type FlowRunSummary,
} from './flowInsights';

const RUNS: FlowRunSummary[] = [
  {
    run_id: 'run-1',
    status: 'complete',
    started_at: '2026-02-26T10:00:00.000Z',
    completed_at: '2026-02-26T10:05:00.000Z',
    total_blocks: 100,
    completed_blocks: 100,
    failed_blocks: 0,
  },
  {
    run_id: 'run-2',
    status: 'failed',
    started_at: '2026-02-26T10:02:00.000Z',
    completed_at: '2026-02-26T10:07:00.000Z',
    total_blocks: 80,
    completed_blocks: 60,
    failed_blocks: 20,
  },
  {
    run_id: 'run-3',
    status: 'running',
    started_at: '2026-02-26T10:03:00.000Z',
    completed_at: null,
    total_blocks: 50,
    completed_blocks: 20,
    failed_blocks: 0,
  },
];

describe('flowInsights', () => {
  it('computes run metrics', () => {
    const metrics = computeFlowMetrics(RUNS);
    expect(metrics.totalRuns).toBe(3);
    expect(metrics.runningRuns).toBe(1);
    expect(metrics.successRuns).toBe(1);
    expect(metrics.failedRuns).toBe(1);
    expect(metrics.successRate).toBeCloseTo(50);
    expect(metrics.avgDurationMs).toBeGreaterThan(0);
  });

  it('filters runs by PT24H time range', () => {
    const now = new Date('2026-02-26T12:00:00.000Z');
    const filtered = filterRunsByTimeRange(
      [
        ...RUNS,
        {
          run_id: 'run-old',
          status: 'complete',
          started_at: '2026-02-24T10:00:00.000Z',
          completed_at: '2026-02-24T10:05:00.000Z',
          total_blocks: 10,
          completed_blocks: 10,
          failed_blocks: 0,
        },
      ],
      'PT24H',
      now,
    );
    expect(filtered.map((run) => run.run_id)).toEqual(['run-1', 'run-2', 'run-3']);
  });

  it('builds revisions timeline sorted by timestamp descending', () => {
    const docs: FlowDocumentSummary[] = [
      {
        source_uid: 'doc-1',
        doc_title: 'Doc One',
        status: 'uploaded',
        uploaded_at: '2026-02-26T09:00:00.000Z',
        source_type: 'pdf',
      },
    ];
    const items = buildRevisionItems(docs, RUNS, '2026-02-26T11:00:00.000Z');
    expect(items[0]?.type).toBe('flow-update');
    expect(items.some((item) => item.type === 'run-complete')).toBe(true);
    expect(items.some((item) => item.type === 'document-upload')).toBe(true);
  });

  it('estimates peak concurrency by overlapping run windows', () => {
    const peak = estimatePeakConcurrency(RUNS, new Date('2026-02-26T10:04:00.000Z'));
    expect(peak).toBe(3);
  });

  it('builds dependency list excluding current flow', () => {
    const projects: FlowDependencyProject[] = [
      { project_id: 'flow-1', project_name: 'Current', updated_at: '2026-02-26T10:00:00.000Z' },
      { project_id: 'flow-2', project_name: 'Sibling A', updated_at: '2026-02-26T11:00:00.000Z' },
      { project_id: 'flow-3', project_name: 'Sibling B', updated_at: '2026-02-26T09:00:00.000Z' },
    ];
    const deps = buildDependencyItems('flow-1', projects);
    expect(deps.map((item) => item.project_id)).toEqual(['flow-2', 'flow-3']);
  });
});
