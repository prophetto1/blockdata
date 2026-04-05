import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanDocumentPane } from './PlanDocumentPane';

vi.mock('@/components/ui/segmented-control', () => ({
  SegmentedControl: ({ data }: { data: Array<{ label: string }> }) => (
    <div data-testid="segmented-control">
      {data.map((item) => item.label).join(' | ')}
    </div>
  ),
}));

vi.mock('./MdxEditorSurface', () => ({
  MdxEditorSurface: () => <div data-testid="mdx-editor-surface">editor</div>,
}));

describe('PlanDocumentPane', () => {
  it('uses the top status rail as the only connect control when disconnected', () => {
    const { container } = render(
      <PlanDocumentPane
        artifact={null}
        content=""
        diffMarkdown=""
        fileKey="empty"
        viewMode="rich-text"
        dirty={false}
        hasDirectory={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onOpenPlansDirectory={vi.fn()}
        onViewModeChange={vi.fn()}
      />,
    );

    const pane = container.querySelector('[data-testid="plan-document-pane"]');
    expect(pane).not.toBeNull();
    const scoped = within(pane as HTMLElement);

    expect(scoped.getByText('Directory not connected.')).toBeInTheDocument();
    expect(scoped.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
    expect(scoped.getAllByRole('button', { name: 'Connect' })).toHaveLength(1);
    expect(scoped.queryByText('Open the plans directory')).not.toBeInTheDocument();
  });

  it('shows connected status in the top rail and keeps reconnect there when no artifact is selected', () => {
    const { container } = render(
      <PlanDocumentPane
        artifact={null}
        content=""
        diffMarkdown=""
        fileKey="empty"
        viewMode="rich-text"
        dirty={false}
        hasDirectory
        onChange={vi.fn()}
        onSave={vi.fn()}
        onOpenPlansDirectory={vi.fn()}
        onViewModeChange={vi.fn()}
      />,
    );

    const pane = container.querySelector('[data-testid="plan-document-pane"]');
    expect(pane).not.toBeNull();
    const scoped = within(pane as HTMLElement);

    expect(scoped.getByText('Connected to docs/plans. Select a plan artifact.')).toBeInTheDocument();
    expect(scoped.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
    expect(scoped.queryByRole('button', { name: /open plans directory/i })).not.toBeInTheDocument();
  });
});
