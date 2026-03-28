import { describe, expect, it } from 'vitest';
import { stepFormValuesToDraft } from './agchainBenchmarks';

describe('agchainBenchmarks step config parsing', () => {
  it('raises a friendly error when step config json is invalid', () => {
    expect(() =>
      stepFormValuesToDraft({
        step_id: 's1',
        display_name: 'Step 1',
        step_kind: 'model',
        api_call_boundary: 'own_call',
        inject_payloads_csv: '',
        scoring_mode: 'none',
        output_contract: null,
        scorer_ref: null,
        judge_prompt_ref: null,
        judge_grades_step_ids_csv: '',
        enabled: true,
        step_config_json: '{invalid json}',
      }),
    ).toThrow('Step config must be valid JSON.');
  });
});
