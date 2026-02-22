import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Center, Group, Loader, Switch, Text } from '@mantine/core';
import {
  PdfLoader,
  PdfHighlighter,
  Popup,
  type IHighlight,
  type Scaled,
} from 'react-pdf-highlighter';
import 'react-pdf-highlighter/dist/style.css';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { resolveOverlayColors } from '@/lib/doclingOverlayColors';
import { useBlockTypeRegistry } from '@/hooks/useBlockTypeRegistry';
import type { BlockRow } from '@/lib/types';

const PDF_WORKER_SRC = new URL(
  '../../../node_modules/react-pdf-highlighter/node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
const SHOW_ALL_BOUNDING_BOXES_DEFAULT = true;
const RESULTS_PDF_BASE_SCALE = '0.82';

type DoclingHighlight = IHighlight & {
  blockUid: string;
  blockIndex: number;
  blockType: string;
  parserPath: string | null;
  pageNo: number;
  snippet: string;
  overlayBorderColor?: string;
  overlayBgColor?: string;
};

export type ParsedResultBlock = {
  id: string;
  blockUid: string;
  blockIndex: number;
  blockType: string;
  pageNo: number;
  snippet: string;
};

type PdfResultsHighlighterProps = {
  title: string;
  pdfUrl: string;
  doclingJsonUrl: string;
  convUid: string;
  activeHighlightId?: string | null;
  onActiveHighlightIdChange?: (nextHighlightId: string | null) => void;
  showAllBoundingBoxes?: boolean;
  onShowAllBoundingBoxesChange?: (nextValue: boolean) => void;
  showBlocksPanel?: boolean;
  onShowBlocksPanelChange?: (nextValue: boolean) => void;
  onBlocksChange?: (blocks: ParsedResultBlock[]) => void;
};

function findScrollableAncestor(node: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = node;
  while (current) {
    if (current.scrollHeight > current.clientHeight + 1) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function decodePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function resolveJsonPointerRaw(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith('#/')) return null;
  const tokens = pointer
    .slice(2)
    .split('/')
    .map((segment) => decodePointerToken(decodeURIComponent(segment)));

  let current: unknown = root;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(token, 10);
      if (!Number.isFinite(index) || index < 0 || index >= current.length) return null;
      current = current[index];
      continue;
    }
    const currentRecord = asRecord(current);
    if (!currentRecord || !(token in currentRecord)) return null;
    current = currentRecord[token];
  }
  return current;
}

function resolveJsonPointer(root: unknown, pointer: string): unknown {
  let current = resolveJsonPointerRaw(root, pointer);
  if (current === null || current === undefined) return current;

  const visitedRefs = new Set<string>();
  for (let depth = 0; depth < 8; depth += 1) {
    const record = asRecord(current);
    const ref = typeof record?.$ref === 'string' ? record.$ref : null;
    if (!ref) return current;
    if (visitedRefs.has(ref)) return current;
    visitedRefs.add(ref);
    current = resolveJsonPointerRaw(root, ref);
    if (current === null || current === undefined) return current;
  }

  return current;
}

function extractPageSizes(doclingDocument: unknown): Map<number, { width: number; height: number }> {
  const pageSizes = new Map<number, { width: number; height: number }>();
  const root = asRecord(doclingDocument);
  const pages = root ? asRecord(root.pages) : null;
  if (!pages) return pageSizes;

  for (const [pageKey, pageValue] of Object.entries(pages)) {
    const pageNumber = Number.parseInt(pageKey, 10);
    const pageRecord = asRecord(pageValue);
    const sizeRecord = pageRecord ? asRecord(pageRecord.size) : null;
    const width = Number(sizeRecord?.width);
    const height = Number(sizeRecord?.height);
    if (!Number.isFinite(pageNumber) || pageNumber < 1) continue;
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
    pageSizes.set(pageNumber, { width, height });
  }

  return pageSizes;
}

