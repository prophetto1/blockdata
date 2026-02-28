import { useEffect, useMemo, useRef, useState } from 'react';
import { Field } from '@ark-ui/react/field';
import { NumberInput } from '@ark-ui/react/number-input';
import { RadioGroup } from '@ark-ui/react/radio-group';
import { IconPlayerPlay } from '@tabler/icons-react';
import {
  SegmentGroupIndicator,
  SegmentGroupItem,
  SegmentGroupItemHiddenInput,
  SegmentGroupItemText,
  SegmentGroupRoot,
} from '@/components/ui/segment-group';
import {
  ScrollAreaContent,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@/components/ui/scroll-area';
import { edgeFetch } from '@/lib/edge';

type Props = {
  projectId: string | null;
  selectedDocument?: {
    source_uid: string;
    source_type: string;
    status: 'uploaded' | 'converting' | 'ingested' | 'conversion_failed' | 'ingest_failed';
    doc_title: string;
  } | null;
  onParseQueued?: () => Promise<void> | void;
};

const TIERS = [
  { key: 'fast', label: 'Fast', credits: 1, description: 'Basic text extraction. Best for clean, text-heavy documents without complex layouts.' },
  { key: 'cost_effective', label: 'Cost Effective', credits: 3, description: 'Good balance of quality and cost. Handles most standard documents well.' },
  { key: 'agentic', label: 'Agentic', credits: 10, description: 'Works well for most documents with diagrams and images. May struggle with complex layouts.' },
  { key: 'agentic_plus', label: 'Agentic Plus', credits: 25, description: 'Best quality for complex documents with tables, charts, and mixed layouts.' },
] as const;

type TierKey = (typeof TIERS)[number]['key'];
type ParseMode = 'standard' | 'advanced';
type ParsePanelView = 'configs' | 'list';
type ExperimentalMode = 'ppc_50' | 'ppc_65' | 'none';

type AdvancedConfigState = {
  costOptimizerEnabled: boolean;
  targetPages: string;
  maxPages: number;
  disableCache: boolean;
  removeWatermark: boolean;
  preserveTextInImage: boolean;
  preserveHiddenText: boolean;
  languages: string;
  experimentalMode: ExperimentalMode;
  customPrompt: string;
  annotateLinks: boolean;
  inlineImagesInMarkdown: boolean;
  outputTablesAsMarkdown: boolean;
  compactMarkdownTables: boolean;
  multilineTableSeparator: string;
  mergeContinuedTables: boolean;
  saveEmbeddedImages: boolean;
  savePageScreenshots: boolean;
  saveLayoutImages: boolean;
  preserveLayoutAlignmentAcrossPages: boolean;
  preserveVerySmallText: boolean;
};

const PARSEABLE_STATUSES = new Set(['uploaded', 'conversion_failed', 'ingest_failed']);

function ConfigSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="relative flex w-full min-w-0 items-start gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
          checked ? 'border-primary bg-primary' : 'border-input bg-muted'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-background shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="min-w-0 flex-1 whitespace-normal break-words text-xs leading-4 text-foreground">{label}</span>
    </div>
  );
}

