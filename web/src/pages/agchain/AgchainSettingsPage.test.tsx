import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AgchainSettingsPage from './AgchainSettingsPage';

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainSettingsPage', () => {
  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        project_id: 'project-1',
        project_slug: 'legal-evals',
        project_name: 'Legal Evals',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      loading: false,
    });
  });

  function RedirectTarget() {
    const location = useLocation();
    return <div data-testid="redirect-target">{location.pathname}</div>;
  }

  it('redirects the settings index route into organization members', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/settings']}>
        <Routes>
          <Route path="/app/agchain/settings" element={<AgchainSettingsPage />} />
          <Route path="/app/agchain/settings/organization/members" element={<RedirectTarget />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('redirect-target')).toHaveTextContent('/app/agchain/settings/organization/members');
  });

  it('redirects regardless of project focus state because page-local gating moved to section routes', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/app/agchain/settings']}>
        <Routes>
          <Route path="/app/agchain/settings" element={<AgchainSettingsPage />} />
          <Route path="/app/agchain/settings/organization/members" element={<RedirectTarget />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('redirect-target')).toHaveTextContent('/app/agchain/settings/organization/members');
  });
});
