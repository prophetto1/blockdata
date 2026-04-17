import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShellPlatformToggle } from './ShellPlatformToggle';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

describe('ShellPlatformToggle', () => {
  it('renders a two-way platform toggle with the active platform pressed', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <ShellPlatformToggle />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Blockdata' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'AG chain' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('combobox', { name: /workspace/i })).not.toBeInTheDocument();
  });

  it('navigates when a different platform is selected', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <ShellPlatformToggle />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Blockdata' }));

    expect(navigateMock).toHaveBeenCalledWith('/app');
  });
});
