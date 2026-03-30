import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainBenchmarkNav } from './AgchainBenchmarkNav';

afterEach(() => {
  cleanup();
});

function renderNav(initialHash = '') {
  const path = `/app/agchain/settings/project/benchmark-definition${initialHash}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AgchainBenchmarkNav />
    </MemoryRouter>,
  );
}

describe('AgchainBenchmarkNav', () => {
  it('renders all 9 benchmark sub-sections', () => {
    renderNav();
    const nav = screen.getByTestId('agchain-benchmark-nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveStyle({ backgroundColor: 'var(--sidebar-accent)' });
    expect(nav.className).toContain('border-r');
    expect(nav.className).toContain('border-sidebar-border');

    const expectedLabels = [
      'Steps', 'Questions', 'Context', 'State', 'Scoring',
      'Models', 'Runner', 'Validation', 'Runs',
    ];
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('defaults to #steps as active when no hash is present', () => {
    renderNav();
    const stepsLink = screen.getByText('Steps').closest('a');
    expect(stepsLink).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the active item matching the current hash', () => {
    renderNav('#scoring');
    const scoringLink = screen.getByText('Scoring').closest('a');
    expect(scoringLink).toHaveAttribute('aria-current', 'page');

    const stepsLink = screen.getByText('Steps').closest('a');
    expect(stepsLink).not.toHaveAttribute('aria-current');
  });

  it('generates hidden benchmark-definition hrefs under project settings', () => {
    renderNav();
    const stepsLink = screen.getByText('Steps').closest('a');
    expect(stepsLink).toHaveAttribute('href', '/app/agchain/settings/project/benchmark-definition#steps');

    const runsLink = screen.getByText('Runs').closest('a');
    expect(runsLink).toHaveAttribute('href', '/app/agchain/settings/project/benchmark-definition#runs');
  });
});
