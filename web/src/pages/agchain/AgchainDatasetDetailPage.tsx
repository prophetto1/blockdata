import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AgchainPageFrame } from './AgchainPageFrame';
import { AgchainDatasetVersionSwitcher } from '@/components/agchain/datasets/AgchainDatasetVersionSwitcher';
import { AgchainDatasetSamplesTable } from '@/components/agchain/datasets/AgchainDatasetSamplesTable';
import { AgchainDatasetSampleDrawer } from '@/components/agchain/datasets/AgchainDatasetSampleDrawer';
import { AgchainDatasetVersionsTable } from '@/components/agchain/datasets/AgchainDatasetVersionsTable';
import { AgchainDatasetValidationPanel } from '@/components/agchain/datasets/AgchainDatasetValidationPanel';
import { useAgchainDatasetDetail } from '@/hooks/agchain/useAgchainDatasetDetail';
import { useAgchainDatasetDraft } from '@/hooks/agchain/useAgchainDatasetDraft';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator } from '@/components/ui/tabs';

type DetailTab = 'samples' | 'versions' | 'source' | 'mapping' | 'validation';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'samples', label: 'Samples' },
  { key: 'versions', label: 'Versions' },
  { key: 'source', label: 'Source' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'validation', label: 'Validation' },
];

