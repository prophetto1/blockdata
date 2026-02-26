import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type PdfPreviewProps = {
  title: string;
  url: string;
  hideToolbar?: boolean;
  toolbarPortalTarget?: HTMLElement | null;
};

const ZOOM_MIN = 50;
const ZOOM_MAX = 300;
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 300] as const;
const PDF_BASE_WIDTH_PX = 700;


export function PdfPreview({
  title,
  url,
  hideToolbar = false,
  toolbarPortalTarget = null,
}: PdfPreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageShellRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const activePageRef = useRef(1);
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState('1');
  const [zoomPercent, setZoomPercent] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackToIframe, setFallbackToIframe] = useState(false);

  useEffect(() => {
    pageShellRefs.current.clear();
    activePageRef.current = 1;
    setActivePageNumber(1);
    setPageInput('1');
    setPageCount(null);
    setZoomPercent(100);
    setRotation(0);
    setLoadError(null);
    setFallbackToIframe(false);
  }, [url]);

  useEffect(() => {
    activePageRef.current = activePageNumber;
  }, [activePageNumber]);

  useEffect(() => {
    setPageInput(String(activePageNumber));
  }, [activePageNumber]);

  const canGoPrev = activePageNumber > 1;
  const canGoNext = pageCount !== null && activePageNumber < pageCount;
  const isPdfJsControlsDisabled = fallbackToIframe || pageCount === null || !!loadError;
  const showPageControls = !isPdfJsControlsDisabled && (pageCount ?? 0) > 1;
  const pageScale = Math.max(0.1, zoomPercent / 100);
  const pageDigits = Math.max(2, String(pageCount ?? activePageNumber).length);

  const clampPageNumber = (value: number): number => {
    if (!Number.isFinite(value)) return activePageNumber;
    if (pageCount === null) return Math.max(1, value);
    return Math.min(Math.max(1, value), pageCount);
  };

  const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
  const stepZoom = (direction: 'in' | 'out') => {
    const current = zoomPercent;
    const sorted = [...ZOOM_PRESETS].sort((a, b) => a - b);
    const next = direction === 'in'
      ? sorted.find((value) => value > current)
      : [...sorted].reverse().find((value) => value < current);
    const fallback = direction === 'in' ? current + 25 : current - 25;
    setZoomPercent(clampZoom(next ?? fallback));
  };

  const setPageShellRef = (pageNumber: number, node: HTMLDivElement | null) => {
    if (node) {
      pageShellRefs.current.set(pageNumber, node);
      return;
    }
    pageShellRefs.current.delete(pageNumber);
  };

  const scrollToPage = (rawPageNumber: number, behavior: ScrollBehavior = 'smooth') => {
    const nextPage = clampPageNumber(rawPageNumber);
    setActivePageNumber(nextPage);

    const viewportNode = viewportRef.current;
    const pageNode = pageShellRefs.current.get(nextPage);
    if (!viewportNode || !pageNode) return;

    const viewportRect = viewportNode.getBoundingClientRect();
    const pageRect = pageNode.getBoundingClientRect();
    const top = viewportNode.scrollTop + (pageRect.top - viewportRect.top);
    viewportNode.scrollTo({ top, behavior });
  };

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput.trim(), 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(activePageNumber));
      return;
    }
    scrollToPage(parsed);
  };

  useEffect(() => {
    if (fallbackToIframe || loadError || pageCount === null) return undefined;
    const viewportNode = viewportRef.current;
    if (!viewportNode) return undefined;

    let frameId = 0;
    const updateActivePage = () => {
      frameId = 0;
      const pageEntries = [...pageShellRefs.current.entries()].sort((a, b) => a[0] - b[0]);
      if (pageEntries.length === 0) return;

      const viewportRect = viewportNode.getBoundingClientRect();
      const viewportCenter = viewportRect.top + (viewportRect.height / 2);

      let bestPage = activePageRef.current;
      let bestDistance = Number.POSITIVE_INFINITY;

      pageEntries.forEach(([pageNumber, pageNode]) => {
        const rect = pageNode.getBoundingClientRect();
        const containsCenter = rect.top <= viewportCenter && rect.bottom >= viewportCenter;
        const distance = containsCenter
          ? 0
          : Math.min(Math.abs(viewportCenter - rect.top), Math.abs(viewportCenter - rect.bottom));

        if (distance < bestDistance || (distance === bestDistance && pageNumber < bestPage)) {
          bestDistance = distance;
          bestPage = pageNumber;
        }
      });

      if (bestPage === activePageRef.current) return;
      activePageRef.current = bestPage;
      setActivePageNumber(bestPage);
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateActivePage);
    };

    scheduleUpdate();
    viewportNode.addEventListener('scroll', scheduleUpdate, { passive: true });

    return () => {
      viewportNode.removeEventListener('scroll', scheduleUpdate);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [fallbackToIframe, loadError, pageCount, rotation, pageScale]);

  const iconBtnClass = 'inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50';

  const toolbar = (
    <div className="parse-pdf-toolbar flex items-center justify-center flex-nowrap">
      {showPageControls ? (
        <div
          className="parse-pdf-page-controls parse-pdf-toolbar-pill flex items-center flex-nowrap gap-0.5"
          style={{ '--parse-pdf-page-digits': String(pageDigits) } as CSSProperties}
        >
          <button
            type="button"
            className={`${iconBtnClass} h-7 w-7`}
            disabled={!canGoPrev || isPdfJsControlsDisabled}
            aria-label="Previous page"
            title="Previous page"
            onClick={() => scrollToPage(activePageNumber - 1)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M396-480 564-312 516-264 300-480l216-216 48 48-168 168Z"/></svg>
          </button>
          <input
            type="text"
            value={pageInput}
            onChange={(event) => setPageInput(event.currentTarget.value)}
            onBlur={commitPageInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitPageInput();
            }}
            className="parse-pdf-page-input h-6 rounded border border-border bg-background px-1 text-center text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            disabled={isPdfJsControlsDisabled}
          />
          <span className="parse-pdf-page-separator text-xs font-semibold text-muted-foreground" aria-hidden>
            /
          </span>
          <span className="parse-pdf-page-total text-xs font-semibold text-muted-foreground">
            {pageCount ?? '--'}
          </span>
          <button
            type="button"
            className={`${iconBtnClass} h-7 w-7`}
            disabled={!canGoNext || isPdfJsControlsDisabled}
            aria-label="Next page"
            title="Next page"
            onClick={() => scrollToPage(activePageNumber + 1)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="m375-264-48-48 168-168-168-168 48-48 216 216-216 216Z"/></svg>
          </button>
        </div>
      ) : (
        <div className="parse-pdf-toolbar-placeholder" />
      )}

      <div className="parse-pdf-zoom-inline parse-pdf-toolbar-pill flex items-center flex-nowrap gap-0.5">
        <button
          type="button"
          className={`${iconBtnClass} h-7 w-7`}
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => stepZoom('out')}
          disabled={isPdfJsControlsDisabled || zoomPercent <= ZOOM_MIN}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M200-440v-80h560v80H200Z"/></svg>
        </button>
        <span className="parse-pdf-zoom-value text-xs font-semibold text-muted-foreground">
          {zoomPercent}%
        </span>
        <button
          type="button"
          className={`${iconBtnClass} h-7 w-7`}
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => stepZoom('in')}
          disabled={isPdfJsControlsDisabled || zoomPercent >= ZOOM_MAX}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="parse-pdf-viewer">
      {!hideToolbar && (toolbarPortalTarget ? createPortal(toolbar, toolbarPortalTarget) : toolbar)}

      <div
        ref={viewportRef}
        className="parse-pdf-preview-viewport"
      >
        {fallbackToIframe ? (
          <div className="parse-pdf-surface parse-pdf-surface--iframe">
            <iframe title={`${title} PDF preview`} src={url} className="parse-preview-iframe" />
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground text-center">
              {loadError}
            </span>
          </div>
        ) : (
          <div className="parse-pdf-surface">
            <Document
              file={url}
              loading={
                <div className="flex h-full items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
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
              {Array.from({ length: pageCount ?? 1 }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <div
                    key={pageNumber}
                    className="parse-pdf-page-shell"
                    data-page-number={pageNumber}
                    ref={(node) => setPageShellRef(pageNumber, node)}
                  >
                    <div className="parse-pdf-page-wrap">
                      <Page
                        pageNumber={pageNumber}
                        width={PDF_BASE_WIDTH_PX}
                        scale={pageScale}
                        rotate={rotation}
                        loading={
                          <div className="flex h-full items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                          </div>
                        }
                        renderTextLayer
                        renderAnnotationLayer
                      />
                    </div>
                  </div>
                );
              })}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
