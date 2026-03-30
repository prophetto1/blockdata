import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PipelineSourceSetPanel } from './PipelineSourceSetPanel';

describe('PipelineSourceSetPanel', () => {
  it('renders the selected processing set with label, ordering, and run action', async () => {
    const onLabelChange = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onRemove = vi.fn();
    const onRun = vi.fn().mockResolvedValue(undefined);

    render(
      <PipelineSourceSetPanel
        label="Release corpus"
        selectedSources={[
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
        projectId="project-1"
        isRunning={false}
        onLabelChange={onLabelChange}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
        onRun={onRun}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Processing set' })).toBeInTheDocument();
    expect(screen.getByLabelText('Source set label')).toHaveValue('Release corpus');

    fireEvent.change(screen.getByLabelText('Source set label'), {
      target: { value: 'Q2 corpus' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Move Notes.md up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Guide.md down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Guide.md from processing set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start processing' }));

    expect(onLabelChange).toHaveBeenCalledWith('Q2 corpus');
    expect(onMoveUp).toHaveBeenCalledWith('source-2');
    expect(onMoveDown).toHaveBeenCalledWith('source-1');
    expect(onRemove).toHaveBeenCalledWith('source-1');
    await waitFor(() => {
      expect(onRun).toHaveBeenCalled();
    });
  });
});
