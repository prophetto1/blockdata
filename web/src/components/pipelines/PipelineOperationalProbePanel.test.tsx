import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineOperationalProbePanel } from './PipelineOperationalProbePanel';
import type { RuntimeProbeRun } from '@/lib/pipelineService';

afterEach(() => {
  cleanup();
});

function makeProbeRun(overrides?: Partial<RuntimeProbeRun>): RuntimeProbeRun {
  return {
    probe_run_id: 'probe-run-1',
    probe_kind: 'pipeline_browser_upload_probe',
    check_id: null,
    result: 'ok',
    duration_ms: 12.4,
    evidence: {},
    failure_reason: null,
    created_at: '2026-04-08T19:00:00Z',
    ...overrides,
  };
}

describe('PipelineOperationalProbePanel', () => {
  it('renders both proof controls with unverified state when no probe runs exist yet', () => {
    render(
      <PipelineOperationalProbePanel
        serviceLabel="Index Builder"
        browserUploadRun={null}
        jobExecutionRun={null}
        isRunningBrowserUpload={false}
        isRunningJobExecution={false}
        onRunBrowserUpload={vi.fn()}
        onRunJobExecution={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: /operational proof/i })).toBeInTheDocument();
    expect(screen.getByText(/index builder backend proof/i)).toBeInTheDocument();
    expect(screen.getAllByText('Unverified')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /run browser upload probe/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run job execution probe/i })).toBeInTheDocument();
  });

  it('renders persisted success evidence and triggers the requested probe actions', () => {
    const onRunBrowserUpload = vi.fn();
    const onRunJobExecution = vi.fn();

    render(
      <PipelineOperationalProbePanel
        serviceLabel="Index Builder"
        browserUploadRun={makeProbeRun({
          evidence: {
            source_uid: 'probe-source-1',
            pipeline_source_id: 'pipeline-source-1',
            source_registry_verified: true,
          },
        })}
        jobExecutionRun={makeProbeRun({
          probe_run_id: 'probe-run-2',
          probe_kind: 'pipeline_job_execution_probe',
          evidence: {
            source_set_id: 'source-set-1',
            job_id: 'job-1',
            deliverable_kind: 'lexical_sqlite',
            deliverable_download_verified: true,
          },
        })}
        isRunningBrowserUpload={false}
        isRunningJobExecution={false}
        onRunBrowserUpload={onRunBrowserUpload}
        onRunJobExecution={onRunJobExecution}
      />,
    );

    expect(screen.getAllByText('Verified')).toHaveLength(2);
    expect(screen.getByText(/pipeline source registered: pipeline-source-1/i)).toBeInTheDocument();
    expect(screen.getByText(/deliverable download verified: lexical_sqlite/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /run browser upload probe/i }));
    fireEvent.click(screen.getByRole('button', { name: /run job execution probe/i }));

    expect(onRunBrowserUpload).toHaveBeenCalledTimes(1);
    expect(onRunJobExecution).toHaveBeenCalledTimes(1);
  });
});
