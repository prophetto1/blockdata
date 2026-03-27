import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainBenchmarksPage from './AgchainBenchmarksPage';

afterEach(() => {
  cleanup();
});

describe('AgchainBenchmarksPage', () => {
  it('shows a benchmark catalog table with workbench entry points', () => {
    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Benchmarks' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Benchmark' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Current Spec' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Steps' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Selected Eval Models' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tested Models' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open Workbench' }).length).toBeGreaterThan(0);
  });
});
