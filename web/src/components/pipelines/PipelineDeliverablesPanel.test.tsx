import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineDeliverablesPanel } from './PipelineDeliverablesPanel';

afterEach(() => {
  cleanup();
});

describe('PipelineDeliverablesPanel', () => {
  it('keeps downloads disabled until the job completes', () => {
    render(
      <PipelineDeliverablesPanel
        job={{
          job_id: 'job-1',
          pipeline_kind: 'markdown_index_builder',
          source_uid: 'source-1',
          status: 'running',
          stage: 'embedding',
          deliverables: [
            {
              deliverable_kind: 'semantic_zip',
              filename: 'asset.semantic.zip',
              content_type: 'application/zip',
              byte_size: 321,
              created_at: '2026-03-28T00:00:00Z',
            },
          ],
        }}
        onDownload={vi.fn()}
        downloadError={null}
        downloadingKind={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'Download asset.semantic.zip' })).toBeDisabled();
  });

  it('enables deliverable downloads when the job completes', async () => {
    const onDownload = vi.fn().mockResolvedValue(undefined);

    render(
      <PipelineDeliverablesPanel
        job={{
          job_id: 'job-1',
          pipeline_kind: 'markdown_index_builder',
          source_uid: 'source-1',
          status: 'complete',
          stage: 'complete',
          deliverables: [
            {
              deliverable_kind: 'semantic_zip',
              filename: 'asset.semantic.zip',
              content_type: 'application/zip',
              byte_size: 321,
              created_at: '2026-03-28T00:00:00Z',
            },
          ],
        }}
        onDownload={onDownload}
        downloadError={null}
        downloadingKind={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download asset.semantic.zip' }));

    await waitFor(() => {
      expect(onDownload).toHaveBeenCalledWith({
        deliverable_kind: 'semantic_zip',
        filename: 'asset.semantic.zip',
        content_type: 'application/zip',
        byte_size: 321,
        created_at: '2026-03-28T00:00:00Z',
      });
    });
  });
});
