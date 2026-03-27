import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgchainBenchmarkWorkbenchPage from './AgchainBenchmarkWorkbenchPage';

afterEach(() => {
  cleanup();
});

describe('AgchainBenchmarkWorkbenchPage', () => {
  it('renders benchmark title from route param', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route path="/app/agchain/benchmarks/:benchmarkId" element={<AgchainBenchmarkWorkbenchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Legal-10' })).toBeInTheDocument();
  });

  it('shows Steps section by default when no hash is present', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route path="/app/agchain/benchmarks/:benchmarkId" element={<AgchainBenchmarkWorkbenchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Steps/)).toBeInTheDocument();
  });
});
