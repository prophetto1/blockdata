import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StepsRoot, StepsList, StepsItem, StepsTrigger, StepsIndicator, StepsSeparator, StepsContent } from '@/components/ui/steps';
import { SwitchRoot, SwitchControl, SwitchThumb, SwitchHiddenInput } from '@/components/ui/switch';
import { SegmentGroupRoot, SegmentGroupItem, SegmentGroupIndicator, SegmentGroupItemHiddenInput, SegmentGroupItemControl } from '@/components/ui/segment-group';
import { TagsInputRoot, TagsInputContext, TagsInputControl, TagsInputItem, TagsInputItemPreview, TagsInputItemText, TagsInputItemDeleteTrigger, TagsInputInput, TagsInputHiddenInput } from '@/components/ui/tags-input';
import { AgchainDatasetFieldMappingEditor } from './AgchainDatasetFieldMappingEditor';
import { AgchainDatasetPreviewTable } from './AgchainDatasetPreviewTable';
import { AgchainDatasetValidationPanel } from './AgchainDatasetValidationPanel';
import {
  createDataset,
  getOperationStatus,
  previewNewDataset,
  type AgchainDatasetBootstrapResponse,
  type AgchainDatasetSourceConfig,
  type AgchainFieldSpec,
  type AgchainMaterializationOptions,
  type AgchainDatasetSampleSummary,
  type AgchainDatasetValidationSummary,
} from '@/lib/agchainDatasets';
import type { AgchainOperationStatus } from '@/lib/agchainRuns';

type AgchainDatasetWizardProps = {
  projectId: string;
  bootstrap: AgchainDatasetBootstrapResponse | null;
};

type WizardStep = 'source' | 'mapping' | 'preview' | 'details';

const STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'source', label: 'Source', number: 1 },
  { key: 'mapping', label: 'Mapping', number: 2 },
  { key: 'preview', label: 'Preview', number: 3 },
  { key: 'details', label: 'Details', number: 4 },
];

const SOURCE_TYPES = ['csv', 'json', 'jsonl', 'huggingface'] as const;

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 60;

function isOperationStatus(response: unknown): response is AgchainOperationStatus {
  return typeof response === 'object' && response !== null && 'operation_id' in response;
}

function getDefaultFieldSpec(bootstrap: AgchainDatasetBootstrapResponse | null): AgchainFieldSpec {
  return bootstrap?.field_spec_defaults ?? {
    input: null, messages: null, choices: null, target: null,
    id: null, metadata: null, sandbox: null, files: null, setup: null,
  };
}

function getDefaultMaterializationOptions(bootstrap: AgchainDatasetBootstrapResponse | null): AgchainMaterializationOptions {
  return bootstrap?.materialization_defaults ?? {
    shuffle: false, shuffle_choices: false, limit: null, auto_id: false, deterministic_seed: null,
  };
}

