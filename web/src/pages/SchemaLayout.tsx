import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Pagination } from '@ark-ui/react/pagination';
import { RadioGroup } from '@ark-ui/react/radio-group';
import { Switch } from '@ark-ui/react/switch';
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from 'react';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { DoubleArrowIcon } from '@/components/icons/DoubleArrowIcon';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PdfPreview } from '../components/documents/PdfPreview';
import { ICON_TOKENS } from '../lib/iconTokens';
import './SchemaLayout.css';

const DOCS_PER_PAGE = 10;
const DOCS_PER_PAGE_OPTIONS = [10, 25, 50] as const;

const LEFT_COLUMN_WIDTH = {
  full: 500,
  collapsed: 56,
} as const;

const RIGHT_COLUMN_WIDTH = {
  full: 300,
  collapsed: 56,
} as const;
const PANE_CHEVRON_ICON = ICON_TOKENS.shell.paneChevron;

type LeftColumnState = keyof typeof LEFT_COLUMN_WIDTH;
type RightColumnState = keyof typeof RIGHT_COLUMN_WIDTH;
type ParseConfigView = 'Basic' | 'Advanced';
type PreviewView = 'Preview' | 'Metadata' | 'Blocks';

const docRows = Array.from({ length: 37 }, (_, index) => ({
  id: index + 1,
  title: `document_${String(index + 1).padStart(3, '0')}.pdf`,
}));

/* ---- tiny helpers to reduce repetition ---- */

