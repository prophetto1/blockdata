import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainBenchmarkNav } from './AgchainBenchmarkNav';

afterEach(() => {
  cleanup();
});

function renderNav(benchmarkId: string, initialHash = '') {
  const path = `/app/agchain/benchmarks/${benchmarkId}${initialHash}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AgchainBenchmarkNav benchmarkId={benchmarkId} />
    </MemoryRouter>,
  );
}

describe('AgchainBenchmarkNav', () => {
  it('renders all 9 benchmark sub-sections', () => {
    renderNav('legal-10');
    const nav = screen.getByTestId('agchain-secondary-rail');
    expect(nav).toBeInTheDocument();

    const expectedLabels = [
      'Steps', 'Questions', 'Context', 'State', 'Scoring',
      'Models', 'Runner', 'Validation', 'Runs',
    ];
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('defaults to #steps as active when no hash is present', () => {
    renderNav('legal-10');
    const stepsLink = screen.getByText('Steps').closest('a');
    expect(stepsLink).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the active item matching the current hash', () => {
    renderNav('legal-10', '#scoring');
    const scoringLink = screen.getByText('Scoring').closest('a');
    expect(scoringLink).toHaveAttribute('aria-current', 'page');

    const stepsLink = screen.getByText('Steps').closest('a');
    expect(stepsLink).not.toHaveAttribute('aria-current');
  });

  it('generates correct hrefs for each section', () => {
    renderNav('legal-10');
    const stepsLink = screen.getByText('Steps').closest('a');
    expect(stepsLink).toHaveAttribute('href', '/app/agchain/benchmarks/legal-10#steps');

    const runsLink = screen.getByText('Runs').closest('a');
    expect(runsLink).toHaveAttribute('href', '/app/agchain/benchmarks/legal-10#runs');
  });

  it('encodes benchmark IDs with special characters', () => {
    renderNav('my benchmark');
    const stepsLink = screen.getByText('Steps').closest('a');
    expect(stepsLink).toHaveAttribute('href', '/app/agchain/benchmarks/my%20benchmark#steps');
  });
});