function extractScaledRectsForNode(
  node: unknown,
  pageSizes: Map<number, { width: number; height: number }>,
): Array<{ pageNo: number; rect: Scaled }> {
  const nodeRecord = asRecord(node);
  const provList = nodeRecord?.prov;
  if (!Array.isArray(provList)) return [];

  const results: Array<{ pageNo: number; rect: Scaled }> = [];

  for (const provEntry of provList) {
    const provRecord = asRecord(provEntry);
    const bbox = provRecord ? asRecord(provRecord.bbox) : null;
    const pageNo = Number(provRecord?.page_no);
    const pageSize = pageSizes.get(pageNo);
    if (!bbox || !pageSize || !Number.isFinite(pageNo)) continue;

    const l = Number(bbox.l);
    const t = Number(bbox.t);
    const r = Number(bbox.r);
    const b = Number(bbox.b);
    if (![l, t, r, b].every((value) => Number.isFinite(value))) continue;

    const coordOrigin = typeof bbox.coord_origin === 'string' ? bbox.coord_origin.toUpperCase() : 'BOTTOMLEFT';
    let y1 = b;
    let y2 = t;
    if (coordOrigin === 'TOPLEFT') {
      y1 = pageSize.height - t;
      y2 = pageSize.height - b;
    }

    const x1 = Math.min(l, r);
    const x2 = Math.max(l, r);
    const normalizedY1 = Math.min(y1, y2);
    const normalizedY2 = Math.max(y1, y2);

    results.push({
      pageNo,
      rect: {
        x1,
        y1: normalizedY1,
        x2,
        y2: normalizedY2,
        width: pageSize.width,
        height: pageSize.height,
        pageNumber: pageNo,
      },
    });
  }

  return results;
}

function mergeScaledRects(rects: Scaled[]): Scaled {
  const first = rects[0];
  let x1 = first.x1;
  let y1 = first.y1;
  let x2 = first.x2;
  let y2 = first.y2;

  for (const rect of rects) {
    x1 = Math.min(x1, rect.x1);
    y1 = Math.min(y1, rect.y1);
    x2 = Math.max(x2, rect.x2);
    y2 = Math.max(y2, rect.y2);
  }

  return {
    x1,
    y1,
    x2,
    y2,
    width: first.width,
    height: first.height,
    pageNumber: first.pageNumber,
  };
}

function buildDoclingHighlights(
  blocks: BlockRow[],
  doclingDocument: unknown,
  overlayBorderMap?: Record<string, string>,
  overlayBgMap?: Record<string, string>,
): DoclingHighlight[] {
  const pageSizes = extractPageSizes(doclingDocument);
  const highlights: DoclingHighlight[] = [];

  for (const block of blocks) {
    const locator = asRecord(block.block_locator);
    const locatorType = typeof locator?.type === 'string' ? locator.type : null;
    const parserPath = typeof locator?.pointer === 'string' ? locator.pointer : null;
    const parserBlockType = typeof locator?.parser_block_type === 'string' ? locator.parser_block_type : null;
    if (locatorType !== 'docling_json_pointer' || !parserPath) continue;

    const node = resolveJsonPointer(doclingDocument, parserPath);
    const nodeLabel = asRecord(node)?.label;
    const overlayColors = resolveOverlayColors(
      block.block_type,
      parserBlockType,
      nodeLabel,
      overlayBorderMap,
      overlayBgMap,
    );
    const rectEntries = extractScaledRectsForNode(node, pageSizes);
    if (rectEntries.length === 0) continue;

    const rectsByPage = new Map<number, Scaled[]>();
    for (const entry of rectEntries) {
      const pageRects = rectsByPage.get(entry.pageNo);
      if (pageRects) {
        pageRects.push(entry.rect);
      } else {
        rectsByPage.set(entry.pageNo, [entry.rect]);
      }
    }

    const normalizedText = typeof block.block_content === 'string'
      ? block.block_content.replace(/\s+/g, ' ').trim()
      : '';
    const snippet = normalizedText.slice(0, 300);

    for (const [pageNo, rects] of rectsByPage.entries()) {
      const boundingRect = mergeScaledRects(rects);
      highlights.push({
        id: `${block.block_uid}:p${pageNo}`,
        blockUid: block.block_uid,
        blockIndex: block.block_index,
        blockType: block.block_type,
        parserPath,
        pageNo,
        snippet,
        overlayBorderColor: overlayColors.border,
        overlayBgColor: overlayColors.bg,
        content: { text: normalizedText },
        comment: {
          emoji: '',
          text: `${block.block_type} #${block.block_index}`,
        },
        position: {
          pageNumber: pageNo,
          boundingRect,
          rects,
          usePdfCoordinates: true,
        },
      });
    }
  }

  return highlights.sort((a, b) => (
    a.blockIndex - b.blockIndex || a.pageNo - b.pageNo
  ));
}

