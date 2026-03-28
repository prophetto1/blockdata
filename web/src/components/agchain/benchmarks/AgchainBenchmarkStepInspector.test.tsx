import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgchainBenchmarkStepInspector } from './AgchainBenchmarkStepInspector';

const SELECTED_STEP = {
  benchmark_step_id: 'step-row-1',
  step_order: 1,
  step_id: 's1',
  display_name: 'Step 1',
  step_kind: 'model',
  api_call_boundary: 'own_call',
  inject_payloads: [],
  scoring_mode: 'none',
  output_contract: null,
  scorer_ref: null,
  judge_prompt_ref: null,
  judge_grades_step_ids: [],
  enabled: true,
  step_config: {},
  updated_at: '2026-03-28T00:00:00Z',
} as const;

describe('AgchainBenchmarkStepInspector', () => {
  it('surfaces friendly step-config json validation errors and skips save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <AgchainBenchmarkStepInspector
        selectedStep={SELECTED_STEP}
        canEdit
        loading={false}
        mutating={false}
        onSave={onSave}
        onDelete={onDelete}
      />,
    );

    fireEvent.change(screen.getByLabelText('Step Config JSON'), {
      target: { value: '{invalid json}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Step' }));

    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });
    expect(await screen.findByText('Step config must be valid JSON.')).toBeInTheDocument();
  });
});
