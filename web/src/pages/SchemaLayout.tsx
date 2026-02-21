import { ActionIcon, Box, Group, Pagination, Radio, Stack, Switch, Text, TextInput } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { PdfPreview } from '../components/documents/PdfPreview';
import './SchemaLayout.css';

const DOCS_PER_PAGE = 10;
const DOCS_PER_PAGE_OPTIONS = [10, 25, 50] as const;

const LEFT_COLUMN_WIDTH = {
  full: 500,
  collapsed: 56,
} as const;

const RIGHT_COLUMN_WIDTH = {
  full: 450,
  half: 280,
  collapsed: 56,
} as const;

type LeftColumnState = keyof typeof LEFT_COLUMN_WIDTH;
type RightColumnState = keyof typeof RIGHT_COLUMN_WIDTH;
type ParseConfigView = 'Basic' | 'Advanced';
type PreviewView = 'Preview' | 'Metadata' | 'Blocks';

const docRows = Array.from({ length: 37 }, (_, index) => ({
  id: index + 1,
  title: `document_${String(index + 1).padStart(3, '0')}.pdf`,
}));

export default function SchemaLayout() {
  const [leftColumnState, setLeftColumnState] = useState<LeftColumnState>('full');
  const [rightColumnState, setRightColumnState] = useState<RightColumnState>('full');
  const [parseConfigView, setParseConfigView] = useState<ParseConfigView>('Basic');
  const [previewView, setPreviewView] = useState<PreviewView>('Preview');
  const [docPage, setDocPage] = useState(1);
  const [docsPerPage, setDocsPerPage] = useState(DOCS_PER_PAGE);
  const [pdfToolbarHost, setPdfToolbarHost] = useState<HTMLDivElement | null>(null);

  const isLeftCollapsed = leftColumnState === 'collapsed';
  const isRightCollapsed = rightColumnState === 'collapsed';

  const layoutStyle = useMemo(() => ({
    '--parse-explorer-width': `${LEFT_COLUMN_WIDTH[leftColumnState]}px`,
    '--parse-config-width': `${RIGHT_COLUMN_WIDTH[rightColumnState]}px`,
  }) as CSSProperties, [leftColumnState, rightColumnState]);
  const totalDocPages = Math.max(1, Math.ceil(docRows.length / docsPerPage));
  const pagedDocRows = useMemo(() => {
    const start = (docPage - 1) * docsPerPage;
    return docRows.slice(start, start + docsPerPage);
  }, [docPage, docsPerPage]);
  const hasDocs = docRows.length > 0;
  const docRangeStart = hasDocs ? (docPage - 1) * docsPerPage + 1 : 0;
  const docRangeEnd = hasDocs ? Math.min(docRows.length, docPage * docsPerPage) : 0;
  const previewSelector = (
    <Group gap={15} wrap="nowrap" className="schema-layout-view-picker">
      <Text
        size="sm"
        fw={previewView === 'Preview' ? 700 : 600}
        c={previewView === 'Preview' ? undefined : 'dimmed'}
        className={`parse-middle-tab${previewView === 'Preview' ? ' is-active' : ''}`}
        onClick={() => setPreviewView('Preview')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Preview
      </Text>
      <Text
        size="sm"
        fw={previewView === 'Metadata' ? 700 : 600}
        c={previewView === 'Metadata' ? undefined : 'dimmed'}
        className={`parse-middle-tab${previewView === 'Metadata' ? ' is-active' : ''}`}
        onClick={() => setPreviewView('Metadata')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Metadata
      </Text>
      <Text
        size="sm"
        fw={previewView === 'Blocks' ? 700 : 600}
        c={previewView === 'Blocks' ? undefined : 'dimmed'}
        className={`parse-middle-tab${previewView === 'Blocks' ? ' is-active' : ''}`}
        onClick={() => setPreviewView('Blocks')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Blocks
      </Text>
    </Group>
  );

  useEffect(() => {
    if (docPage <= totalDocPages) return;
    setDocPage(totalDocPages);
  }, [docPage, totalDocPages]);

  const toggleLeftColumn = () => {
    setLeftColumnState((current) => (current === 'collapsed' ? 'full' : 'collapsed'));
  };

  const cycleRightColumn = () => {
    setRightColumnState((current) => {
      if (current === 'full') return 'half';
      if (current === 'half') return 'collapsed';
      return 'full';
    });
  };

  return (
    <Box
      className={`parse-playground-layout parse-playground-layout--test schema-layout-test-page${isLeftCollapsed ? ' is-left-collapsed' : ''}`}
      data-surface="test"
      style={layoutStyle}
    >
      <Box className={`parse-playground-explorer schema-layout-test-explorer${isLeftCollapsed ? ' is-collapsed' : ''}`}>
        <Group justify={isLeftCollapsed ? 'center' : 'space-between'} wrap="nowrap" className="schema-layout-left-header">
          {!isLeftCollapsed ? (
            <Group gap={8} wrap="nowrap">
              <Text size="sm" fw={700}>Documents</Text>
            </Group>
          ) : null}
          <ActionIcon
            size="sm"
            variant="subtle"
            className="schema-layout-snap-btn"
            aria-label={isLeftCollapsed ? 'Expand left column' : 'Collapse left column'}
            title={isLeftCollapsed ? 'Expand left column' : 'Collapse left column'}
            onClick={toggleLeftColumn}
          >
            {isLeftCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
          </ActionIcon>
        </Group>

        {isLeftCollapsed ? (
          <Box
            className="schema-layout-left-collapsed-body"
            role="button"
            tabIndex={0}
            onClick={toggleLeftColumn}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              toggleLeftColumn();
            }}
          >
            <Group gap={8} wrap="nowrap" className="schema-layout-collapsed-rail-content">
              <ActionIcon
                size="sm"
                variant="subtle"
                className="schema-layout-snap-btn"
                aria-label="Expand left column"
                onClick={toggleLeftColumn}
              >
                <IconChevronRight size={14} />
              </ActionIcon>
              <Text size="xs" c="dimmed" className="schema-layout-vertical-label">DOCS</Text>
            </Group>
          </Box>
        ) : (
          <Box className="schema-layout-left-body">
            <Box className="schema-layout-test-upload-card">
              <Text size="xl" fw={700}>Drop files here</Text>
              <Text size="sm" c="dimmed">or click to browse</Text>
            </Box>

            <Stack gap="xs" className="schema-layout-left-scroll">
              <Group justify="space-between" align="center" wrap="nowrap" className="parse-docs-toolbar">
                <Text size="xs" c="dimmed">Select all</Text>
                <Text size="xs" c="dimmed">{docRows.length} docs</Text>
              </Group>

              <Box className="parse-doc-card-list">
                {pagedDocRows.map((doc, index) => (
                  <Box key={doc.id} className={`parse-doc-card${index === 0 ? ' is-active' : ''}`}>
                    <span className="schema-layout-test-checkbox" />
                    <Text size="xs" fw={index === 0 ? 700 : 600} className="parse-doc-card-name">{doc.title}</Text>
                    <Text size="xs" className="parse-doc-card-format">PDF</Text>
                    <Text size="xs" className="parse-doc-card-size">2 MB</Text>
                    <Group gap={6} wrap="nowrap" className="parse-doc-card-status">
                      <span className="parse-doc-card-status-dot is-green" />
                    </Group>
                    <span className="schema-layout-test-doc-action" />
                  </Box>
                ))}
              </Box>

              <Group justify="space-between" align="center" wrap="nowrap" className="schema-layout-docs-footer">
                <Text size="xs" c="dimmed">{docRangeStart}-{docRangeEnd} of {docRows.length}</Text>
                <Group gap={8} align="center" wrap="nowrap">
                  <Group gap={4} align="center" wrap="nowrap" className="schema-layout-docs-size">
                    <Text size="xs" c="dimmed">Rows</Text>
                    <Group gap={8} wrap="nowrap" className="schema-layout-docs-size-tabs">
                      {DOCS_PER_PAGE_OPTIONS.map((sizeOption) => (
                        <Text
                          key={sizeOption}
                          size="xs"
                          fw={docsPerPage === sizeOption ? 700 : 600}
                          c={docsPerPage === sizeOption ? undefined : 'dimmed'}
                          className={`parse-middle-tab${docsPerPage === sizeOption ? ' is-active' : ''}`}
                          onClick={() => {
                            setDocsPerPage(sizeOption);
                            setDocPage(1);
                          }}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          {sizeOption}
                        </Text>
                      ))}
                    </Group>
                  </Group>
                  <Pagination
                    size="xs"
                    total={totalDocPages}
                    value={docPage}
                    onChange={setDocPage}
                    siblings={0}
                    boundaries={1}
                    className="parse-docs-pagination"
                  />
                </Group>
              </Group>
            </Stack>
          </Box>
        )}
      </Box>

      <Box className="parse-playground-work schema-layout-test-work">
        <Box className="parse-playground-preview">
          <Box className="parse-preview-frame">
            <Box className="parse-preview-content">
              {previewView === 'Preview' || previewView === 'Metadata' ? (
                <Box className="schema-layout-middle-virtual-preview">
                  <Group justify="flex-start" align="center" className="schema-layout-middle-header" wrap="nowrap">
                    {previewSelector}
                    <Box className="schema-layout-middle-toolbar-host" ref={setPdfToolbarHost} />
                  </Group>
                  <PdfPreview
                    title="Layout Sample"
                    url="/layout-sample.pdf"
                    hideToolbar={!pdfToolbarHost}
                    toolbarPortalTarget={pdfToolbarHost}
                  />
                </Box>
              ) : (
                <Box className="schema-layout-middle-virtual-preview">
                  <Group justify="flex-start" align="center" className="parse-middle-view-tabs" wrap="nowrap">
                    {previewSelector}
                  </Group>
                  <Box className="schema-layout-middle-sheet-wrap">
                    <Box className="schema-layout-test-preview-sheet" />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        className={`parse-playground-right schema-layout-test-right${rightColumnState === 'half' ? ' is-half' : ''}${isRightCollapsed ? ' is-collapsed' : ''}`}
      >
        <Stack gap={0} className="schema-layout-test-config-root">
          <Group justify={isRightCollapsed ? 'center' : 'space-between'} wrap="nowrap" className="schema-layout-right-header">
            {!isRightCollapsed ? (
              <Group gap={8} wrap="nowrap" className="schema-layout-config-title">
                <Text size="sm" fw={700}>Configuration</Text>
              </Group>
            ) : null}
            <ActionIcon
              size="sm"
              variant="subtle"
              className="schema-layout-snap-btn"
              aria-label={isRightCollapsed ? 'Expand configuration column' : 'Cycle right column snap mode'}
              title={isRightCollapsed ? 'Expand configuration column' : 'Cycle right column snap mode'}
              onClick={cycleRightColumn}
            >
              {isRightCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
            </ActionIcon>
          </Group>

          {isRightCollapsed ? (
            <Box className="schema-layout-right-collapsed-body" />
          ) : (
            <>
              <Group justify="space-between" gap={10} wrap="nowrap" className="schema-layout-right-controls">
                <Group gap={10} wrap="nowrap" className="schema-layout-right-tabs">
                  <Text
                    size="sm"
                    fw={parseConfigView === 'Basic' ? 700 : 600}
                    c={parseConfigView === 'Basic' ? undefined : 'dimmed'}
                    className={`parse-middle-tab${parseConfigView === 'Basic' ? ' is-active' : ''}`}
                    onClick={() => setParseConfigView('Basic')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Basic
                  </Text>
                  <Text
                    size="sm"
                    fw={parseConfigView === 'Advanced' ? 700 : 600}
                    c={parseConfigView === 'Advanced' ? undefined : 'dimmed'}
                    className={`parse-middle-tab${parseConfigView === 'Advanced' ? ' is-active' : ''}`}
                    onClick={() => setParseConfigView('Advanced')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Advanced
                  </Text>
                </Group>
              </Group>
              <Stack gap="xs" className="schema-layout-test-config-scroll">
                {parseConfigView === 'Basic' && (
                  <Box className="parse-config-section schema-layout-test-config-card">
                    <Stack gap={8}>
                      <Text fw={600} size="sm">Tiers</Text>
                      <Box className="parse-config-mode-track">
                        <span className="parse-config-mode-segment" />
                        <span className="parse-config-mode-segment" />
                        <span className="parse-config-mode-segment is-active" />
                        <span className="parse-config-mode-segment" />
                      </Box>
                      <Group justify="space-between" className="parse-config-mode-labels" wrap="nowrap">
                        <Text size="xs" c="dimmed">Fast</Text>
                        <Text size="xs" c="dimmed">Cost Effective</Text>
                        <Text size="xs" fw={700}>Agentic</Text>
                        <Text size="xs" c="dimmed">Agentic Plus</Text>
                      </Group>
                      <Box className="parse-config-tier-card">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                          <Box>
                            <Text size="sm" fw={700}>Agentic</Text>
                            <Text size="xs" c="dimmed">
                              Works well for most documents with diagrams and images. May struggle with complex layouts
                            </Text>
                          </Box>
                          <Text size="sm" fw={700}>10 credits</Text>
                        </Group>
                      </Box>
                    </Stack>
                  </Box>
                )}

                {parseConfigView === 'Advanced' && (
                  <>
                    <Box className="parse-config-section schema-layout-test-config-card">
                      <Stack gap={8}>
                        <Text fw={700} size="sm">Cost Optimizer</Text>
                        <Switch label="Enable Cost Optimizer" />
                        <Text size="xs" c="dimmed">
                          Automatically route to credits on most simple pages (no tables, charts, or scans)
                        </Text>
                      </Stack>
                    </Box>

                    <Box className="parse-config-section schema-layout-test-config-card">
                      <Stack gap="xs">
                        <Text fw={700} size="sm">Page Ranges</Text>
                        <TextInput label="Target pages" placeholder="e.g. 1-9, 14, 15-13" />
                        <TextInput label="Max pages" placeholder="e.g. 100" />
                      </Stack>
                    </Box>

                    <Box className="parse-config-section schema-layout-test-config-card">
                      <Stack gap={8}>
                        <Text fw={700} size="sm">Job Options</Text>
                        <Text size="xs" c="dimmed">
                          LlamaCloud keeps results cached for 48 hours after upload
                        </Text>
                        <Switch label="Disable cache" />
                      </Stack>
                    </Box>

                    <Box className="parse-config-section schema-layout-test-config-card">
                      <Stack gap={8}>
                        <Text fw={700} size="sm">Processing Options</Text>
                        <Text size="xs" fw={600}>Images</Text>
                        <Switch label="Remove watermark" />
                        <Switch label="Preserve text in image" />
                        <Switch label="Preserve hidden text" />

                        <Text size="xs" fw={600}>OCR Parameters</Text>
                        <TextInput label="Languages" placeholder="en" />

                        <Text size="xs" fw={600}>Experimental (deprecated than parser)</Text>
                        <Radio.Group defaultValue="none">
                          <Stack gap={8}>
                            <Radio value="ppc_50" label="Agentic Plus (50 credits per chart)" />
                            <Radio value="ppc_65" label="Agentic (65 credits per chart)" />
                            <Radio value="none" label="None" />
                          </Stack>
                        </Radio.Group>
                      </Stack>
                    </Box>

                    <Box className="parse-config-section schema-layout-test-config-card">
                      <Stack gap="xs">
                        <Text fw={700} size="sm">Agentic Options</Text>
                        <TextInput
                          label="Custom prompt"
                          placeholder="e.g. Do not output heading as title, instead prefix them with the text TITLE"
                        />
                      </Stack>
                    </Box>

                    <Box className="parse-config-section schema-layout-test-config-card">
                      <Stack gap={8}>
                        <Text fw={700} size="sm">Output Options</Text>
                        <Text size="xs" fw={600}>Markdown</Text>
                        <Switch label="Annotate links" />
                        <Switch label="Inline images in markdown" />

                        <Text size="xs" fw={600}>Tables</Text>
                        <Switch label="Output tables as Markdown" />
                        <Switch label="Compact markdown tables" />
                        <TextInput label="Multiline Table Separator" placeholder="<br />" />
                        <Switch label="Merge continued tables" />

                        <Text size="xs" fw={600}>Images to Save</Text>
                        <Switch label="Embedded images" />
                        <Switch label="Page screenshots" />
                        <Switch label="Layout images" />

                        <Text size="xs" fw={600}>Spatial Text</Text>
                        <Switch label="Preserve layout alignment across pages" />
                        <Switch label="Preserve very small text" />
                      </Stack>
                    </Box>
                  </>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
