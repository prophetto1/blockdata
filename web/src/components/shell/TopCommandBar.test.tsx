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
});