export function PdfResultsHighlighter({
  title,
  pdfUrl,
  doclingJsonUrl,
  convUid,
  activeHighlightId,
  onActiveHighlightIdChange,
  showAllBoundingBoxes: showAllBoundingBoxesProp,
  onShowAllBoundingBoxesChange,
  showBlocksPanel: showBlocksPanelProp,
  onShowBlocksPanelChange,
  onBlocksChange,
}: PdfResultsHighlighterProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawBlocks, setRawBlocks] = useState<BlockRow[]>([]);
  const [doclingDocument, setDoclingDocument] = useState<unknown | null>(null);
  const [showAllBoundingBoxesInternal, setShowAllBoundingBoxesInternal] = useState(SHOW_ALL_BOUNDING_BOXES_DEFAULT);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [highlightRenderNudge, setHighlightRenderNudge] = useState(0);
  const [showBlocksPanel, setShowBlocksPanel] = useState(true);
  const [scrollRefRevision, setScrollRefRevision] = useState(0);
  const scrollToHighlightRef = useRef<((highlight: DoclingHighlight) => void) | null>(null);
  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const [pendingScrollHighlightId, setPendingScrollHighlightId] = useState<string | null>(null);
  const { registry } = useBlockTypeRegistry();
  const showAllBoundingBoxes = showAllBoundingBoxesProp ?? showAllBoundingBoxesInternal;
  const resolvedShowBlocksPanel = showBlocksPanelProp ?? showBlocksPanel;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setRawBlocks([]);
      setDoclingDocument(null);
      setSelectedHighlightId(null);

      try {
        const [blocksResult, doclingResponse] = await Promise.all([
          supabase
            .from(TABLES.blocks)
            .select('block_uid, conv_uid, block_index, block_type, block_locator, block_content')
            .eq('conv_uid', convUid)
            .order('block_index', { ascending: true })
            .limit(5000),
          fetch(doclingJsonUrl),
        ]);

        if (blocksResult.error) {
          throw new Error(blocksResult.error.message);
        }
        if (!doclingResponse.ok) {
          throw new Error(`Failed to load Docling JSON (HTTP ${doclingResponse.status}).`);
        }

        const nextBlocks = (blocksResult.data ?? []) as BlockRow[];
        const nextDoclingDocument = await doclingResponse.json();

        if (cancelled) return;
        setRawBlocks(nextBlocks);
        setDoclingDocument(nextDoclingDocument);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [convUid, doclingJsonUrl]);

  const highlights = useMemo(() => {
    if (!doclingDocument) return [];
    return buildDoclingHighlights(
      rawBlocks,
      doclingDocument,
      registry?.overlayBorder,
      registry?.overlayBg,
    );
  }, [doclingDocument, rawBlocks, registry]);

  useEffect(() => {
    if (highlights.length === 0) {
      setSelectedHighlightId(null);
      return;
    }
    setSelectedHighlightId((current) => {
      if (current && highlights.some((highlight) => highlight.id === current)) {
        return current;
      }
      return highlights[0].id;
    });
  }, [highlights]);

  const visibleHighlights = useMemo(() => {
    if (highlightRenderNudge < 0) return [];
    if (showAllBoundingBoxes) return [...highlights];
    if (!selectedHighlightId) return [];
    return highlights.filter((highlight) => highlight.id === selectedHighlightId);
  }, [highlightRenderNudge, highlights, selectedHighlightId, showAllBoundingBoxes]);

  useEffect(() => {
    setPdfLoadError(null);
    setHighlightRenderNudge(0);
  }, [pdfUrl]);

  useEffect(() => {
    if (showAllBoundingBoxesProp !== undefined) return;
    setShowAllBoundingBoxesInternal(SHOW_ALL_BOUNDING_BOXES_DEFAULT);
  }, [convUid, doclingJsonUrl, pdfUrl, showAllBoundingBoxesProp]);

  const handleToggleShowAllBoundingBoxes = useCallback((nextValue: boolean) => {
    if (showAllBoundingBoxesProp === undefined) {
      setShowAllBoundingBoxesInternal(nextValue);
    }
    onShowAllBoundingBoxesChange?.(nextValue);
  }, [onShowAllBoundingBoxesChange, showAllBoundingBoxesProp]);

  const handleToggleShowBlocksPanel = useCallback((nextValue: boolean) => {
    if (showBlocksPanelProp === undefined) {
      setShowBlocksPanel(nextValue);
    }
    onShowBlocksPanelChange?.(nextValue);
  }, [onShowBlocksPanelChange, showBlocksPanelProp]);

  const scrollToHighlightFallback = useCallback((highlight: DoclingHighlight): boolean => {
    const root = pdfViewportRef.current;
    if (!root) return false;

    const pageSelector = `.page[data-page-number="${highlight.pageNo}"]`;
    const targetPage = root.querySelector<HTMLElement>(pageSelector);
    const firstPage = root.querySelector<HTMLElement>('.page[data-page-number="1"], .page');
    const scrollContainer = findScrollableAncestor(targetPage ?? firstPage ?? root);
    if (!scrollContainer) return false;

    if (!targetPage) {
      const pageOne = root.querySelector<HTMLElement>('.page[data-page-number="1"]');
      const pageTwo = root.querySelector<HTMLElement>('.page[data-page-number="2"]');
      const stride = (
        pageOne && pageTwo
          ? Math.abs(pageTwo.offsetTop - pageOne.offsetTop)
          : pageOne
            ? pageOne.clientHeight + 24
            : 900
      );
      const estimatedTop = Math.max(0, stride * Math.max(0, highlight.pageNo - 1));
      scrollContainer.scrollTo({ top: estimatedTop, behavior: 'auto' });
      return true;
    }

    const pageRect = targetPage.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const pageTopInContainer = pageRect.top - containerRect.top + scrollContainer.scrollTop;

    let blockOffset = 0;
    const scaledRect = highlight.position.boundingRect;
    if (scaledRect && typeof scaledRect.height === 'number' && scaledRect.height > 0 && typeof scaledRect.y2 === 'number') {
      const ratioFromTop = 1 - (scaledRect.y2 / scaledRect.height);
      if (Number.isFinite(ratioFromTop)) {
        blockOffset = Math.max(0, Math.min(1, ratioFromTop)) * targetPage.clientHeight;
      }
    }

    const targetTop = Math.max(0, pageTopInContainer + blockOffset - 24);
    scrollContainer.scrollTo({ top: targetTop, behavior: 'auto' });
    return true;
  }, []);

  const scrollToHighlight = useCallback((highlight: DoclingHighlight): boolean => {
    const scroll = scrollToHighlightRef.current;
    if (!scroll) {
      return scrollToHighlightFallback(highlight);
    }
    scroll(highlight);
    requestAnimationFrame(() => {
      scrollToHighlightRef.current?.(highlight);
    });
    window.setTimeout(() => {
      scrollToHighlightRef.current?.(highlight);
    }, 140);
    return true;
  }, [scrollToHighlightFallback]);

  const requestHighlightFocus = useCallback((nextHighlightId: string | null) => {
    setSelectedHighlightId(nextHighlightId);
    setPendingScrollHighlightId(nextHighlightId);
    onActiveHighlightIdChange?.(nextHighlightId);
  }, [onActiveHighlightIdChange]);

  const focusHighlight = useCallback((highlight: DoclingHighlight) => {
    requestHighlightFocus(highlight.id);
  }, [requestHighlightFocus]);

  useEffect(() => {
    if (activeHighlightId === undefined) return;

    if (!activeHighlightId) {
      setSelectedHighlightId(null);
      setPendingScrollHighlightId(null);
      return;
    }

    if (selectedHighlightId !== activeHighlightId) {
      setSelectedHighlightId(activeHighlightId);
    }
    setPendingScrollHighlightId(activeHighlightId);
  }, [activeHighlightId, highlights, selectedHighlightId]);

  useEffect(() => {
    const pendingId = pendingScrollHighlightId;
    if (!pendingId) return;
    const target = highlights.find((highlight) => highlight.id === pendingId);
    if (!target) return;
    if (!scrollToHighlight(target)) return;
    setPendingScrollHighlightId(null);
  }, [highlights, pendingScrollHighlightId, scrollRefRevision, scrollToHighlight]);


  useEffect(() => {
    if (highlights.length === 0) return undefined;

    const rafId = requestAnimationFrame(() => {
      setHighlightRenderNudge((value) => value + 1);
    });
    const timeoutId = window.setTimeout(() => {
      setHighlightRenderNudge((value) => value + 1);
    }, 220);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [highlights.length, convUid, doclingJsonUrl, pdfUrl]);

  useEffect(() => {
    if (!onBlocksChange) return;
    const blocks = highlights.map((highlight) => ({
      id: highlight.id,
      blockUid: highlight.blockUid,
      blockIndex: highlight.blockIndex,
      blockType: highlight.blockType,
      pageNo: highlight.pageNo,
      snippet: highlight.snippet,
    }));
    onBlocksChange(blocks);
  }, [highlights, onBlocksChange]);

  if (loading) {
    return (
      <Center h="100%">
        <StackedLoader label="Loading parsed blocks..." />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100%">
        <Text size="sm" c="red" ta="center">{error}</Text>
      </Center>
    );
  }

  if (highlights.length === 0) {
    return (
      <Center h="100%">
        <Text size="sm" c="dimmed" ta="center">
          No Docling blocks with geometry were found for this document.
        </Text>
      </Center>
    );
  }

  return (
    <Box className={`parse-docling-results${resolvedShowBlocksPanel ? '' : ' parse-docling-results--pdf-only'}`}>
      <Box className="parse-docling-results-preview">
        <Group justify="space-between" align="center" wrap="nowrap" className="parse-docling-results-toolbar">
          <Group gap="xs" wrap="nowrap">
            <Switch
              className="parse-overlay-toggle"
              size="xs"
              label="Show overlay"
              checked={showAllBoundingBoxes}
              onChange={(event) => handleToggleShowAllBoundingBoxes(event.currentTarget.checked)}
            />
            <Switch
              className="parse-overlay-toggle"
              size="xs"
              label="Show blocks"
              checked={resolvedShowBlocksPanel}
              onChange={(event) => handleToggleShowBlocksPanel(event.currentTarget.checked)}
            />
          </Group>
          <Text size="xs" c="dimmed">{highlights.length} blocks</Text>
        </Group>
        <Box className="parse-docling-results-pdf" ref={pdfViewportRef}>
          <PdfLoader
            workerSrc={PDF_WORKER_SRC}
            url={pdfUrl}
            onError={(loadError) => {
              const message = loadError instanceof Error ? loadError.message : String(loadError);
              setPdfLoadError(message || 'Unknown PDF loader error.');
            }}
            beforeLoad={
              <Center h="100%">
                <Loader size="sm" />
              </Center>
            }
            errorMessage={
              <Center h="100%">
                <Text size="sm" c="dimmed" ta="center">
                  PDF preview failed for {title}.
                  {pdfLoadError ? ` (${pdfLoadError})` : ''}
                </Text>
              </Center>
            }
          >
            {(pdfDocument) => (
              <PdfHighlighter<DoclingHighlight>
                pdfDocument={pdfDocument}
                enableAreaSelection={() => false}
                onSelectionFinished={() => null}
                onScrollChange={() => {}}
                scrollRef={(scrollTo) => {
                  if (scrollToHighlightRef.current === scrollTo) return;
                  scrollToHighlightRef.current = scrollTo;
                  setScrollRefRevision((value) => value + 1);
                }}
                highlights={visibleHighlights}
                pdfScaleValue={RESULTS_PDF_BASE_SCALE}
                highlightTransform={(highlight, _index, setTip, hideTip, _viewportToScaled, _screenshot, isScrolledTo) => {
                  const isActive = selectedHighlightId === highlight.id;

                  return (
                    <Popup
                      key={highlight.id}
                      popupContent={(
                        <Box className="parse-docling-box-popup">
                          <Text size="xs" fw={700}>
                            {highlight.blockType} | #{highlight.blockIndex} | p.{highlight.pageNo}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={4}>
                            {highlight.snippet || '[no text]'}
                          </Text>
                        </Box>
                      )}
                      onMouseOver={(content) => setTip(highlight, () => content)}
                      onMouseOut={hideTip}
                    >
                      <Fragment>
                        {highlight.position.rects.map((rect, rectIndex) => {
                          const rectStyle: React.CSSProperties = {
                            left: rect.left,
                            top: rect.top,
                            width: rect.width,
                            height: rect.height,
                            borderColor: highlight.overlayBorderColor,
                            background: highlight.overlayBgColor,
                          };
                          return (
                            <button
                              type="button"
                              key={`${highlight.id}:rect:${rectIndex}`}
                              className={`parse-docling-block-box${isActive ? ' is-active' : ''}${isScrolledTo ? ' is-scrolled' : ''}`}
                              style={rectStyle}
                              onClick={() => focusHighlight(highlight)}
                              title={`${highlight.blockType} #${highlight.blockIndex} p.${highlight.pageNo}`}
                              aria-label={`Block ${highlight.blockIndex} on page ${highlight.pageNo}`}
                            />
                          );
                        })}
                      </Fragment>
                    </Popup>
                  );
                }}
              />
            )}
          </PdfLoader>
        </Box>
      </Box>
      {resolvedShowBlocksPanel && (
        <Box className="parse-docling-results-panel">
          <Group justify="space-between" align="center" wrap="nowrap" className="parse-docling-results-panel-head">
            <Text size="sm" fw={700}>Result</Text>
            <Text size="xs" c="dimmed">Formatted</Text>
          </Group>
          <Box className="parse-docling-results-list">
            {highlights.map((highlight) => {
              const cardStyle = {
                '--parse-block-card-accent': highlight.overlayBorderColor,
                '--parse-block-card-fill': highlight.overlayBgColor,
              } as React.CSSProperties;
              return (
                <button
                  key={highlight.id}
                  type="button"
                  className={`parse-docling-results-item${selectedHighlightId === highlight.id ? ' is-active' : ''}`}
                  onClick={() => focusHighlight(highlight)}
                  style={cardStyle}
                >
                  <Text size="xs" fw={700}>
                    {highlight.blockType} | #{highlight.blockIndex} | p.{highlight.pageNo}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={3}>
                    {highlight.snippet || '[no text]'}
                  </Text>
                </button>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function StackedLoader({ label }: { label: string }) {
  return (
    <Box>
      <Center>
        <Loader size="sm" />
      </Center>
      <Text size="sm" c="dimmed" mt={8} ta="center">
        {label}
      </Text>
    </Box>
  );
}
