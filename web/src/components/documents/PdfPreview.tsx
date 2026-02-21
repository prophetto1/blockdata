import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Center, Group, Loader, Text, TextInput } from '@mantine/core';
import {
  IconArrowsMaximize,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
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
};

const ZOOM_MIN = 50;
const ZOOM_MAX = 300;
const ZOOM_STEP = 10;
const VIEWPORT_MIN_WIDTH = 280;
const VIEWPORT_HORIZONTAL_PADDING = 8;
const WIDTH_JITTER_PX = 3;

export function PdfPreview({ title, url }: PdfPreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState('1');
  const [zoomPercent, setZoomPercent] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackToIframe, setFallbackToIframe] = useState(false);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observedNode = node.parentElement ?? node;

    let frameId = 0;
    const updateWidth = () => {
      const measuredWidth = Math.round(observedNode.getBoundingClientRect().width);
      const next = Math.max(measuredWidth - VIEWPORT_HORIZONTAL_PADDING, VIEWPORT_MIN_WIDTH);
      setViewportWidth((current) => (Math.abs(current - next) >= WIDTH_JITTER_PX ? next : current));
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateWidth();
      });
    };

    scheduleUpdate();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(observedNode);

    return () => {
      observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    setActivePageNumber(1);
    setPageInput('1');
    setPageCount(null);
    setZoomPercent(100);
    setRotation(0);
    setLoadError(null);
    setFallbackToIframe(false);
  }, [url]);

  useEffect(() => {
    setPageInput(String(activePageNumber));
  }, [activePageNumber]);

  const canGoPrev = activePageNumber > 1;
  const canGoNext = pageCount !== null && activePageNumber < pageCount;
  const isPdfJsControlsDisabled = fallbackToIframe || pageCount === null || !!loadError;

  const clampPageNumber = (value: number): number => {
    if (!Number.isFinite(value)) return activePageNumber;
    if (pageCount === null) return Math.max(1, value);
    return Math.min(Math.max(1, value), pageCount);
  };

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput.trim(), 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(activePageNumber));
      return;
    }
    setActivePageNumber(clampPageNumber(parsed));
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

  return (
    <Box className="parse-pdf-viewer">
      <Group justify="space-between" wrap="nowrap" className="parse-pdf-toolbar">
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            size="sm"
            variant="subtle"
            disabled={!canGoPrev || isPdfJsControlsDisabled}
            aria-label="Previous page"
            onClick={() => setActivePageNumber(clampPageNumber(activePageNumber - 1))}
          >
            <IconChevronLeft size={14} />
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
            onClick={() => setActivePageNumber(clampPageNumber(activePageNumber + 1))}
          >
            <IconChevronRight size={14} />
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
            <IconZoomOut size={14} />
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
            <IconZoomIn size={14} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label="Rotate pages"
            onClick={() => setRotation((current) => (current + 90) % 360)}
            disabled={isPdfJsControlsDisabled}
          >
            <IconRotateClockwise2 size={14} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label="Reset zoom"
            onClick={() => setZoomPercent(100)}
            disabled={isPdfJsControlsDisabled}
          >
            <IconRefresh size={14} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label="Fullscreen"
            onClick={() => {
              void toggleFullscreen();
            }}
          >
            <IconArrowsMaximize size={14} />
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
            <IconDownload size={14} />
          </ActionIcon>
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
                setActivePageNumber((current) => Math.min(Math.max(current, 1), pdf.numPages));
                setLoadError(null);
              }}
              onLoadError={() => {
                setLoadError('PDF.js preview failed. Falling back to browser preview.');
                setPageCount(null);
                setFallbackToIframe(true);
              }}
            >
              <Page
                pageNumber={activePageNumber}
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
            </Document>
          </Box>
        )}
      </Box>
    </Box>
  );
}
