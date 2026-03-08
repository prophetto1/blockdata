import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ExecutionsPage from './ExecutionsPage';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

describe('ExecutionsPage', () => {
  it('renders a Kestra-style executions shell with actions and table columns', () => {
    render(<ExecutionsPage />);

    expect(screen.getByRole('heading', { name: 'Executions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add filters' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search executions')).toBeInTheDocument();
    expect(screen.getByText('Start date')).toBeInTheDocument();
    expect(screen.getByText('End date')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Namespace')).toBeInTheDocument();
    expect(screen.getByText('Flow')).toBeInTheDocument();
    expect(screen.getByText('State')).toBeInTheDocument();
  });
});
