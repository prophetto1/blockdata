import { useEffect, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconDownload } from '@tabler/icons-react';
import { PPTXViewer } from 'pptx-viewer';

type PptxPreviewProps = {
  title: string;
  url: string;
  hideHeaderMeta?: boolean;
};

const iconBtnClass = 'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50';

export function PptxPreview({ title, url, hideHeaderMeta = false }: PptxPreviewProps) {
  const renderHostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<PPTXViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideInput, setSlideInput] = useState('1');

  const syncSlideStateFromViewer = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const nextCount = Math.max(viewer.getSlideCount(), 0);
    const nextCurrentIndex = Math.max(viewer.getCurrentSlide(), 0);
    setSlideCount(nextCount);
    setCurrentSlideIndex(nextCurrentIndex);
    setSlideInput(String(nextCurrentIndex + 1));
  };

  useEffect(() => {
    let cancelled = false;

    const host = renderHostRef.current;
    if (!host) return;

    host.innerHTML = '';
    viewerRef.current?.destroy();
    viewerRef.current = null;

    const mountViewer = async () => {
      try {
        const viewer = new PPTXViewer(host, {
          showControls: false,
          keyboardNavigation: true,
        });
        viewer.on('slidechange', (index) => {
          if (cancelled) return;
          setCurrentSlideIndex(index);
          setSlideInput(String(index + 1));
        });
        viewerRef.current = viewer;
        await viewer.load(url);
        if (cancelled) return;
        syncSlideStateFromViewer();
        setLoading(false);
      } catch {
        if (cancelled) return;
        viewerRef.current?.destroy();
        viewerRef.current = null;
        host.innerHTML = '';
        setSlideCount(0);
        setCurrentSlideIndex(0);
        setSlideInput('1');
        setError('PPTX preview unavailable for this file.');
        setLoading(false);
      }
    };

    void mountViewer();
    return () => {
      cancelled = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
      host.innerHTML = '';
    };
  }, [url]);

  const controlsDisabled = loading || !!error || slideCount <= 0;
  const canGoPrev = !controlsDisabled && currentSlideIndex > 0;
  const canGoNext = !controlsDisabled && currentSlideIndex < slideCount - 1;

  const commitSlideInput = () => {
    const viewer = viewerRef.current;
    if (!viewer || slideCount <= 0) {
      setSlideInput(String(currentSlideIndex + 1));
      return;
    }
    const parsed = Number.parseInt(slideInput.trim(), 10);
    if (Number.isNaN(parsed)) {
      setSlideInput(String(currentSlideIndex + 1));
      return;
    }
    const targetOneBased = Math.min(Math.max(parsed, 1), slideCount);
    const moved = viewer.goToSlide(targetOneBased - 1);
    if (!moved) {
      setSlideInput(String(currentSlideIndex + 1));
      return;
    }
    setCurrentSlideIndex(targetOneBased - 1);
    setSlideInput(String(targetOneBased));
  };

  const goPrev = () => {
    const viewer = viewerRef.current;
    if (!viewer || !canGoPrev) return;
    viewer.previous();
    syncSlideStateFromViewer();
  };

  const goNext = () => {
    const viewer = viewerRef.current;
    if (!viewer || !canGoNext) return;
    viewer.next();
    syncSlideStateFromViewer();
  };

  return (
    <div className="parse-pptx-preview">
      <div
        className={[
          'parse-pdf-toolbar parse-pptx-toolbar flex items-center flex-nowrap',
          hideHeaderMeta ? 'justify-start' : 'justify-between',
        ].join(' ')}
      >
        <div className="flex items-center gap-1 flex-nowrap">
          <button
            type="button"
            className={iconBtnClass}
            aria-label="Previous slide"
            disabled={!canGoPrev}
            onClick={goPrev}
          >
            <IconChevronLeft size={14} />
          </button>
          <input
            type="text"
            value={slideInput}
            onChange={(event) => setSlideInput(event.currentTarget.value)}
            onBlur={commitSlideInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitSlideInput();
            }}
            disabled={controlsDisabled}
            className="parse-pptx-page-input h-6 w-10 rounded border border-border bg-background px-1 text-center text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">
            of {slideCount > 0 ? slideCount : '--'}
          </span>
          <button
            type="button"
            className={iconBtnClass}
            aria-label="Next slide"
            disabled={!canGoNext}
            onClick={goNext}
          >
            <IconChevronRight size={14} />
          </button>
        </div>

        {!hideHeaderMeta && (
          <div className="flex items-center gap-1.5 flex-nowrap">
            <span className="parse-pptx-title text-xs text-muted-foreground" title={title}>
              {title}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download
              aria-label="Download pptx"
              className={iconBtnClass}
            >
              <IconDownload size={14} />
            </a>
          </div>
        )}
      </div>

      <div className="parse-pptx-preview-viewport">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
        {!loading && error && (
          <div className="flex h-full items-center justify-center p-2">
            <span className="text-center text-sm text-muted-foreground">{error}</span>
          </div>
        )}
        <div
          ref={renderHostRef}
          className={`parse-pptx-render-host${loading || !!error ? ' is-hidden' : ''}`}
        />
      </div>
    </div>
  );
}
