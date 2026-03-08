import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutionsTab } from './ExecutionsTab';

const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function buildExecutionsQueryResult(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data,
      error: null,
    }),
  };
}

describe('ExecutionsTab', () => {
  beforeEach(() => {
    fromMock.mockReset();
    fromMock.mockImplementation((table: string) => {
      if (table === 'flow_executions') {
        return buildExecutionsQueryResult([]);
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('matches the baseline empty executions view and opens the column picker on demand', async () => {
    render(<ExecutionsTab flowId="business-automation" />);

    expect(screen.getByRole('button', { name: 'Add filters' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search executions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter settings' })).toBeInTheDocument();
    expect(screen.getByText('Show Chart')).toBeInTheDocument();
    expect(screen.getByText('Periodic refresh')).toBeInTheDocument();
    expect(screen.getByText('Columns')).toBeInTheDocument();
    expect(screen.getByText('Inputs')).toBeInTheDocument();
    expect(screen.getByText('Outputs')).toBeInTheDocument();
    expect(screen.getByText('Task ID')).toBeInTheDocument();
    expect(screen.getByText('Parent execution')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(await screen.findByText('No Executions Found')).toBeInTheDocument();
    expect(screen.queryByText('Customize table columns')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));

    expect(screen.getByText('Customize table columns')).toBeInTheDocument();
    expect(screen.getByText('Drag to reorder columns')).toBeInTheDocument();
    expect(screen.getByText('Outputs emitted by the execution')).toBeInTheDocument();
    expect(screen.getByText('ID of the last task in the execution')).toBeInTheDocument();
    expect(screen.getByText('Trigger that started the execution')).toBeInTheDocument();
    expect(screen.getByText('Parent execution ID that triggered this execution')).toBeInTheDocument();
    expect(screen.getByText('12 of 13 columns visible')).toBeInTheDocument();
  });

  it('does not inject seeded execution rows for empty flows', async () => {
    render(<ExecutionsTab flowId="default" />);

    expect(await screen.findByText('No Executions Found')).toBeInTheDocument();
    expect(screen.queryByText('exec_defa')).not.toBeInTheDocument();
    expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
  });
});
