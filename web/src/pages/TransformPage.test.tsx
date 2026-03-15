import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TransformPage from './TransformPage';
import { EXTRACT_DEFAULT_PANES, EXTRACT_TABS, useExtractWorkbench } from './useExtractWorkbench';

vi.mock('./useExtractWorkbench', () => ({
  EXTRACT_TABS: [{ id: 'extract-files', label: 'File List' }],
  EXTRACT_DEFAULT_PANES: [{ id: 'pane-extract-files', tabs: ['extract-files'], activeTab: 'extract-files' }],
  useExtractWorkbench: vi.fn(() => ({ renderContent: () => <div>Transform content</div> })),
}));

const workbenchMock = vi.fn();

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: (props: Record<string, unknown>) => {
    workbenchMock(props);
    return <div>Workbench</div>;
  },
}));

describe('TransformPage', () => {
  it('reuses the extract workbench layout with transform-specific page settings', () => {
    render(<TransformPage />);

    expect(useExtractWorkbench).toHaveBeenCalledWith({ title: 'Transform Documents' });
    expect(workbenchMock).toHaveBeenCalledWith(expect.objectContaining({
      tabs: EXTRACT_TABS,
      defaultPanes: EXTRACT_DEFAULT_PANES,
      saveKey: 'transform-documents-v1',
      className: 'transform-workbench',
      hideToolbar: true,
      disableDrag: true,
      lockLayout: true,
      maxColumns: 3,
    }));
  });
});