export function ParseEasyPanel({ projectId: _projectId, selectedDocument = null, onParseQueued }: Props) {
  const [panelView, setPanelView] = useState<ParsePanelView>('configs');
  const [selectedTier, setSelectedTier] = useState<TierKey>('agentic');
  const [mode, setMode] = useState<ParseMode>('standard');
  const [runBusy, setRunBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runInfo, setRunInfo] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedConfigState>({
    costOptimizerEnabled: true,
    targetPages: '',
    maxPages: 100,
    disableCache: false,
    removeWatermark: false,
    preserveTextInImage: false,
    preserveHiddenText: false,
    languages: 'en',
    experimentalMode: 'none',
    customPrompt: '',
    annotateLinks: false,
    inlineImagesInMarkdown: false,
    outputTablesAsMarkdown: false,
    compactMarkdownTables: false,
    multilineTableSeparator: '<br />',
    mergeContinuedTables: false,
    saveEmbeddedImages: false,
    savePageScreenshots: false,
    saveLayoutImages: false,
    preserveLayoutAlignmentAcrossPages: false,
    preserveVerySmallText: false,
  });
  const activeTier = TIERS.find((t) => t.key === selectedTier) ?? TIERS[2];
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const canRun = useMemo(
    () => Boolean(
      selectedDocument
      && selectedDocument.source_type !== 'md'
      && PARSEABLE_STATUSES.has(selectedDocument.status),
    ),
    [selectedDocument],
  );
  const runDisabledReason = useMemo(() => {
    if (!selectedDocument) return 'Select a document in Assets first';
    if (selectedDocument.source_type === 'md') return 'Markdown files do not use the conversion service';
    if (selectedDocument.status === 'converting') return 'Document is already converting';
    if (selectedDocument.status === 'ingested') return 'Document is already parsed';
    if (!PARSEABLE_STATUSES.has(selectedDocument.status)) return `Cannot parse in status: ${selectedDocument.status}`;
    return null;
  }, [selectedDocument]);

  const handleRun = async () => {
    if (!selectedDocument || !canRun || runBusy) return;
    setRunBusy(true);
    setRunError(null);
    setRunInfo(null);
    try {
      const response = await edgeFetch('trigger-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_uid: selectedDocument.source_uid }),
      });
      const text = await response.text();
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(text) as { error?: string };
          if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
            message = parsed.error.trim();
          } else if (text.trim().length > 0) {
            message = text.trim();
          }
        } catch {
          if (text.trim().length > 0) message = text.trim();
        }
        throw new Error(message);
      }
      setRunInfo('Queued in conversion service.');
      await onParseQueued?.();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunBusy(false);
    }
  };

  useEffect(() => {
    if (!bodyScrollRef.current) return;
    bodyScrollRef.current.scrollTo({ top: 0 });
  }, [panelView, mode]);

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="grid min-h-10 grid-cols-[auto_1fr_auto] items-center border-b border-border bg-card px-2">
          <SegmentGroupRoot
            value={panelView}
            onValueChange={(details) => setPanelView((details.value as ParsePanelView) ?? 'configs')}
          >
            <SegmentGroupIndicator />
            <SegmentGroupItem value="configs">
              <SegmentGroupItemText>Configs</SegmentGroupItemText>
              <SegmentGroupItemHiddenInput />
            </SegmentGroupItem>
            <SegmentGroupItem value="list">
              <SegmentGroupItemText>List</SegmentGroupItemText>
              <SegmentGroupItemHiddenInput />
            </SegmentGroupItem>
          </SegmentGroupRoot>
          <span aria-hidden />
          <div className="justify-self-end flex items-center gap-2">
            {runInfo ? (
              <span className="inline-flex h-7 items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Queued
              </span>
            ) : null}
            {runError ? (
              <span className="inline-flex h-7 max-w-[220px] items-center truncate rounded-md border border-red-500/40 bg-red-500/10 px-2 text-[11px] font-medium text-red-700 dark:text-red-300" title={runError}>
                Parse error
              </span>
            ) : null}
            <button
              type="button"
              disabled={!canRun || runBusy}
              onClick={() => { void handleRun(); }}
              className="inline-flex h-8 w-[78px] items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
              title={runDisabledReason ?? 'Run parse on selected document'}
              aria-label="Run parse"
            >
              <IconPlayerPlay size={14} className="text-orange-500" />
              {runBusy ? 'Wait' : 'Run'}
            </button>
          </div>
        </div>

        <ScrollAreaRoot className="min-h-0 h-full flex-1">
          <ScrollAreaViewport ref={bodyScrollRef} className="h-full overflow-y-auto overflow-x-hidden p-3">
            <ScrollAreaContent className="min-w-0">
          {panelView === 'configs' ? (
            <div className="mb-3 flex min-h-10 items-center justify-center px-2">
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMode('standard')}
                  aria-pressed={mode === 'standard'}
                  className={`h-8 w-24 rounded-md border text-xs font-medium ${
                    mode === 'standard'
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setMode('advanced')}
                  aria-pressed={mode === 'advanced'}
                  className={`h-8 w-24 rounded-md border text-xs font-medium ${
                    mode === 'advanced'
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>
          ) : null}

          {selectedDocument ? (
            <div className="mb-3 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedDocument.doc_title || selectedDocument.source_uid}</span>
              {' | '}
              status <span className="font-medium text-foreground">{selectedDocument.status}</span>
            </div>
          ) : (
            <div className="mb-3 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground">
              Select a document in Assets to run parsing.
            </div>
          )}
          {panelView === 'list' ? (
            <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
              Parse result list view will live here.
            </div>
          ) : null}

          {panelView === 'configs' && mode === 'standard' && (
            <>
              <div className="mb-3 text-xs text-muted-foreground">
                Choose a parsing tier. Higher tiers handle more complex document layouts.
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {TIERS.map((tier) => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setSelectedTier(tier.key)}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      selectedTier === tier.key
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <div className="font-semibold">{tier.label}</div>
                    <div className="mt-1 text-[11px]">{tier.credits} credits</div>
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-md border border-border bg-background p-3">
                <div className="text-sm font-semibold text-foreground">{activeTier.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{activeTier.description}</div>
              </div>
            </>
          )}

          {panelView === 'configs' && mode === 'advanced' && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-sm font-bold text-foreground">Cost Optimizer</div>
                <ConfigSwitch
                  label="Enable Cost Optimizer"
                  checked={advanced.costOptimizerEnabled}
                  onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, costOptimizerEnabled: checked }))}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Automatically route to credits on most simple pages (no tables, charts, or scans)
                </p>
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-sm font-bold text-foreground">Page Ranges</div>
                <div className="space-y-2">
                  <Field.Root>
                    <Field.Label className="mb-1 block text-xs font-medium text-foreground">Target pages</Field.Label>
                    <Field.Input
                      value={advanced.targetPages}
                      onChange={(event) => setAdvanced((prev) => ({ ...prev, targetPages: event.currentTarget.value }))}
                      placeholder="e.g. 1-9, 14, 15-13"
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label className="mb-1 block text-xs font-medium text-foreground">Max pages</Field.Label>
                    <NumberInput.Root
                      min={1}
                      max={2000}
                      step={1}
                      value={String(advanced.maxPages)}
                      onValueChange={(details) => {
                        if (Number.isFinite(details.valueAsNumber)) {
                          setAdvanced((prev) => ({ ...prev, maxPages: Math.max(1, Math.trunc(details.valueAsNumber)) }));
                        }
                      }}
                      className="w-28"
                    >
                      <NumberInput.Control className="relative">
                        <NumberInput.Input className="h-8 w-full rounded-md border border-input bg-background px-2 pr-10 text-sm text-foreground" />
                        <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                          <NumberInput.DecrementTrigger className="h-6 w-4 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                            -
                          </NumberInput.DecrementTrigger>
                          <NumberInput.IncrementTrigger className="h-6 w-4 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                            +
                          </NumberInput.IncrementTrigger>
                        </div>
                      </NumberInput.Control>
                    </NumberInput.Root>
                  </Field.Root>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-sm font-bold text-foreground">Job Options</div>
                <p className="mb-2 text-xs text-muted-foreground">
                  LlamaCloud keeps results cached for 48 hours after upload
                </p>
                <ConfigSwitch
                  label="Disable cache"
                  checked={advanced.disableCache}
                  onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, disableCache: checked }))}
                />
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-sm font-bold text-foreground">Processing Options</div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground">Images</span>
                  <ConfigSwitch
                    label="Remove watermark"
                    checked={advanced.removeWatermark}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, removeWatermark: checked }))}
                  />
                  <ConfigSwitch
                    label="Preserve text in image"
                    checked={advanced.preserveTextInImage}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, preserveTextInImage: checked }))}
                  />
                  <ConfigSwitch
                    label="Preserve hidden text"
                    checked={advanced.preserveHiddenText}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, preserveHiddenText: checked }))}
                  />

                  <span className="pt-1 text-xs font-semibold text-foreground">OCR Parameters</span>
                  <Field.Root>
                    <Field.Label className="mb-1 block text-xs font-medium text-foreground">Languages</Field.Label>
                    <Field.Input
                      value={advanced.languages}
                      onChange={(event) => setAdvanced((prev) => ({ ...prev, languages: event.currentTarget.value }))}
                      placeholder="en"
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    />
                  </Field.Root>

                  <span className="pt-1 text-xs font-semibold text-foreground">Experimental (deprecated than parser)</span>
                  <RadioGroup.Root
                    value={advanced.experimentalMode}
                    onValueChange={(details) => setAdvanced((prev) => ({ ...prev, experimentalMode: (details.value as ExperimentalMode) ?? 'none' }))}
                    className="flex flex-col gap-2"
                  >
                    <RadioGroup.Item value="ppc_50" className="relative flex w-full min-w-0 items-start gap-2">
                      <RadioGroup.ItemControl className="h-4 w-4 rounded-full border border-input bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                      <RadioGroup.ItemText className="min-w-0 flex-1 whitespace-normal break-words text-xs leading-4">
                        Agentic Plus (50 credits per chart)
                      </RadioGroup.ItemText>
                      <RadioGroup.ItemHiddenInput className="sr-only" />
                    </RadioGroup.Item>
                    <RadioGroup.Item value="ppc_65" className="relative flex w-full min-w-0 items-start gap-2">
                      <RadioGroup.ItemControl className="h-4 w-4 rounded-full border border-input bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                      <RadioGroup.ItemText className="min-w-0 flex-1 whitespace-normal break-words text-xs leading-4">
                        Agentic (65 credits per chart)
                      </RadioGroup.ItemText>
                      <RadioGroup.ItemHiddenInput className="sr-only" />
                    </RadioGroup.Item>
                    <RadioGroup.Item value="none" className="relative flex w-full min-w-0 items-start gap-2">
                      <RadioGroup.ItemControl className="h-4 w-4 rounded-full border border-input bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                      <RadioGroup.ItemText className="min-w-0 flex-1 whitespace-normal break-words text-xs leading-4">None</RadioGroup.ItemText>
                      <RadioGroup.ItemHiddenInput className="sr-only" />
                    </RadioGroup.Item>
                  </RadioGroup.Root>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-sm font-bold text-foreground">Agentic Options</div>
                <Field.Root>
                  <Field.Label className="mb-1 block text-xs font-medium text-foreground">Custom prompt</Field.Label>
                  <Field.Textarea
                    value={advanced.customPrompt}
                    onChange={(event) => setAdvanced((prev) => ({ ...prev, customPrompt: event.currentTarget.value }))}
                    placeholder="e.g. Do not output heading as title, instead prefix them with the text TITLE"
                    className="min-h-20 w-full rounded-md border border-input bg-background p-2 text-xs text-foreground"
                  />
                </Field.Root>
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-sm font-bold text-foreground">Output Options</div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground">Markdown</span>
                  <ConfigSwitch
                    label="Annotate links"
                    checked={advanced.annotateLinks}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, annotateLinks: checked }))}
                  />
                  <ConfigSwitch
                    label="Inline images in markdown"
                    checked={advanced.inlineImagesInMarkdown}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, inlineImagesInMarkdown: checked }))}
                  />

                  <span className="pt-1 text-xs font-semibold text-foreground">Tables</span>
                  <ConfigSwitch
                    label="Output tables as Markdown"
                    checked={advanced.outputTablesAsMarkdown}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, outputTablesAsMarkdown: checked }))}
                  />
                  <ConfigSwitch
                    label="Compact markdown tables"
                    checked={advanced.compactMarkdownTables}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, compactMarkdownTables: checked }))}
                  />
                  <Field.Root>
                    <Field.Label className="mb-1 block text-xs font-medium text-foreground">Multiline Table Separator</Field.Label>
                    <Field.Input
                      value={advanced.multilineTableSeparator}
                      onChange={(event) => setAdvanced((prev) => ({ ...prev, multilineTableSeparator: event.currentTarget.value }))}
                      placeholder="<br />"
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    />
                  </Field.Root>
                  <ConfigSwitch
                    label="Merge continued tables"
                    checked={advanced.mergeContinuedTables}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, mergeContinuedTables: checked }))}
                  />

                  <span className="pt-1 text-xs font-semibold text-foreground">Images to Save</span>
                  <ConfigSwitch
                    label="Embedded images"
                    checked={advanced.saveEmbeddedImages}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, saveEmbeddedImages: checked }))}
                  />
                  <ConfigSwitch
                    label="Page screenshots"
                    checked={advanced.savePageScreenshots}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, savePageScreenshots: checked }))}
                  />
                  <ConfigSwitch
                    label="Layout images"
                    checked={advanced.saveLayoutImages}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, saveLayoutImages: checked }))}
                  />

                  <span className="pt-1 text-xs font-semibold text-foreground">Spatial Text</span>
                  <ConfigSwitch
                    label="Preserve layout alignment across pages"
                    checked={advanced.preserveLayoutAlignmentAcrossPages}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, preserveLayoutAlignmentAcrossPages: checked }))}
                  />
                  <ConfigSwitch
                    label="Preserve very small text"
                    checked={advanced.preserveVerySmallText}
                    onCheckedChange={(checked) => setAdvanced((prev) => ({ ...prev, preserveVerySmallText: checked }))}
                  />
                </div>
              </div>
            </div>
          )}
            </ScrollAreaContent>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        </ScrollAreaRoot>
      </div>
    </div>
  );
}
