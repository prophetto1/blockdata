import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAgchainBenchmarkRegistryMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/lib/agchainBenchmarks', () => ({
  fetchAgchainBenchmarkRegistry: (...args: unknown[]) => fetchAgchainBenchmarkRegistryMock(...args),
}));

vi.mock('@/components/agchain/benchmarks/AgchainBenchmarksTable', () => ({
  AgchainBenchmarksTable: () => <div data-testid="agchain-benchmarks-table-mock">table</div>,
}));

async function importPage() {
  return import('./AgchainBenchmarksDemo');
}

describe('AgchainBenchmarksDemo', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchAgchainBenchmarkRegistryMock.mockReset();
    fetchAgchainBenchmarkRegistryMock.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('matches layout-captures content padding instead of adding a second inner inset', async () => {
    const { Component } = await importPage();
    render(<Component />);

    const content = await screen.findByTestId('agchain-benchmarks-page-content');
    expect(content).toHaveClass('px-4', 'pt-3');
    expect(content).not.toHaveClass('p-4');
  });
});
