import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActionIcon, Box, Center, Group, Loader, Text, TextInput } from '@mantine/core';
import {
  IconArrowsMaximize,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFileText,
  IconRefresh,
  IconRotateClockwise2,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type PdfPreviewProps = {
  title: string;
  url: string;
  toolbarLeft?: ReactNode;
  overlayMode?: 'none' | 'units';
  atomicUnits?: PdfAtomicUnit[];
  unitsLoading?: boolean;
  unitsError?: string | null;
};

export type PdfAtomicUnit = {
  blockUid: string;
  blockIndex: number;
  blockType: string;
  pageNo: number | null;
  parserPath: string | null;
  textPreview: string;
};

const ZOOM_MIN = 50;
const ZOOM_MAX = 300;
const ZOOM_STEP = 10;
const VIEWPORT_MIN_WIDTH = 280;
const VIEWPORT_HORIZONTAL_PADDING = 8;
const WIDTH_JITTER_PX = 3;

export function PdfPreview({
  title,
  url,
  toolbarLeft = null,
  overlayMode = 'none',
  atomicUnits = [],
  unitsLoading = false,
  unitsError = null,
}: PdfPreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const activePageRef = useRef(1);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState('1');
  const [zoomPercent, setZoomPercent] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  const [showUnitOverlay, setShowUnitOverlay] = useState(true);
  const [selectedUnitUid, setSelectedUnitUid] = useState<string | null>(null);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateWidth = () => {
      const measuredWidth = Math.round(node.clientWidth);
      const next = Math.max(measuredWidth - VIEWPORT_HORIZONTAL_PADDING, VIEWPORT_MIN_WIDTH);
      setViewportWidth((current) => (Math.abs(current - next) >= WIDTH_JITTER_PX ? next : current));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const canGoPrev = activePageNumber > 1;
  const canGoNext = pageCount !== null && activePageNumber < pageCount;
  const isPdfJsControlsDisabled = fallbackToIframe || pageCount === null || !!loadError;

  const clampPageNumber = (value: number): number => {
    if (!Number.isFinite(value)) return activePageNumber;
    if (pageCount === null) return Math.max(1, value);
    return Math.min(Math.max(1, value), pageCount);
  };

  const scrollToPage = (targetPage: number, behavior: ScrollBehavior = 'smooth') => {
    const clamped = clampPageNumber(targetPage);
    const targetNode = pageRefs.current[clamped];
    activePageRef.current = clamped;
    setActivePageNumber(clamped);
    setPageInput(String(clamped));
    if (!targetNode) return;
    isProgrammaticScrollRef.current = true;
    targetNode.scrollIntoView({ block: 'start', behavior });
    if (programmaticScrollTimerRef.current !== null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, 260);
  };

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput.trim(), 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(activePageNumber));
      return;
    }
    scrollToPage(parsed);
  };

  const changeZoom = (delta: number) => {
    setZoomPercent((current) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + delta)));
  };

  const toggleFullscreen = async () => {
    const node = viewportRef.current;
    if (!node) return;
    if (!document.fullscreenElement) {
      await node.requestFullscreen?.();
      return;
    }
    await document.exitFullscreen?.();
  };

  useEffect(() => {
    if (!pageCount || fallbackToIframe || loadError) return;
    const root = viewportRef.current;
    if (!root) return;

    const visibilityRatios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;
        for (const entry of entries) {
          const pageNumber = Number.parseInt(
            (entry.target as HTMLDivElement).dataset.pageNumber ?? '',
            10
          );
          if (!Number.isFinite(pageNumber) || pageNumber < 1) continue;
          visibilityRatios.set(pageNumber, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        const currentActivePage = activePageRef.current;
        let bestPage = currentActivePage;
        let bestRatio = -1;
        for (const [pageNumber, ratio] of visibilityRatios.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = pageNumber;
          }
        }
        if (bestPage !== currentActivePage) {
          activePageRef.current = bestPage;
          setActivePageNumber(bestPage);
          setPageInput(String(bestPage));
        }
      },
      {
        root,
        threshold: [0.1, 0.25, 0.5, 0.75, 0.9],
      }
    );

    for (let page = 1; page <= pageCount; page += 1) {
      const pageNode = pageRefs.current[page];
      if (pageNode) observer.observe(pageNode);
    }

    return () => {
      observer.disconnect();
    };
  }, [fallbackToIframe, loadError, pageCount, viewportWidth, zoomPercent, rotation]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current !== null) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }
    };
  }, []);

  const unitsByPage = useMemo(() => {
    const grouped = new Map<number, PdfAtomicUnit[]>();
    for (const unit of atomicUnits) {
      if (!Number.isFinite(unit.pageNo) || unit.pageNo === null || unit.pageNo < 1) continue;
      const pageNo = Math.floor(unit.pageNo);
      const existing = grouped.get(pageNo);
      if (existing) {
        existing.push(unit);
      } else {
        grouped.set(pageNo, [unit]);
      }
    }
    return grouped;
  }, [atomicUnits]);

  const activePageUnits = useMemo(
    () => unitsByPage.get(activePageNumber) ?? [],
    [activePageNumber, unitsByPage],
  );

  const selectedUnit = useMemo(
    () => atomicUnits.find((unit) => unit.blockUid === selectedUnitUid) ?? null,
    [atomicUnits, selectedUnitUid],
  );

  const totalUnits = atomicUnits.length;
  const showUnitsUi = overlayMode === 'units';
  const renderedPageCount = pageCount ?? 0;
  const renderedPageNumbers = Array.from({ length: renderedPageCount }, (_, index) => index + 1);

  return (
    <Box className="parse-pdf-viewer">
      <Group justify={toolbarLeft ? 'space-between' : 'flex-end'} wrap="nowrap" className="parse-pdf-toolbar">
        {toolbarLeft && (
          <Box className="parse-pdf-toolbar-left">
            {toolbarLeft}
          </Box>
        )}
        <Group gap={8} wrap="nowrap" className="parse-pdf-toolbar-controls">
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              size="sm"
              variant="subtle"
              disabled={!canGoPrev || isPdfJsControlsDisabled}
              aria-label="Previous page"
              onClick={() => scrollToPage(activePageNumber - 1)}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <TextInput
              size="xs"
              value={pageInput}
              onChange={(event) => setPageInput(event.currentTarget.value)}
              onBlur={commitPageInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitPageInput();
              }}
              className="parse-pdf-page-input"
              disabled={isPdfJsControlsDisabled}
            />
            <Text size="xs" c="dimmed">
              of {pageCount ?? '--'}
            </Text>
            <ActionIcon
              size="sm"
              variant="subtle"
              disabled={!canGoNext || isPdfJsControlsDisabled}
              aria-label="Next page"
              onClick={() => scrollToPage(activePageNumber + 1)}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>

          <Group gap={4} wrap="nowrap">
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Zoom out"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={isPdfJsControlsDisabled}
            >
              <IconZoomOut size={18} />
            </ActionIcon>
            <Text size="xs" c="dimmed" className="parse-pdf-zoom-label">
              {zoomPercent}%
            </Text>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Zoom in"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={isPdfJsControlsDisabled}
            >
              <IconZoomIn size={18} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Rotate pages"
              onClick={() => setRotation((current) => (current + 90) % 360)}
              disabled={isPdfJsControlsDisabled}
            >
              <IconRotateClockwise2 size={18} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Reset zoom"
              onClick={() => setZoomPercent(100)}
              disabled={isPdfJsControlsDisabled}
            >
              <IconRefresh size={18} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Fullscreen"
              onClick={() => {
                void toggleFullscreen();
              }}
            >
              <IconArrowsMaximize size={18} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Download PDF"
              component="a"
              href={url}
              target="_blank"
              rel="noreferrer"
              download
            >
              <IconDownload size={18} />
            </ActionIcon>
            {showUnitsUi && (
              <>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  aria-label={showUnitOverlay ? 'Hide unit overlay' : 'Show unit overlay'}
                  onClick={() => setShowUnitOverlay((current) => !current)}
                  disabled={totalUnits === 0}
                >
                  <IconFileText size={18} />
                </ActionIcon>
                <Text size="xs" c="dimmed" className="parse-pdf-units-label">
                  Units {totalUnits}
                  {activePageUnits.length > 0 ? ` | Page ${activePageUnits.length}` : ''}
                </Text>
              </>
            )}
          </Group>
        </Group>
      </Group>

      <Box
        ref={viewportRef}
        className="parse-pdf-preview-viewport"
      >
        {fallbackToIframe ? (
          <Box className="parse-pdf-surface parse-pdf-surface--iframe">
            <iframe title={`${title} PDF preview`} src={url} className="parse-preview-iframe" />
          </Box>
        ) : loadError ? (
          <Center h="100%">
            <Text size="sm" c="dimmed" ta="center">
              {loadError}
            </Text>
          </Center>
        ) : (
          <Box className="parse-pdf-surface">
            <Document
              file={url}
              loading={
                <Center h="100%">
                  <Loader size="sm" />
                </Center>
              }
              onLoadSuccess={(pdf) => {
                setPageCount(pdf.numPages);
                setActivePageNumber((current) => {
                  const clamped = Math.min(Math.max(current, 1), pdf.numPages);
                  activePageRef.current = clamped;
                  setPageInput(String(clamped));
                  return clamped;
                });
                setLoadError(null);
              }}
              onLoadError={() => {
                setLoadError('PDF.js preview failed. Falling back to browser preview.');
                setPageCount(null);
                setFallbackToIframe(true);
              }}
            >
              {renderedPageNumbers.map((pageNumber) => (
                <Box
                  key={pageNumber}
                  className="parse-pdf-page-shell"
                  data-page-number={pageNumber}
                  ref={(node) => {
                    pageRefs.current[pageNumber] = node;
                  }}
                >
                  <Box className="parse-pdf-page-wrap">
                    <Page
                      pageNumber={pageNumber}
                      width={viewportWidth > 0 ? viewportWidth : undefined}
                      scale={zoomPercent / 100}
                      rotate={rotation}
                      loading={
                        <Center h="100%">
                          <Loader size="sm" />
                        </Center>
                      }
                      renderTextLayer
                      renderAnnotationLayer
                    />
                    {showUnitsUi && showUnitOverlay && (unitsByPage.get(pageNumber)?.length ?? 0) > 0 && (
                      <Box className="parse-pdf-unit-overlay">
                        {(unitsByPage.get(pageNumber) ?? []).map((unit, index, list) => {
                          const topPercent = ((index + 1) / (list.length + 1)) * 100;
                          const isSelected = selectedUnitUid === unit.blockUid;
                          return (
                            <button
                              key={unit.blockUid}
                              type="button"
                              className="parse-pdf-unit-marker"
                              data-active={isSelected ? 'true' : 'false'}
                              style={{ top: `${topPercent}%` }}
                              onClick={() => {
                                setSelectedUnitUid(unit.blockUid);
                                scrollToPage(pageNumber);
                              }}
                              title={`${unit.blockType} | block ${unit.blockIndex}`}
                            />
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Document>
          </Box>
        )}
      </Box>
      {showUnitsUi && (
        <Box className="parse-pdf-unit-panel">
          {unitsLoading ? (
            <Text size="xs" c="dimmed">Loading atomic units...</Text>
          ) : unitsError ? (
            <Text size="xs" c="red">{unitsError}</Text>
          ) : selectedUnit ? (
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Box className="parse-pdf-unit-panel-copy">
                <Text size="xs" fw={700}>
                  {selectedUnit.blockType} | block {selectedUnit.blockIndex}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {selectedUnit.textPreview}
                </Text>
              </Box>
              <Text size="xs" c="dimmed">
                {selectedUnit.pageNo ? `p.${selectedUnit.pageNo}` : 'no page'}
              </Text>
            </Group>
          ) : totalUnits > 0 ? (
            <Text size="xs" c="dimmed">Results overlay ready. Click markers to inspect units.</Text>
          ) : (
            <Text size="xs" c="dimmed">No units available for this parsed document yet.</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
