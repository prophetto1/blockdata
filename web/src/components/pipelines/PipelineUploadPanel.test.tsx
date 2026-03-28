import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PipelineUploadPanel } from './PipelineUploadPanel';

describe('PipelineUploadPanel', () => {
  it('supports markdown upload and manual source-trigger selection', async () => {
    const onSelectSource = vi.fn();
    const onTrigger = vi.fn().mockResolvedValue(undefined);
    const onUpload = vi.fn().mockResolvedValue(undefined);

    render(
      <PipelineUploadPanel
        service={{
          slug: 'index-builder',
          label: 'Index Builder',
          description: 'Build lexical and semantic retrieval packages from markdown sources.',
          pipelineKind: 'markdown_index_builder',
          eligibleSourceTypes: ['md', 'markdown'],
          deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
        }}
        projectId="project-1"
        sources={[
          {
            source_uid: 'source-1',
            project_id: 'project-1',
            doc_title: 'Guide.md',
            source_type: 'md',
          },
        ]}
        sourcesLoading={false}
        sourcesError={null}
        selectedSourceUid="source-1"
        onSelectSource={onSelectSource}
        onTrigger={onTrigger}
        onUpload={onUpload}
        isTriggering={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Index Builder' })).toBeInTheDocument();
    expect(screen.getByText('markdown_index_builder')).toBeInTheDocument();
    expect(screen.getByText('lexical_sqlite, semantic_zip')).toBeInTheDocument();
    expect(screen.getByText('md, markdown')).toBeInTheDocument();

    const input = screen.getByLabelText('Upload markdown source') as HTMLInputElement;
    expect(input.accept).toBe('.md,.markdown,text/markdown');

    fireEvent.change(screen.getByLabelText('Owned markdown source'), {
      target: { value: 'source-1' },
    });
    expect(onSelectSource).toHaveBeenCalledWith('source-1');

    fireEvent.change(input, {
      target: {
        files: [new File(['# Hello'], 'guide.md', { type: 'text/markdown' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(expect.any(File));
    });
    expect(onTrigger).not.toHaveBeenCalled();
    expect(screen.getByText('Upload complete.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start processing' }));
    await waitFor(() => {
      expect(onTrigger).toHaveBeenCalled();
    });
  });
});
