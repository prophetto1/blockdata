import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainProjectFocus } from './useAgchainProjectFocus';

const fetchAgchainBenchmarksMock = vi.fn();

vi.mock('@/lib/agchainBenchmarks', () => ({
  fetchAgchainBenchmarks: (...args: unknown[]) => fetchAgchainBenchmarksMock(...args),
}));

describe('useAgchainProjectFocus', () => {
  beforeEach(() => {
    fetchAgchainBenchmarksMock.mockReset();
    window.localStorage.clear();
    fetchAgchainBenchmarksMock.mockResolvedValue({
      items: [
        {
          benchmark_id: 'benchmark-1',
          benchmark_slug: 'legal-10',
          benchmark_name: 'Legal-10',
          description: 'Legal benchmark package',
          state: 'draft',
          current_spec_label: 'draft v0.1.0',
          current_spec_version: 'v0.1.0',
          version_status: 'draft',
          step_count: 3,
          selected_eval_model_count: 2,
          tested_model_count: 0,
          tested_policy_bundle_count: 0,
          validation_status: 'warn',
          validation_issue_count: 2,
          last_run_at: null,
          updated_at: '2026-03-27T08:15:00Z',
          href: '/app/agchain/benchmarks/legal-10#steps',
        },
        {
          benchmark_id: 'benchmark-2',
          benchmark_slug: 'finance-eval',
          benchmark_name: 'Finance Eval',
          description: 'Finance evaluation package',
          state: 'ready',
          current_spec_label: 'ready v1.0.0',
          current_spec_version: 'v1.0.0',
          version_status: 'published',
          step_count: 5,
          selected_eval_model_count: 3,
          tested_model_count: 1,
          tested_policy_bundle_count: 0,
          validation_status: 'pass',
          validation_issue_count: 0,
          last_run_at: null,
          updated_at: '2026-03-28T08:15:00Z',
          href: '/app/agchain/benchmarks/finance-eval#steps',
        },
      ],
      total: 2,
      limit: 50,
      offset: 0,
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('resolves persisted AGChain project focus when the stored slug is still valid', async () => {
    window.localStorage.setItem('agchain.projectFocusSlug', 'finance-eval');

    const { result } = renderHook(() => useAgchainProjectFocus());

    await waitFor(() => {
      expect(result.current.focusedProjectSlug).toBe('finance-eval');
    });

    expect(result.current.focusedProject?.benchmark_name).toBe('Finance Eval');
  });

  it('falls back to the first available benchmark row when no stored focus exists', async () => {
    const { result } = renderHook(() => useAgchainProjectFocus());

    await waitFor(() => {
      expect(result.current.focusedProjectSlug).toBe('legal-10');
    });

    expect(result.current.focusedProject?.benchmark_name).toBe('Legal-10');
  });

  it('clears invalid stored focus and replaces it with the first available benchmark row', async () => {
    window.localStorage.setItem('agchain.projectFocusSlug', 'missing-benchmark');

    const { result } = renderHook(() => useAgchainProjectFocus());

    await waitFor(() => {
      expect(result.current.focusedProjectSlug).toBe('legal-10');
    });

    expect(window.localStorage.getItem('agchain.projectFocusSlug')).toBe('legal-10');
    expect(result.current.focusedProject?.benchmark_name).toBe('Legal-10');
  });
});
