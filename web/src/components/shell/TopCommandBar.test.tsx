import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TopCommandBar } from './TopCommandBar';

vi.mock('@/components/shell/HeaderCenterContext', () => ({
  useHeaderCenter: () => ({
    center: null,
    shellTopSlots: null,
  }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    toggle: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/components/shell/ProjectSwitcher', () => ({
  ProjectSwitcher: () => <div data-testid="project-switcher">Project Switcher</div>,
}));

vi.mock('./ShellWorkspaceSelector', () => ({
  ShellWorkspaceSelector: () => <button type="button">Workspace Selector</button>,
}));

afterEach(() => {
  cleanup();
});

describe('TopCommandBar', () => {
  it('keeps the project switcher on the left and places the workspace selector with the right-side controls', () => {
    render(
      <MemoryRouter>
        <TopCommandBar onToggleNav={vi.fn()} />
      </MemoryRouter>,
    );

    const left = screen.getByTestId('top-command-bar-left');
    const right = screen.getByTestId('top-command-bar-right');

    expect(within(left).getByTestId('project-switcher')).toBeInTheDocument();
    expect(within(left).queryByRole('button', { name: /workspace selector/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(within(right).getByRole('button', { name: /toggle color scheme/i })).toBeInTheDocument();
    expect(within(right).getByRole('button', { name: /workspace selector/i })).toBeInTheDocument();
  });

  it('preserves the search grid slot when search is hidden so right-side controls do not shift columns', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/runs']}>
        <TopCommandBar onToggleNav={vi.fn()} hideProjectSwitcher hideSearch />
      </MemoryRouter>,
    );

    const searchSlot = screen.getByTestId('top-command-bar-search-slot');
    const right = screen.getByTestId('top-command-bar-right');

    expect(searchSlot).toBeInTheDocument();
    expect(searchSlot).toBeEmptyDOMElement();
    expect(within(right).getByRole('button', { name: /toggle color scheme/i })).toBeInTheDocument();
    expect(within(right).getByRole('button', { name: /workspace selector/i })).toBeInTheDocument();
  });

  it('renders a caller-provided primary context in place of the default project switcher', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks']}>
        <TopCommandBar
          onToggleNav={vi.fn()}
          hideSearch
          primaryContext={<div data-testid="agchain-project-context">Focused AGChain Project</div>}
        />
      </MemoryRouter>,
    );

    const left = screen.getByTestId('top-command-bar-left');

    expect(within(left).getByTestId('agchain-project-context')).toHaveTextContent('Focused AGChain Project');
    expect(within(left).queryByTestId('project-switcher')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /workspace selector/i })).toBeInTheDocument();
  });
});
