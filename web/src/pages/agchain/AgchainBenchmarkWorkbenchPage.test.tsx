import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AGCHAIN_PROJECT_FOCUS_STORAGE_KEY } from '@/hooks/agchain/useAgchainProjectFocus';
import AgchainBenchmarkWorkbenchPage from './AgchainBenchmarkWorkbenchPage';

afterEach(() => {
  cleanup();
});

function BenchmarkTarget() {
  const location = useLocation();
  return (
    <div data-testid="agchain-benchmark-target">
      {location.pathname}
      {location.hash}
    </div>
  );
}

describe('AgchainBenchmarkWorkbenchPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('redirects legacy benchmark routes into the canonical benchmark child page and preserves hash state', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10#scoring']}>
        <Routes>
          <Route path="/app/agchain/benchmarks/:benchmarkId" element={<AgchainBenchmarkWorkbenchPage />} />
          <Route path="/app/agchain/settings/project/benchmark-definition" element={<BenchmarkTarget />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('agchain-benchmark-target')).toHaveTextContent('/app/agchain/settings/project/benchmark-definition#scoring');
    });

    expect(window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY)).toBe('legal-10');
  });

  it('redirects legacy benchmark routes without a hash into the canonical benchmark child page', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route path="/app/agchain/benchmarks/:benchmarkId" element={<AgchainBenchmarkWorkbenchPage />} />
          <Route path="/app/agchain/settings/project/benchmark-definition" element={<BenchmarkTarget />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('agchain-benchmark-target')).toHaveTextContent('/app/agchain/settings/project/benchmark-definition');
    });

    expect(window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY)).toBe('legal-10');
  });
});