export function AgchainDatasetWizard({ projectId, bootstrap }: AgchainDatasetWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('source');

  // Source config state
  const [sourceType, setSourceType] = useState<string>('csv');
  const [sourceUri, setSourceUri] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeaders, setHasHeaders] = useState(true);
  const [encoding, setEncoding] = useState('utf-8');
  const [hfPath, setHfPath] = useState('');
  const [hfSplit, setHfSplit] = useState('train');
  const [hfTrust, setHfTrust] = useState(false);

  // Field mapping state
  const [fieldSpec, setFieldSpec] = useState<AgchainFieldSpec>(getDefaultFieldSpec(bootstrap));

  // Preview state
  const [previewSamples, setPreviewSamples] = useState<AgchainDatasetSampleSummary[]>([]);
  const [previewValidation, setPreviewValidation] = useState<AgchainDatasetValidationSummary | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Details state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [versionLabel, setVersionLabel] = useState('v1');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<AgchainOperationStatus | null>(null);

  const buildSourceConfig = useCallback((): AgchainDatasetSourceConfig => {
    const base: AgchainDatasetSourceConfig = {
      source_type: sourceType as AgchainDatasetSourceConfig['source_type'],
      source_uri: sourceType === 'huggingface' ? null : sourceUri,
    };
    if (sourceType === 'csv') {
      base.delimiter = delimiter;
      base.headers = hasHeaders;
      base.encoding = encoding;
    }
    if (sourceType === 'huggingface') {
      base.path = hfPath;
      base.split = hfSplit;
      base.trust = hfTrust;
    }
    return base;
  }, [sourceType, sourceUri, delimiter, hasHeaders, encoding, hfPath, hfSplit, hfTrust]);

  const buildMaterializationOptions = useCallback((): AgchainMaterializationOptions => {
    const defaults = getDefaultMaterializationOptions(bootstrap);
    return { ...defaults, shuffle_choices: false };
  }, [bootstrap]);

  const pollOperation = useCallback(async (operationId: string): Promise<AgchainOperationStatus> => {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const status = await getOperationStatus(operationId);
      setOperationStatus(status);
      if (status.status === 'succeeded' || status.status === 'failed' || status.status === 'cancelled') {
        return status;
      }
    }
    throw new Error('Operation timed out after maximum polling attempts');
  }, []);

  const handlePreview = useCallback(async () => {
    setPreviewing(true);
    setPreviewError(null);
    setOperationStatus(null);
    try {
      const response = await previewNewDataset({
        project_id: projectId,
        source_type: sourceType as AgchainDatasetSourceConfig['source_type'],
        source_uri: sourceType === 'huggingface' ? null : sourceUri,
        source_config_jsonb: buildSourceConfig(),
        field_spec_jsonb: fieldSpec,
        materialization_options_jsonb: buildMaterializationOptions(),
      });
      if (isOperationStatus(response)) {
        setOperationStatus(response);
        const terminal = await pollOperation(response.operation_id);
        if (terminal.status === 'failed') {
          setPreviewError('Preview operation failed');
        }
      } else {
        setPreviewSamples(response.preview_samples);
        setPreviewValidation(response.validation_summary);
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  }, [projectId, sourceType, sourceUri, buildSourceConfig, fieldSpec, buildMaterializationOptions, pollOperation]);

  const handleCreate = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setOperationStatus(null);
    try {
      const response = await createDataset({
        project_id: projectId,
        source_type: sourceType as AgchainDatasetSourceConfig['source_type'],
        source_uri: sourceType === 'huggingface' ? null : sourceUri,
        source_config_jsonb: buildSourceConfig(),
        field_spec_jsonb: fieldSpec,
        materialization_options_jsonb: buildMaterializationOptions(),
        slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name,
        description,
        tags,
        initial_version_label: versionLabel,
      });
      if (isOperationStatus(response)) {
        setOperationStatus(response);
        const terminal = await pollOperation(response.operation_id);
        if (terminal.status === 'succeeded' && terminal.result) {
          const datasetId = (terminal.result as { dataset_id?: string }).dataset_id;
          if (datasetId) navigate(`/app/agchain/datasets/${datasetId}`);
        } else if (terminal.status === 'failed') {
          setSubmitError('Create operation failed');
        }
      } else {
        navigate(`/app/agchain/datasets/${response.dataset.dataset_id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }, [projectId, sourceType, sourceUri, buildSourceConfig, fieldSpec, buildMaterializationOptions, slug, name, description, tags, versionLabel, pollOperation, navigate]);

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx < STEPS.length - 1) {
      if (step === 'mapping') {
        handlePreview();
      }
      setStep(STEPS[idx + 1].key);
    }
  };

  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === step), [step]);

  return (
    <StepsRoot
      count={STEPS.length}
      step={stepIndex}
      onStepChange={(details) => {
        const target = STEPS[details.step];
        if (target) setStep(target.key);
      }}
      className="flex flex-col gap-6"
    >
      {/* Step indicator bar */}
      <StepsList className="flex items-center">
        {STEPS.map((s, i) => (
          <StepsItem key={s.key} index={i}>
            <StepsTrigger>
              <StepsIndicator>{s.number}</StepsIndicator>
              <span className="text-sm">{s.label}</span>
            </StepsTrigger>
            <StepsSeparator />
          </StepsItem>
        ))}
      </StepsList>

      {/* Step content */}
      <div className="rounded-xl border border-border/70 bg-card/70 p-6">
        <StepsContent index={0}>
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-foreground">Source Configuration</h2>

            <SegmentGroupRoot value={sourceType} onValueChange={(details) => setSourceType(details.value)}>
              {SOURCE_TYPES.map((type) => (
                <SegmentGroupItem key={type} value={type} className="rounded-md px-4 py-2 text-sm">
                  {type === 'huggingface' ? 'HuggingFace' : type.toUpperCase()}
                  <SegmentGroupItemHiddenInput />
                  <SegmentGroupItemControl />
                </SegmentGroupItem>
              ))}
              <SegmentGroupIndicator />
            </SegmentGroupRoot>

            {sourceType !== 'huggingface' && (
              <div className="flex flex-col gap-3">
                <label className="text-sm text-muted-foreground">Source URI</label>
                <input
                  type="text"
                  placeholder="gs://my-bucket/data.csv"
                  value={sourceUri}
                  onChange={(e) => setSourceUri(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {sourceType === 'csv' && (
              <>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-muted-foreground">Delimiter</label>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value=",">Comma</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe</option>
                    <option value=";">Semicolon</option>
                  </select>
                </div>
                <SwitchRoot checked={hasHeaders} onCheckedChange={(details) => setHasHeaders(details.checked)}>
                  <SwitchControl><SwitchThumb /></SwitchControl>
                  <span className="text-sm text-muted-foreground">Headers</span>
                  <SwitchHiddenInput />
                </SwitchRoot>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-muted-foreground">Encoding</label>
                  <input
                    type="text"
                    value={encoding}
                    onChange={(e) => setEncoding(e.target.value)}
                    className="h-9 w-32 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  />
                </div>
              </>
            )}

            {sourceType === 'huggingface' && (
              <>
                <div className="flex flex-col gap-3">
                  <label className="text-sm text-muted-foreground">Dataset Path</label>
                  <input
                    type="text"
                    placeholder="org/dataset-name"
                    value={hfPath}
                    onChange={(e) => setHfPath(e.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-muted-foreground">Split</label>
                  <input
                    type="text"
                    value={hfSplit}
                    onChange={(e) => setHfSplit(e.target.value)}
                    className="h-9 w-32 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <SwitchRoot checked={hfTrust} onCheckedChange={(details) => setHfTrust(details.checked)}>
                  <SwitchControl><SwitchThumb /></SwitchControl>
                  <span className="text-sm text-muted-foreground">Trust remote code</span>
                  <SwitchHiddenInput />
                </SwitchRoot>
              </>
            )}
          </div>
        </StepsContent>

        <StepsContent index={1}>
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Field Mapping</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Map your source data fields to the evaluation sample fields.
              </p>
            </div>
            <AgchainDatasetFieldMappingEditor fieldSpec={fieldSpec} onChange={setFieldSpec} />
          </div>
        </StepsContent>

        <StepsContent index={2}>
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-foreground">Dataset Preview</h2>

            {operationStatus && operationStatus.status !== 'succeeded' && operationStatus.status !== 'failed' && (
              <div className="rounded-md border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                Operation in progress: {operationStatus.status}...
              </div>
            )}

            {previewError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {previewError}
              </div>
            )}

            <AgchainDatasetPreviewTable samples={previewSamples} loading={previewing} />
            <AgchainDatasetValidationPanel validation={previewValidation} loading={previewing} />
          </div>
        </StepsContent>

        <StepsContent index={3}>
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-foreground">Name and Submit</h2>

            <div className="flex flex-col gap-3">
              <label className="text-sm text-muted-foreground">Name</label>
              <input
                type="text"
                placeholder="My Evaluation Dataset"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm text-muted-foreground">Slug</label>
              <input
                type="text"
                placeholder="my-eval-dataset"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea
                placeholder="Describe this dataset..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <TagsInputRoot value={tags} onValueChange={(details) => setTags(details.value)}>
              <TagsInputContext>
                {(tagsInput) => (
                  <>
                    <span className="text-sm text-muted-foreground">Tags</span>
                    <TagsInputControl>
                      {tagsInput.value.map((value, index) => (
                        <TagsInputItem key={index} index={index} value={value}>
                          <TagsInputItemPreview>
                            <TagsInputItemText>{value}</TagsInputItemText>
                            <TagsInputItemDeleteTrigger>&times;</TagsInputItemDeleteTrigger>
                          </TagsInputItemPreview>
                        </TagsInputItem>
                      ))}
                      <TagsInputInput placeholder="Add tag..." />
                    </TagsInputControl>
                  </>
                )}
              </TagsInputContext>
              <TagsInputHiddenInput />
            </TagsInputRoot>

            <div className="flex flex-col gap-3">
              <label className="text-sm text-muted-foreground">Initial Version Label</label>
              <input
                type="text"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                className="h-9 w-40 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {previewValidation && (
              <div className="rounded-md border border-border/50 bg-background/30 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Review Summary</h3>
                <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>Source Type: {sourceType.toUpperCase()}</span>
                  <span>Preview Samples: {previewSamples.length}</span>
                  <span>Validation: {previewValidation.validation_status}</span>
                </div>
              </div>
            )}

            {submitError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            {operationStatus && operationStatus.status !== 'succeeded' && operationStatus.status !== 'failed' && (
              <div className="rounded-md border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                Creating dataset: {operationStatus.status}...
              </div>
            )}
          </div>
        </StepsContent>

        {/* Navigation bar */}
        <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-4">
          {step !== 'source' && (
            <Button variant="outline" size="sm" onClick={goBack}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === 'details' ? (
            <Button size="sm" onClick={handleCreate} disabled={submitting || !name}>
              {submitting ? 'Creating...' : 'Create Dataset'}
            </Button>
          ) : (
            <Button size="sm" onClick={goNext}>
              Next
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/app/agchain/datasets')}>
            Cancel
          </Button>
        </div>
      </div>
    </StepsRoot>
  );
}
