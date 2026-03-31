import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PipelineUploadPanel } from './PipelineUploadPanel';

describe('PipelineUploadPanel', () => {
  it('supports bulk markdown upload for the locked upload phase', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);

    render(
      <PipelineUploadPanel
        service={{
          slug: 'index-builder',
          label: 'Index Builder',
          description: 'Upload owned markdown sources, persist ordered source sets, queue backend processing, and produce downloadable lexical and semantic retrieval packages.',
          pipelineKind: 'markdown_index_builder',
          eligibleSourceTypes: ['md', 'markdown'],
          deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
        }}
        projectId="project-1"
        onUpload={onUpload}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Index Builder' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument();
    expect(screen.getByText('Drop markdown files here or click to upload')).toBeInTheDocument();
    expect(screen.queryByText('Import From URL')).not.toBeInTheDocument();

    const input = screen.getByLabelText('Add markdown files') as HTMLInputElement;
    expect(input.accept).toBe('.md,.markdown,text/markdown');
    expect(input.multiple).toBe(true);

    fireEvent.change(input, {
      target: {
        files: [
          new File(['# Hello'], 'guide.md', { type: 'text/markdown' }),
          new File(['# Notes'], 'notes.md', { type: 'text/markdown' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([
        expect.any(File),
        expect.any(File),
      ]);
    });
    expect(screen.getByText('2 files ready for upload.')).toBeInTheDocument();
    expect(screen.getByText('Upload complete.')).toBeInTheDocument();
  });
});
