import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainBenchmarksPage from './AgchainBenchmarksPage';

const useAgchainBenchmarkStepsMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainBenchmarkSteps', () => ({
  useAgchainBenchmarkSteps: () => useAgchainBenchmarkStepsMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainBenchmarksPage', () => {
  beforeEach(() => {
    useAgchainBenchmarkStepsMock.mockReset();
    useAgchainBenchmarkStepsMock.mockReturnValue({
      benchmark: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      currentVersion: {
        benchmark_version_id: 'version-1',
        version_label: 'v0.1.0',
        version_status: 'draft',
        plan_family: 'custom',
        step_count: 2,
        validation_status: 'warn',
        validation_issue_count: 2,
      },
      counts: {
        selected_eval_model_count: 2,
        tested_model_count: 1,
      },
      steps: [
        {
          benchmark_step_id: 'step-1',
          step_order: 1,
          step_id: 'd1',
          display_name: 'Issue Spotting',
          step_kind: 'model',
          api_call_boundary: 'own_call',
          inject_payloads: ['p1'],
          scoring_mode: 'none',
          output_contract: 'irac_outline_v1',
          scorer_ref: null,
          judge_prompt_ref: null,
          judge_grades_step_ids: [],
          enabled: true,
          step_config: { system_prompt_ref: 'issue_spotting_v1' },
          updated_at: '2026-03-27T08:15:00Z',
        },
      ],
      selectedStepId: 'step-1',
      selectedStep: {
        benchmark_step_id: 'step-1',
        step_order: 1,
        step_id: 'd1',
        display_name: 'Issue Spotting',
        step_kind: 'model',
        api_call_boundary: 'own_call',
        inject_payloads: ['p1'],
        scoring_mode: 'none',
        output_contract: 'irac_outline_v1',
        scorer_ref: null,
        judge_prompt_ref: null,
        judge_grades_step_ids: [],
        enabled: true,
        step_config: { system_prompt_ref: 'issue_spotting_v1' },
        updated_at: '2026-03-27T08:15:00Z',
      },
      canEdit: true,
      loading: false,
      mutating: false,
      error: null,
      dirtyOrder: false,
      selectStep: vi.fn(),
      moveStep: vi.fn(),
      saveOrder: vi.fn(),
      createStep: vi.fn(),
      updateSelectedStep: vi.fn(),
      deleteSelectedStep: vi.fn(),
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      hasProjectFocus: true,
    });
  });

  it('renders benchmark definition as a selected-project child page rather than a multi-project registry', () => {
    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Benchmark definition' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this benchmark definition page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Step' })).toBeInTheDocument();
    expect(screen.getByText('Issue Spotting')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Benchmark' })).not.toBeInTheDocument();
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainBenchmarkStepsMock.mockReturnValue({
      benchmark: null,
      currentVersion: null,
      counts: { selected_eval_model_count: 0, tested_model_count: 0 },
      steps: [],
      selectedStepId: null,
      selectedStep: null,
      canEdit: false,
      loading: false,
      mutating: false,
      error: null,
      dirtyOrder: false,
      selectStep: vi.fn(),
      moveStep: vi.fn(),
      saveOrder: vi.fn(),
      createStep: vi.fn(),
      updateSelectedStep: vi.fn(),
      deleteSelectedStep: vi.fn(),
      focusedProject: null,
      hasProjectFocus: false,
    });

    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