function TabLabel({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-sm cursor-pointer select-none parse-middle-tab${active ? ' is-active' : ''} ${active ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'} ${className ?? ''}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

function LabeledInput({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Input {...props} className="h-8 text-xs" />
    </div>
  );
}

function ConfigSwitch({ label }: { label: string }) {
  return (
    <Switch.Root className="inline-flex items-center gap-2">
      <Switch.HiddenInput />
      <Switch.Control className="relative h-5 w-9 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
        <Switch.Thumb className="block h-4 w-4 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-4" />
      </Switch.Control>
      <Switch.Label className="text-xs text-foreground">{label}</Switch.Label>
    </Switch.Root>
  );
}

export default function SchemaLayout() {
  const { setShellTopSlots } = useHeaderCenter();
  const [leftColumnState, setLeftColumnState] = useState<LeftColumnState>('full');
  const [rightColumnState, setRightColumnState] = useState<RightColumnState>('full');
  const [parseConfigView, setParseConfigView] = useState<ParseConfigView>('Basic');
  const [previewView, setPreviewView] = useState<PreviewView>('Preview');
  const [docPage, setDocPage] = useState(1);
  const [docsPerPage, setDocsPerPage] = useState(DOCS_PER_PAGE);
  const [pdfToolbarHost, setPdfToolbarHost] = useState<HTMLDivElement | null>(null);

  const isLeftCollapsed = leftColumnState === 'collapsed';
  const isRightCollapsed = rightColumnState === 'collapsed';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--shell-guide-left-width', `${LEFT_COLUMN_WIDTH[leftColumnState]}px`);
    root.style.setProperty('--shell-guide-middle-width', `${RIGHT_COLUMN_WIDTH[rightColumnState]}px`);

    return () => {
      root.style.removeProperty('--shell-guide-left-width');
      root.style.removeProperty('--shell-guide-middle-width');
    };
  }, [leftColumnState, rightColumnState]);

  useLayoutEffect(() => {
    setShellTopSlots({
      left: (
        <div
          className={`flex items-center gap-2 flex-nowrap top-command-bar-shell-slot ${isLeftCollapsed ? 'justify-end' : 'justify-between'}`}
        >
          {!isLeftCollapsed ? (
            <span className="text-sm font-bold top-command-bar-shell-label">Documents</span>
          ) : null}
          <button
            type="button"
            className="top-command-bar-shell-toggle inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={isLeftCollapsed ? 'Expand left column' : 'Collapse left column'}
            title={isLeftCollapsed ? 'Expand left column' : 'Collapse left column'}
            onClick={() => setLeftColumnState((current) => (current === 'collapsed' ? 'full' : 'collapsed'))}
          >
            {isLeftCollapsed ? (
              <DoubleArrowIcon size={PANE_CHEVRON_ICON.size} />
            ) : (
              <IconChevronLeft size={PANE_CHEVRON_ICON.size} stroke={PANE_CHEVRON_ICON.stroke} />
            )}
          </button>
        </div>
      ),
      middle: (
        <div
          className={`flex items-center gap-2 flex-nowrap top-command-bar-shell-slot ${isRightCollapsed ? 'justify-end' : 'justify-between'}`}
        >
          {!isRightCollapsed ? (
            <span className="text-sm font-bold top-command-bar-shell-label">Configuration</span>
          ) : null}
          <button
            type="button"
            className="top-command-bar-shell-toggle inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={isRightCollapsed ? 'Expand configuration column' : 'Collapse configuration column'}
            title={isRightCollapsed ? 'Expand configuration column' : 'Collapse configuration column'}
            onClick={() => setRightColumnState((current) => (current === 'collapsed' ? 'full' : 'collapsed'))}
          >
            {isRightCollapsed ? (
              <DoubleArrowIcon size={PANE_CHEVRON_ICON.size} />
            ) : (
              <IconChevronLeft size={PANE_CHEVRON_ICON.size} stroke={PANE_CHEVRON_ICON.stroke} />
            )}
          </button>
        </div>
      ),
      right: (
        <span className="text-sm font-bold top-command-bar-shell-label">Preview</span>
      ),
    });
  }, [isLeftCollapsed, isRightCollapsed, setShellTopSlots]);

  useEffect(() => () => setShellTopSlots(null), [setShellTopSlots]);

  const layoutStyle = useMemo(() => ({
    '--parse-explorer-width': `${LEFT_COLUMN_WIDTH[leftColumnState]}px`,
    '--parse-config-width': `${RIGHT_COLUMN_WIDTH[rightColumnState]}px`,
  }) as CSSProperties, [leftColumnState, rightColumnState]);
  const totalDocPages = Math.max(1, Math.ceil(docRows.length / docsPerPage));
  const activeDocPage = Math.min(docPage, totalDocPages);
  const pagedDocRows = useMemo(() => {
    const start = (activeDocPage - 1) * docsPerPage;
    return docRows.slice(start, start + docsPerPage);
  }, [activeDocPage, docsPerPage]);
  const hasDocs = docRows.length > 0;
  const docRangeStart = hasDocs ? (activeDocPage - 1) * docsPerPage + 1 : 0;
  const docRangeEnd = hasDocs ? Math.min(docRows.length, activeDocPage * docsPerPage) : 0;

  const previewSelector = (
    <div className="flex items-center gap-4 flex-nowrap schema-layout-view-picker">
      <TabLabel active={previewView === 'Preview'} onClick={() => setPreviewView('Preview')}>Preview</TabLabel>
      <TabLabel active={previewView === 'Metadata'} onClick={() => setPreviewView('Metadata')}>Metadata</TabLabel>
      <TabLabel active={previewView === 'Blocks'} onClick={() => setPreviewView('Blocks')}>Blocks</TabLabel>
    </div>
  );

  return (
    <div
      className={`parse-playground-layout parse-playground-layout--test schema-layout-test-page${isLeftCollapsed ? ' is-left-collapsed' : ''}`}
      data-surface="test"
      style={layoutStyle}
    >
      {/* ---- LEFT: Document list ---- */}
      <div className={`parse-playground-explorer schema-layout-test-explorer${isLeftCollapsed ? ' is-collapsed' : ''}`}>
        <div className="schema-layout-left-body">
          <div className="schema-layout-test-upload-card">
            <span className="text-xl font-bold">Drop files here</span>
            <span className="text-sm text-muted-foreground">or click to browse</span>
          </div>

          <ScrollArea className="schema-layout-left-scroll">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between flex-nowrap parse-docs-toolbar">
                <span className="text-xs text-muted-foreground">Select all</span>
                <span className="text-xs text-muted-foreground">{docRows.length} docs</span>
              </div>

              <div className="parse-doc-card-list">
                {pagedDocRows.map((doc, index) => (
                  <div key={doc.id} className={`parse-doc-card${index === 0 ? ' is-active' : ''}`}>
                    <span className="schema-layout-test-checkbox" />
                    <span className={`text-xs parse-doc-card-name ${index === 0 ? 'font-bold' : 'font-semibold'}`}>{doc.title}</span>
                    <span className="text-xs parse-doc-card-format">PDF</span>
                    <span className="text-xs parse-doc-card-size">2 MB</span>
                    <div className="flex items-center gap-1.5 flex-nowrap parse-doc-card-status">
                      <span className="parse-doc-card-status-dot is-green" />
                    </div>
                    <span className="schema-layout-test-doc-action" />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between flex-nowrap schema-layout-docs-footer">
                <span className="text-xs text-muted-foreground">{docRangeStart}-{docRangeEnd} of {docRows.length}</span>
                <div className="flex items-center gap-2 flex-nowrap">
                  <div className="flex items-center gap-1 flex-nowrap schema-layout-docs-size">
                    <span className="text-xs text-muted-foreground">Rows</span>
                    <div className="flex items-center gap-2 flex-nowrap schema-layout-docs-size-tabs">
                      {DOCS_PER_PAGE_OPTIONS.map((sizeOption) => (
                        <span
                          key={sizeOption}
                          className={`text-xs cursor-pointer select-none parse-middle-tab${docsPerPage === sizeOption ? ' is-active' : ''} ${docsPerPage === sizeOption ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}
                          onClick={() => {
                            setDocsPerPage(sizeOption);
                            setDocPage(1);
                          }}
                        >
                          {sizeOption}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Pagination.Root
                    count={docRows.length}
                    pageSize={docsPerPage}
                    siblingCount={0}
                    page={activeDocPage}
                    onPageChange={(details) => setDocPage(details.page)}
                    className="parse-docs-pagination flex items-center gap-1"
                  >
                    <Pagination.PrevTrigger className="inline-flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                      <IconChevronLeft size={14} />
                    </Pagination.PrevTrigger>
                    <Pagination.Context>
                      {(pagination) =>
                        pagination.pages.map((page, index) =>
                          page.type === 'page' ? (
                            <Pagination.Item
                              key={index}
                              {...page}
                              className="inline-flex h-6 min-w-6 items-center justify-center rounded text-xs font-medium text-muted-foreground hover:text-foreground data-selected:bg-accent data-selected:text-foreground"
                            >
                              {page.value}
                            </Pagination.Item>
                          ) : (
                            <Pagination.Ellipsis key={index} index={index} className="text-xs text-muted-foreground">
                              &hellip;
                            </Pagination.Ellipsis>
                          ),
                        )
                      }
                    </Pagination.Context>
                    <Pagination.NextTrigger className="inline-flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                      <IconChevronRight size={14} />
                    </Pagination.NextTrigger>
                  </Pagination.Root>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ---- MIDDLE: Preview ---- */}
      <div className="parse-playground-work schema-layout-test-work">
        <div className="parse-playground-preview">
          <div className="parse-preview-frame">
            <div className="parse-preview-content">
              {previewView === 'Preview' || previewView === 'Metadata' ? (
                <div className="schema-layout-middle-virtual-preview">
                  <div className="flex items-center justify-start flex-nowrap schema-layout-middle-header">
                    {previewSelector}
                    <div className="schema-layout-middle-toolbar-host" ref={setPdfToolbarHost} />
                  </div>
                  <PdfPreview
                    url="/layout-sample.pdf"
                    hideToolbar={!pdfToolbarHost}
                    toolbarPortalTarget={pdfToolbarHost}
                  />
                </div>
              ) : (
                <div className="schema-layout-middle-virtual-preview">
                  <div className="flex items-center justify-start flex-nowrap parse-middle-view-tabs">
                    {previewSelector}
                  </div>
                  <div className="schema-layout-middle-sheet-wrap">
                    <div className="schema-layout-test-preview-sheet" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- RIGHT: Configuration ---- */}
      <div
        className={`parse-playground-right schema-layout-test-right${isRightCollapsed ? ' is-collapsed' : ''}`}
      >
        <div className="flex flex-col schema-layout-test-config-root">
          {isRightCollapsed ? (
            <div className="schema-layout-right-collapsed-body" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2.5 flex-nowrap schema-layout-right-controls">
                <div className="flex items-center gap-2.5 flex-nowrap schema-layout-right-tabs">
                  <TabLabel active={parseConfigView === 'Basic'} onClick={() => setParseConfigView('Basic')}>Basic</TabLabel>
                  <TabLabel active={parseConfigView === 'Advanced'} onClick={() => setParseConfigView('Advanced')}>Advanced</TabLabel>
                </div>
              </div>
              <ScrollArea className="schema-layout-test-config-scroll">
                <div className="flex flex-col gap-2">
                  {parseConfigView === 'Basic' && (
                    <div className="parse-config-section schema-layout-test-config-card">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold">Tiers</span>
                        <div className="parse-config-mode-track">
                          <span className="parse-config-mode-segment" />
                          <span className="parse-config-mode-segment" />
                          <span className="parse-config-mode-segment is-active" />
                          <span className="parse-config-mode-segment" />
                        </div>
                        <div className="flex items-center justify-between flex-nowrap parse-config-mode-labels">
                          <span className="text-xs text-muted-foreground">Fast</span>
                          <span className="text-xs text-muted-foreground">Cost Effective</span>
                          <span className="text-xs font-bold">Agentic</span>
                          <span className="text-xs text-muted-foreground">Agentic Plus</span>
                        </div>
                        <div className="parse-config-tier-card">
                          <div className="flex items-start justify-between gap-2 flex-nowrap">
                            <div>
                              <span className="text-sm font-bold">Agentic</span>
                              <p className="text-xs text-muted-foreground">
                                Works well for most documents with diagrams and images. May struggle with complex layouts
                              </p>
                            </div>
                            <span className="text-sm font-bold">10 credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {parseConfigView === 'Advanced' && (
                    <>
                      <div className="parse-config-section schema-layout-test-config-card">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold">Cost Optimizer</span>
                          <ConfigSwitch label="Enable Cost Optimizer" />
                          <p className="text-xs text-muted-foreground">
                            Automatically route to credits on most simple pages (no tables, charts, or scans)
                          </p>
                        </div>
                      </div>

                      <div className="parse-config-section schema-layout-test-config-card">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold">Page Ranges</span>
                          <LabeledInput label="Target pages" placeholder="e.g. 1-9, 14, 15-13" />
                          <LabeledInput label="Max pages" placeholder="e.g. 100" />
                        </div>
                      </div>

                      <div className="parse-config-section schema-layout-test-config-card">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold">Job Options</span>
                          <p className="text-xs text-muted-foreground">
                            LlamaCloud keeps results cached for 48 hours after upload
                          </p>
                          <ConfigSwitch label="Disable cache" />
                        </div>
                      </div>

                      <div className="parse-config-section schema-layout-test-config-card">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold">Processing Options</span>
                          <span className="text-xs font-semibold">Images</span>
                          <ConfigSwitch label="Remove watermark" />
                          <ConfigSwitch label="Preserve text in image" />
                          <ConfigSwitch label="Preserve hidden text" />

                          <span className="text-xs font-semibold">OCR Parameters</span>
                          <LabeledInput label="Languages" placeholder="en" />

                          <span className="text-xs font-semibold">Experimental (deprecated than parser)</span>
                          <RadioGroup.Root defaultValue="none" className="flex flex-col gap-2">
                            <RadioGroup.Item value="ppc_50" className="inline-flex items-center gap-2">
                              <RadioGroup.ItemControl className="h-4 w-4 rounded-full border border-input bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                              <RadioGroup.ItemText className="text-xs">Agentic Plus (50 credits per chart)</RadioGroup.ItemText>
                              <RadioGroup.ItemHiddenInput />
                            </RadioGroup.Item>
                            <RadioGroup.Item value="ppc_65" className="inline-flex items-center gap-2">
                              <RadioGroup.ItemControl className="h-4 w-4 rounded-full border border-input bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                              <RadioGroup.ItemText className="text-xs">Agentic (65 credits per chart)</RadioGroup.ItemText>
                              <RadioGroup.ItemHiddenInput />
                            </RadioGroup.Item>
                            <RadioGroup.Item value="none" className="inline-flex items-center gap-2">
                              <RadioGroup.ItemControl className="h-4 w-4 rounded-full border border-input bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                              <RadioGroup.ItemText className="text-xs">None</RadioGroup.ItemText>
                              <RadioGroup.ItemHiddenInput />
                            </RadioGroup.Item>
                          </RadioGroup.Root>
                        </div>
                      </div>

                      <div className="parse-config-section schema-layout-test-config-card">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold">Agentic Options</span>
                          <LabeledInput
                            label="Custom prompt"
                            placeholder="e.g. Do not output heading as title, instead prefix them with the text TITLE"
                          />
                        </div>
                      </div>

                      <div className="parse-config-section schema-layout-test-config-card">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold">Output Options</span>
                          <span className="text-xs font-semibold">Markdown</span>
                          <ConfigSwitch label="Annotate links" />
                          <ConfigSwitch label="Inline images in markdown" />

                          <span className="text-xs font-semibold">Tables</span>
                          <ConfigSwitch label="Output tables as Markdown" />
                          <ConfigSwitch label="Compact markdown tables" />
                          <LabeledInput label="Multiline Table Separator" placeholder="<br />" />
                          <ConfigSwitch label="Merge continued tables" />

                          <span className="text-xs font-semibold">Images to Save</span>
                          <ConfigSwitch label="Embedded images" />
                          <ConfigSwitch label="Page screenshots" />
                          <ConfigSwitch label="Layout images" />

                          <span className="text-xs font-semibold">Spatial Text</span>
                          <ConfigSwitch label="Preserve layout alignment across pages" />
                          <ConfigSwitch label="Preserve very small text" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
