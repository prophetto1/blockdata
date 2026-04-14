import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AgchainBenchmarksTable } from './AgchainBenchmarksTable';
import type { AgchainBenchmarkRegistryRow } from '@/lib/agchainBenchmarks';

const ROW: AgchainBenchmarkRegistryRow = {
  benchmark_id: 'bench_123',
  benchmark_slug: 'demo-benchmark',
  benchmark_name: 'Demo Benchmark',
  description: 'Measures the end-to-end evaluation pipeline.',
  state: 'ready',
  current_spec_label: 'Spec A',
  current_spec_version: 'v3',
  version_status: 'published',
  step_count: 8,
  selected_eval_model_count: 4,
  tested_model_count: 2,
  tested_policy_bundle_count: 1,
  validation_status: 'warn',
  validation_issue_count: 2,
  last_run_at: '2026-04-12T08:30:00Z',
  updated_at: '2026-04-13T10:00:00Z',
  href: '/app/agchain/benchmarks/demo-benchmark',
};

describe('AgchainBenchmarksTable', () => {
  it('renders benchmark rows with compact registry semantics', () => {
    render(
      <MemoryRouter>
        <AgchainBenchmarksTable items={[ROW]} loading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Benchmark registry')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Benchmark' })).not.toHaveClass('uppercase');
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('WARN')).toBeInTheDocument();
    expect(screen.getByText('2 issues')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open benchmark/i })).toBeInTheDocument();
  });
});