export default function AgchainDatasetDetailPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const { focusedProject, status, reload: reloadWorkspace } = useAgchainProjectFocus();
  const projectId = focusedProject?.project_id ?? null;

  const {
    detail,
    versions,
    source,
    mapping,
    validation,
    samples,
    selectedSample,
    loading,
    tabLoading,
    error,
    loadSource,
    loadMapping,
    loadValidation,
    loadSamples,
    selectSample,
    selectVersion,
  } = useAgchainDatasetDetail(datasetId ?? '');

  const { createDraft } = useAgchainDatasetDraft(datasetId ?? '', null);

  const [activeTab, setActiveTab] = useState<DetailTab>('samples');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedVersionId = detail?.selected_version?.dataset_version_id ?? null;
  const dataset = detail?.dataset ?? null;

  const handleTabChange = useCallback(
    (tab: DetailTab) => {
      setActiveTab(tab);
      if (!selectedVersionId) return;
      switch (tab) {
        case 'source':
          loadSource(selectedVersionId);
          break;
        case 'mapping':
          loadMapping(selectedVersionId);
          break;
        case 'validation':
          loadValidation(selectedVersionId);
          break;
        case 'samples':
          loadSamples(selectedVersionId);
          break;
        case 'versions':
          break;
      }
    },
    [selectedVersionId, loadSource, loadMapping, loadValidation, loadSamples],
  );

  const handleVersionSelect = useCallback(
    (versionId: string) => {
      selectVersion(versionId);
      setActiveTab('samples');
    },
    [selectVersion],
  );

  const handleNewVersion = useCallback(async () => {
    if (!projectId) return;
    const draftId = await createDraft(selectedVersionId);
    if (draftId) {
      navigate(`/app/agchain/datasets/${datasetId}/versions/new/${draftId}`);
    }
  }, [projectId, selectedVersionId, createDraft, datasetId, navigate]);

  const handleSelectSample = useCallback(
    (sampleId: string) => {
      selectSample(sampleId);
      setDrawerOpen(true);
    },
    [selectSample],
  );

  if (status === 'bootstrapping') {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center"><p className="text-sm text-muted-foreground">Loading workspace...</p></div>
      </AgchainPageFrame>
    );
  }

  if (status === 'error') {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Failed to load AGChain workspace context.</p>
          <button onClick={() => void reloadWorkspace()} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">Retry</button>
        </div>
      </AgchainPageFrame>
    );
  }

  if (status === 'no-organization') {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">No organization</h1>
          <p className="text-sm text-muted-foreground">Select or create an organization to continue.</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (!datasetId || !projectId) {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Dataset not found.</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (loading && !dataset) {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading dataset...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame>
      <div className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{dataset?.name ?? 'Dataset'}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{dataset?.slug}</p>
            {dataset?.description && (
              <p className="mt-2 text-sm text-foreground/80">{dataset.description}</p>
            )}
            {dataset?.tags && dataset.tags.length > 0 && (
              <div className="mt-2 flex gap-1.5">
                {dataset.tags.map((tag) => (
                  <Badge key={tag} variant="gray" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {dataset?.sample_count?.toLocaleString() ?? 0} samples
              </span>
              {dataset?.validation_status && (
                <Badge
                  variant={dataset.validation_status === 'pass' ? 'green' : dataset.validation_status === 'warn' ? 'yellow' : 'red'}
                  size="sm"
                >
                  {dataset.validation_status.charAt(0).toUpperCase() + dataset.validation_status.slice(1)}
                </Badge>
              )}
              <Button size="sm" onClick={handleNewVersion}>
                + New Version
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {dataset?.status && (
                <Badge variant={dataset.status === 'active' ? 'green' : 'gray'} size="sm">
                  {dataset.status.charAt(0).toUpperCase() + dataset.status.slice(1)}
                </Badge>
              )}
              {dataset?.source_type && (
                <Badge variant="blue" size="sm">
                  {dataset.source_type.toUpperCase()}
                </Badge>
              )}
              {versions.length > 0 && (
                <AgchainDatasetVersionSwitcher
                  versions={versions}
                  selectedVersionId={selectedVersionId}
                  onSelect={handleVersionSelect}
                />
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as DetailTab)}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
            <TabsIndicator />
          </TabsList>

          <TabsContent value="samples">
            <AgchainDatasetSamplesTable
              samples={samples}
              loading={tabLoading}
              onSelectSample={handleSelectSample}
            />
          </TabsContent>

          <TabsContent value="versions">
            <AgchainDatasetVersionsTable versions={versions} loading={tabLoading} />
          </TabsContent>

          <TabsContent value="source">
            {source ? (
              <div className="rounded-xl border border-border/70 bg-card/70 p-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Source Configuration</h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Source Type:</span>
                    <span className="text-foreground">{source.source_type}</span>
                  </div>
                  {source.source_uri && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">Source URI:</span>
                      <span className="font-mono text-foreground">{source.source_uri}</span>
                    </div>
                  )}
                  <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-background/50 p-3 text-xs text-muted-foreground">
                    {JSON.stringify(source.source_config_jsonb, null, 2)}
                  </pre>
                </div>
              </div>
            ) : !tabLoading ? (
              <div className="rounded-xl border border-border/70 bg-card/70 px-5 py-4 text-sm text-muted-foreground">
                No source data available.
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="mapping">
            {mapping ? (
              <div className="rounded-xl border border-border/70 bg-card/70 p-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Field Mapping</h3>
                <div className="flex flex-col gap-2">
                  {Object.entries(mapping.field_spec_jsonb).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4 rounded-md border border-border/50 bg-background/50 px-4 py-2">
                      <span className="w-24 text-sm font-semibold text-foreground">{key}</span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {value && typeof value === 'object' && 'path' in value
                          ? String((value as { path: string }).path)
                          : '-'}
                      </span>
                    </div>
                  ))}
                </div>
                {mapping.field_resolution_summary && Object.keys(mapping.field_resolution_summary).length > 0 && (
                  <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-background/50 p-3 text-xs text-muted-foreground">
                    {JSON.stringify(mapping.field_resolution_summary, null, 2)}
                  </pre>
                )}
              </div>
            ) : !tabLoading ? (
              <div className="rounded-xl border border-border/70 bg-card/70 px-5 py-4 text-sm text-muted-foreground">
                No mapping data available.
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="validation">
            <AgchainDatasetValidationPanel
              validation={
                validation
                  ? {
                      ...validation,
                      warning_count: validation.warning_counts.warning_count,
                      duplicate_id_count: validation.warning_counts.duplicate_id_count,
                      missing_field_count: validation.warning_counts.missing_field_count,
                      unsupported_payload_count: validation.warning_counts.unsupported_payload_count,
                      source_hash: null,
                    }
                  : null
              }
              loading={tabLoading}
            />
          </TabsContent>
        </Tabs>

        {/* Sample drawer */}
        <AgchainDatasetSampleDrawer
          sample={selectedSample}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </AgchainPageFrame>
  );
}
