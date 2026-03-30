import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PipelineSourceFilesPanel } from './PipelineSourceFilesPanel';

describe('PipelineSourceFilesPanel', () => {
  it('renders uploaded markdown inventory and toggles files into the processing set', () => {
    const onToggleSource = vi.fn();

    render(
      <PipelineSourceFilesPanel
        sources={[
          {
            source_uid: 'source-1',
            project_id: 'project-1',
            doc_title: 'Guide.md',
            source_type: 'md',
            byte_size: 1200,
          },
          {
            source_uid: 'source-2',
            project_id: 'project-1',
            doc_title: 'Notes.md',
            source_type: 'md',
            byte_size: 2400,
          },
        ]}
        loading={false}
        error={null}
        selectedSourceUids={['source-2']}
        onToggleSource={onToggleSource}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Uploaded markdown files' })).toBeInTheDocument();
    expect(screen.getByText('Guide.md')).toBeInTheDocument();
    expect(screen.getByText('Notes.md')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Guide.md to processing set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Notes.md from processing set' }));

    expect(onToggleSource).toHaveBeenNthCalledWith(1, 'source-1');
    expect(onToggleSource).toHaveBeenNthCalledWith(2, 'source-2');
  });
});
