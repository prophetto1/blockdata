import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AgchainPageFrame } from './AgchainPageFrame';
import { AgchainDatasetFieldMappingEditor } from '@/components/agchain/datasets/AgchainDatasetFieldMappingEditor';
import { AgchainDatasetPreviewTable } from '@/components/agchain/datasets/AgchainDatasetPreviewTable';
import { AgchainDatasetValidationPanel } from '@/components/agchain/datasets/AgchainDatasetValidationPanel';
import { useAgchainDatasetDraft } from '@/hooks/agchain/useAgchainDatasetDraft';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AgchainFieldSpec } from '@/lib/agchainDatasets';

export default function AgchainDatasetVersionDraftPage() {
  const { datasetId, draftId } = useParams<{ datasetId: string; draftId: string }>();
  const navigate = useNavigate();

  const {
    draft,
    previewSamples,
    previewValidation,
    diffSummary,
    loading,
    previewing,
    committing,
    operationStatus,
    error,
    updateDraft,
    previewDraft,
    commitDraft,
  } = useAgchainDatasetDraft(datasetId ?? '', draftId ?? null);

  const [versionLabel, setVersionLabel] = useState('');
  const [fieldSpec, setFieldSpec] = useState<AgchainFieldSpec | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [limit, setLimit] = useState<string>('');
  const [autoId, setAutoId] = useState(false);
  const [deterministicSeed, setDeterministicSeed] = useState<string>('');
  const [dirty, setDirty] = useState(false);

  // Sync draft state on load
  const effectiveFieldSpec = useMemo(
    () =>
      fieldSpec ??
      draft?.field_spec_jsonb ?? {
        input: null,
        messages: null,
        choices: null,
        target: null,
        id: null,
        metadata: null,
        sandbox: null,
        files: null,
        setup: null,
      },
    [draft?.field_spec_jsonb, fieldSpec],
  );

  const handleFieldSpecChange = useCallback((spec: AgchainFieldSpec) => {
    setFieldSpec(spec);
    setDirty(true);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    await updateDraft({
      version_label: versionLabel || undefined,
      field_spec_jsonb: effectiveFieldSpec,
      materialization_options_jsonb: {
        shuffle,
        shuffle_choices: false,
        limit: limit ? parseInt(limit, 10) : null,
        auto_id: autoId,
        deterministic_seed: deterministicSeed ? parseInt(deterministicSeed, 10) : null,
      },
      source_config_jsonb: draft?.source_config_jsonb ?? { source_type: 'csv', source_uri: null },
    });
    setDirty(false);
  }, [updateDraft, versionLabel, effectiveFieldSpec, shuffle, limit, autoId, deterministicSeed, draft]);

  const handlePreview = useCallback(async () => {
    await previewDraft({
      field_spec_jsonb: effectiveFieldSpec,
      materialization_options_jsonb: {
        shuffle,
        shuffle_choices: false,
        limit: limit ? parseInt(limit, 10) : null,
        auto_id: autoId,
        deterministic_seed: deterministicSeed ? parseInt(deterministicSeed, 10) : null,
      },
      source_config_jsonb: draft?.source_config_jsonb ?? { source_type: 'csv', source_uri: null },
    });
  }, [previewDraft, effectiveFieldSpec, shuffle, limit, autoId, deterministicSeed, draft]);

  const handleCommit = useCallback(async () => {
    const result = await commitDraft(versionLabel || null);
    if (result) {
      navigate(`/app/agchain/datasets/${datasetId}`);
    }
  }, [commitDraft, versionLabel, datasetId, navigate]);

  if (!datasetId || !draftId) {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Draft not found.</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (loading && !draft) {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading draft...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame>
      <div className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Badge variant="blue" size="sm">DRAFT</Badge>
          <input
            type="text"
            placeholder={draft?.base_version_id ? 'New version label' : 'v1'}
            value={versionLabel}
            onChange={(e) => { setVersionLabel(e.target.value); setDirty(true); }}
            className="h-9 w-64 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {dirty && <span className="inline-flex h-2 w-2 rounded-full bg-orange-400" title="Unsaved changes" />}
        </div>
        {draft?.base_version_id && (
          <p className="text-xs text-muted-foreground">
            Based on: {draft.base_version_id}
          </p>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Source config (read-only summary for now) */}
        {draft?.source_config_jsonb && (
          <div className="rounded-xl border border-border/70 bg-card/70 p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Source Configuration</h3>
            <div className="text-sm text-muted-foreground">
              <span>Type: {draft.source_config_jsonb.source_type?.toUpperCase()}</span>
              {draft.source_config_jsonb.source_uri && (
                <span className="ml-4">URI: {draft.source_config_jsonb.source_uri}</span>
              )}
            </div>
          </div>
        )}

        {/* Field mapping editor */}
        <div className="rounded-xl border border-border/70 bg-card/70 p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Field Mapping</h3>
          <AgchainDatasetFieldMappingEditor
            fieldSpec={effectiveFieldSpec}
            onChange={handleFieldSpecChange}
          />
        </div>

        {/* Materialization options */}
        <div className="rounded-xl border border-border/70 bg-card/70 p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Materialization Options</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Shuffle Data</label>
              <button
                type="button"
                onClick={() => { setShuffle(!shuffle); setDirty(true); }}
                className={`relative h-6 w-11 rounded-full transition-colors ${shuffle ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${shuffle ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Limit</label>
              <input
                type="number"
                placeholder="No limit"
                value={limit}
                onChange={(e) => { setLimit(e.target.value); setDirty(true); }}
                className="h-8 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Auto-generate ID</label>
              <button
                type="button"
                onClick={() => { setAutoId(!autoId); setDirty(true); }}
                className={`relative h-6 w-11 rounded-full transition-colors ${autoId ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoId ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Deterministic Seed</label>
              <input
                type="number"
                placeholder="None"
                value={deterministicSeed}
                onChange={(e) => { setDeterministicSeed(e.target.value); setDirty(true); }}
                className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Preview results */}
        {(previewSamples.length > 0 || previewing) && (
          <div className="flex flex-col gap-4">
            <AgchainDatasetPreviewTable samples={previewSamples} loading={previewing} />
            <AgchainDatasetValidationPanel validation={previewValidation} loading={previewing} />
            {diffSummary && Object.keys(diffSummary).length > 0 && (
              <div className="rounded-xl border border-border/70 bg-card/70 p-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Diff Summary</h3>
                <pre className="max-h-32 overflow-auto text-xs text-muted-foreground">
                  {JSON.stringify(diffSummary, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Operation status */}
        {operationStatus && operationStatus.status !== 'succeeded' && operationStatus.status !== 'failed' && (
          <div className="rounded-md border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
            Operation in progress: {operationStatus.status}...
          </div>
        )}

        {/* Action bar */}
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur-sm">
          {dirty && (
            <span className="flex items-center gap-1.5 text-sm text-orange-400">
              <span className="inline-flex h-2 w-2 rounded-full bg-orange-400" />
              Unsaved changes
            </span>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={loading}>
            Save Draft
          </Button>
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
            {previewing ? 'Previewing...' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handleCommit} disabled={committing}>
            {committing ? 'Committing...' : 'Commit'}
          </Button>
        </div>
      </div>
    </AgchainPageFrame>
  );
}
