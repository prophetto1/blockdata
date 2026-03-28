import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PipelineJobStatusPanel } from './PipelineJobStatusPanel';

describe('PipelineJobStatusPanel', () => {
  it('renders running job status details', () => {
    render(
      <PipelineJobStatusPanel
        job={{
          job_id: 'job-1',
          pipeline_kind: 'markdown_index_builder',
          source_uid: 'source-1',
          status: 'running',
          stage: 'embedding',
          chunk_count: 12,
          section_count: 4,
          deliverables: [],
        }}
        loading={false}
        error={null}
        isPolling
      />,
    );

    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('embedding')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Polling for updates...')).toBeInTheDocument();
  });

  it('renders failure details when the job fails', () => {
    render(
      <PipelineJobStatusPanel
        job={{
          job_id: 'job-1',
          pipeline_kind: 'markdown_index_builder',
          source_uid: 'source-1',
          status: 'failed',
          stage: 'failed',
          failure_stage: 'embedding',
          error_message: 'Missing embedding credential',
          deliverables: [],
        }}
        loading={false}
        error={null}
        isPolling={false}
      />,
    );

    expect(screen.getByText('Missing embedding credential')).toBeInTheDocument();
    expect(screen.getByText('embedding')).toBeInTheDocument();
  });
});
