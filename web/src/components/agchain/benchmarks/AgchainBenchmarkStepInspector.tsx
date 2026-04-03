import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  draftFromBenchmarkStep,
  stepDraftToFormValues,
  stepFormValuesToDraft,
  type AgchainBenchmarkStepRow,
  type AgchainBenchmarkStepWrite,
} from '@/lib/agchainBenchmarks';

type StepFormValues = ReturnType<typeof stepDraftToFormValues>;

type AgchainBenchmarkStepInspectorProps = {
  selectedStep: AgchainBenchmarkStepRow | null;
  canEdit: boolean;
  loading: boolean;
  mutating: boolean;
  onSave: (payload: AgchainBenchmarkStepWrite) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
};

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export function AgchainBenchmarkStepInspector({
  selectedStep,
  canEdit,
  loading,
  mutating,
  onSave,
  onDelete,
}: AgchainBenchmarkStepInspectorProps) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Loading step inspector...</p>
      </section>
    );
  }

  if (!selectedStep) {
    return (
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Step Inspector</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Select a step to inspect and edit its benchmark-owned runtime definition.
        </p>
      </section>
    );
  }

  return (
    <AgchainBenchmarkStepInspectorContent
      key={selectedStep.step_id}
      selectedStep={selectedStep}
      canEdit={canEdit}
      mutating={mutating}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}

type AgchainBenchmarkStepInspectorContentProps = Omit<
  AgchainBenchmarkStepInspectorProps,
  'loading' | 'selectedStep'
> & {
  selectedStep: AgchainBenchmarkStepRow;
};

function AgchainBenchmarkStepInspectorContent({
  selectedStep,
  canEdit,
  mutating,
  onSave,
  onDelete,
}: AgchainBenchmarkStepInspectorContentProps) {
  const [values, setValues] = useState<StepFormValues>(() => stepDraftToFormValues(draftFromBenchmarkStep(selectedStep)));
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSave() {
    try {
      setLocalError(null);
      await onSave(stepFormValuesToDraft(values));
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to save step');
    }
  }

  async function handleDelete() {
    try {
      setLocalError(null);
      await onDelete();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to delete step');
    }
  }

  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Step Inspector</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit the selected step&apos;s display, ordering semantics, payload admissions, and scoring contract.
          </p>
        </div>
        <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {selectedStep.step_id}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="step-display-name">
            Display Name
          </label>
          <input
            id="step-display-name"
            className={inputClass}
            value={values.display_name}
            onChange={(event) => setValues({ ...values, display_name: event.target.value })}
            disabled={!canEdit || mutating}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="step-id">
            Step ID
          </label>
          <input
            id="step-id"
            className={inputClass}
            value={values.step_id}
            onChange={(event) => setValues({ ...values, step_id: event.target.value })}
            disabled={!canEdit || mutating}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-kind">
              Step Kind
            </label>
            <select
              id="step-kind"
              className={inputClass}
              value={values.step_kind}
              onChange={(event) =>
                setValues({
                  ...values,
                  step_kind: event.target.value as StepFormValues['step_kind'],
                })
              }
              disabled={!canEdit || mutating}
            >
              <option value="model">model</option>
              <option value="judge">judge</option>
              <option value="deterministic_post">deterministic_post</option>
              <option value="aggregation">aggregation</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-api-call-boundary">
              API Call Boundary
            </label>
            <select
              id="step-api-call-boundary"
              className={inputClass}
              value={values.api_call_boundary}
              onChange={(event) =>
                setValues({
                  ...values,
                  api_call_boundary: event.target.value as StepFormValues['api_call_boundary'],
                })
              }
              disabled={!canEdit || mutating}
            >
              <option value="own_call">own_call</option>
              <option value="continue_call">continue_call</option>
              <option value="non_model">non_model</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-scoring-mode">
              Scoring Mode
            </label>
            <select
              id="step-scoring-mode"
              className={inputClass}
              value={values.scoring_mode}
              onChange={(event) =>
                setValues({
                  ...values,
                  scoring_mode: event.target.value as StepFormValues['scoring_mode'],
                })
              }
              disabled={!canEdit || mutating}
            >
              <option value="none">none</option>
              <option value="deterministic">deterministic</option>
              <option value="judge">judge</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-inject-payloads">
              Inject Payloads
            </label>
            <input
              id="step-inject-payloads"
              className={inputClass}
              value={values.inject_payloads_csv}
              onChange={(event) => setValues({ ...values, inject_payloads_csv: event.target.value })}
              disabled={!canEdit || mutating}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-output-contract">
              Output Contract
            </label>
            <input
              id="step-output-contract"
              className={inputClass}
              value={values.output_contract ?? ''}
              onChange={(event) => setValues({ ...values, output_contract: event.target.value })}
              disabled={!canEdit || mutating}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-scorer-ref">
              Scorer Ref
            </label>
            <input
              id="step-scorer-ref"
              className={inputClass}
              value={values.scorer_ref ?? ''}
              onChange={(event) => setValues({ ...values, scorer_ref: event.target.value })}
              disabled={!canEdit || mutating}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-judge-prompt-ref">
              Judge Prompt Ref
            </label>
            <input
              id="step-judge-prompt-ref"
              className={inputClass}
              value={values.judge_prompt_ref ?? ''}
              onChange={(event) => setValues({ ...values, judge_prompt_ref: event.target.value })}
              disabled={!canEdit || mutating}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="step-judge-grades-step-ids">
              Judge Grades Step IDs
            </label>
            <input
              id="step-judge-grades-step-ids"
              className={inputClass}
              value={values.judge_grades_step_ids_csv}
              onChange={(event) => setValues({ ...values, judge_grades_step_ids_csv: event.target.value })}
              disabled={!canEdit || mutating}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="step-config-json">
            Step Config JSON
          </label>
          <textarea
            id="step-config-json"
            className={`${inputClass} min-h-44 font-mono text-xs`}
            value={values.step_config_json}
            onChange={(event) => setValues({ ...values, step_config_json: event.target.value })}
            disabled={!canEdit || mutating}
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-foreground" htmlFor="step-enabled">
          <input
            id="step-enabled"
            type="checkbox"
            checked={values.enabled}
            onChange={(event) => setValues({ ...values, enabled: event.target.checked })}
            disabled={!canEdit || mutating}
          />
          Enabled
        </label>
      </div>

      {localError ? <p className="mt-4 text-sm text-destructive">{localError}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void handleSave()} disabled={!canEdit || mutating}>
          Save Step
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleDelete()}
          disabled={!canEdit || mutating}
        >
          Delete Step
        </Button>
      </div>
    </section>
  );
}
