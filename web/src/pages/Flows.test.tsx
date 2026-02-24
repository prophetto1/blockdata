import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import Flows from './Flows';

const { navigateMock, fromMock } = vi.hoisted(() => {
  const order = vi.fn().mockResolvedValue({ data: [], error: null });
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));
  return {
    navigateMock: vi.fn(),
    fromMock: from,
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

describe('Flows page', () => {
  it('shows Kestra-like primary header actions including source search', async () => {
    render(
      <MantineProvider>
        <Flows />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: /source search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
