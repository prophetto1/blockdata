import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useStorageQuotaMock = vi.fn(() => ({
  loading: false,
  data: null,
  error: null,
  refresh: vi.fn(),
}));

vi.mock('@/hooks/useStorageQuota', () => ({
  useStorageQuota: () => useStorageQuotaMock(),
}));

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: () => <div data-testid="assets-workbench" />,
}));

vi.mock('./useAssetsWorkbench', () => ({
  ASSETS_TABS: [],
  ASSETS_DEFAULT_PANES: [],
  useAssetsWorkbench: () => ({
    renderContent: () => null,
    workbenchRef: { current: null },
  }),
}));

import ProjectAssetsPage from './ProjectAssetsPage';

describe('ProjectAssetsPage rail relocation', () => {
  it('does not own the storage quota card in the content area', () => {
    render(<ProjectAssetsPage />);

    expect(useStorageQuotaMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('assets-workbench')).toBeInTheDocument();
    expect(screen.queryByText(/loading storage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
  });
});
