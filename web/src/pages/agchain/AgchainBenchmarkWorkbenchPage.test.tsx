import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgchainBenchmarkWorkbenchPage from './AgchainBenchmarkWorkbenchPage';

const platformApiFetchMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  cleanup();
});

describe('AgchainBenchmarkWorkbenchPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/agchain/benchmarks/legal-10' && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          jsonResponse({
            benchmark: {
              benchmark_id: 'benchmark-1',
              benchmark_slug: 'legal-10',
              benchmark_name: 'Legal-10',
              description: 'Three-step benchmark package for legal analysis.',
            },
            current_version: {
              benchmark_version_id: 'version-1',
              version_label: 'v0.1.0',
              version_status: 'draft',
              plan_family: 'custom',
              step_count: 2,
              validation_status: 'warn',
              validation_issue_count: 2,
            },
            permissions: { can_edit: true },
            counts: {
              selected_eval_model_count: 2,
              tested_model_count: 1,
            },
          }),
        );
      }

      if (path === '/agchain/benchmarks/legal-10/steps' && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          jsonResponse({
            benchmark: {
              benchmark_id: 'benchmark-1',
              benchmark_slug: 'legal-10',
              benchmark_name: 'Legal-10',
              description: 'Three-step benchmark package for legal analysis.',
            },
            current_version: {
              benchmark_version_id: 'version-1',
              version_label: 'v0.1.0',
              version_status: 'draft',
              plan_family: 'custom',
              step_count: 2,
              validation_status: 'warn',
              validation_issue_count: 2,
            },
            can_edit: true,
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
              {
                benchmark_step_id: 'step-2',
                step_order: 2,
                step_id: 'j3',
                display_name: 'Judge Pair',
                step_kind: 'judge',
                api_call_boundary: 'own_call',
                inject_payloads: [],
                scoring_mode: 'judge',
                output_contract: 'judge_pair_v1',
                scorer_ref: null,
                judge_prompt_ref: 'irac_mee_pair_v1',
                judge_grades_step_ids: ['d1', 'd2'],
                enabled: true,
                step_config: { temperature: 0 },
                updated_at: '2026-03-27T08:20:00Z',
              },
            ],
          }),
        );
      }

      if (path === '/agchain/benchmarks/legal-10/steps' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            benchmark_step_id: 'step-3',
            step_order: 3,
          }),
        );
      }

      if (path === '/agchain/benchmarks/legal-10/steps/step-1' && init?.method === 'PATCH') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            benchmark_step_id: 'step-1',
          }),
        );
      }

      if (path === '/agchain/benchmarks/legal-10/steps/reorder' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            step_count: 2,
          }),
        );
      }

      if (path === '/agchain/benchmarks/legal-10/steps/step-1' && init?.method === 'DELETE') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            deleted_step_id: 'step-1',
          }),
        );
      }

      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
    });
  });

  it('renders benchmark title from route param', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route path="/app/agchain/benchmarks/:benchmarkId" element={<AgchainBenchmarkWorkbenchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Legal-10' })).toBeInTheDocument();
    });
    const frame = screen.getByTestId('agchain-page-frame');
    expect(frame).toHaveClass('w-full', 'px-4');
    expect(frame.className).not.toContain('max-w-');
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
  });

  it('shows a live steps workbench by default when no hash is present', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route path="/app/agchain/benchmarks/:benchmarkId" element={<AgchainBenchmarkWorkbenchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Step' })).toBeInTheDocument();
    });

    expect(screen.getByText('Issue Spotting')).toBeInTheDocument();
    expect(screen.getByText('Judge Pair')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name')).toHaveValue('Issue Spotting');
    });
    expect(screen.getByLabelText('Step Kind')).toHaveValue('model');
    expect(screen.getByRole('button', { name: 'Save Order' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Step 2: Judge Pair' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Display Name')).toHaveValue('Judge Pair');
    });
    expect(screen.getByLabelText('Scoring Mode')).toHaveValue('judge');
  });

  it('supports draft step mutations from the steps workbench', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route path="/app/agchain/benchmarks/:benchmarkId" element={<AgchainBenchmarkWorkbenchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Step' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name')).toHaveValue('Issue Spotting');
    });

    fireEvent.change(screen.getByLabelText('Display Name'), {
      target: { value: 'Issue Spotting Revised' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Step' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/agchain/benchmarks/legal-10/steps/step-1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Down' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Order' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/agchain/benchmarks/legal-10/steps/reorder',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Step' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/agchain/benchmarks/legal-10/steps/step-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'New Step' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/agchain/benchmarks/legal-10/steps',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
