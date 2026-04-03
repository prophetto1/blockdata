import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PipelineJobStatusPanel } from './PipelineJobStatusPanel';

describe('PipelineJobStatusPanel', () => {
  it('renders the fixed stage tracker with correct progress mapping', () => {
    render(
      <PipelineJobStatusPanel
        job={{
          job_id: 'job-1',
          pipeline_kind: 'markdown_index_builder',
          source_set_id: 'set-1',
          status: 'running',
          stage: 'parsing',
          chunk_count: 12,
          section_count: 4,
          deliverables: [],
        }}
        sourceSetLabel="Release corpus"
        selectedSources={[
          {
            pipeline_source_id: 'psrc-1',
            source_uid: 'source-1',
            project_id: 'project-1',
            doc_title: 'Guide.md',
            source_type: 'md',
          },
          {
            pipeline_source_id: 'psrc-2',
            source_uid: 'source-2',
            project_id: 'project-1',
            doc_title: 'Notes.md',
            source_type: 'md',
          },
        ]}
        processingRequested
        loading={false}
        error={null}
        isPolling
      />,
    );

    expect(screen.getByRole('heading', { name: 'Processing' })).toBeInTheDocument();
    expect(screen.getByText('Release corpus')).toBeInTheDocument();
    expect(screen.getByLabelText('Stage Loading sources: done')).toBeInTheDocument();
    expect(screen.getByLabelText('Stage Consolidating: done')).toBeInTheDocument();
    expect(screen.getByLabelText('Stage Parsing: in progress')).toBeInTheDocument();
    expect(screen.getByLabelText('Stage Packaging: pending')).toBeInTheDocument();
    expect(screen.getByText('Polling for updates...')).toBeInTheDocument();
  });

  it('renders failure details on the failed stage', () => {
    render(
      <PipelineJobStatusPanel
        job={{
          job_id: 'job-1',
          pipeline_kind: 'markdown_index_builder',
          source_set_id: 'set-1',
          status: 'failed',
          stage: 'failed',
          failure_stage: 'embedding',
          error_message: 'Missing embedding credential',
          deliverables: [],
        }}
        sourceSetLabel="Release corpus"
        selectedSources={[
          {
            pipeline_source_id: 'psrc-1',
            source_uid: 'source-1',
            project_id: 'project-1',
            doc_title: 'Guide.md',
            source_type: 'md',
          },
        ]}
        processingRequested
        loading={false}
        error={null}
        isPolling={false}
      />,
    );

    expect(screen.getByLabelText('Stage Embedding: failed')).toBeInTheDocument();
    expect(screen.getByText('Missing embedding credential')).toBeInTheDocument();
  });
});
