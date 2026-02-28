import { useEffect, useRef, useState } from 'react';
import { IconDownload, IconFileText } from '@tabler/icons-react';
import { renderAsync } from 'docx-preview';
import { useIsDark } from '@/lib/useIsDark';

type DocxPreviewProps = {
  title: string;
  url: string;
  hideToolbar?: boolean;
};

export function DocxPreview({ title, url, hideToolbar = false }: DocxPreviewProps) {
  const isDark = useIsDark();
  const renderHostRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderHost = renderHostRef.current;
    if (!renderHost) return;

    renderHost.innerHTML = '';
    setLoading(true);
    setError(null);

    const renderDocx = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (cancelled) return;

        await renderAsync(bytes, renderHost, renderHost, {
          className: 'docx',
          inWrapper: false,
          breakPages: false,
          ignoreHeight: true,
          ignoreWidth: true,
          ignoreLastRenderedPageBreak: false,
        });

        if (cancelled) return;
        setLoading(false);
      } catch {
        if (cancelled) return;
        renderHost.innerHTML = '';
        setError('DOCX preview unavailable for this file.');
        setLoading(false);
      }
    };

    void renderDocx();
    return () => {
      cancelled = true;
      renderHost.innerHTML = '';
    };
  }, [url]);

  return (
    <div className={`parse-docx-preview${isDark ? ' is-dark' : ' is-light'}`}>
      {!hideToolbar && (
        <div className="parse-pdf-toolbar flex items-center justify-between flex-nowrap">
          <div className="parse-text-preview-file flex items-center gap-1.5 flex-nowrap">
            <IconFileText size={14} />
            <span className="parse-text-preview-filename text-xs" title={title}>
              {title}
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            download
            aria-label="Download docx"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <IconDownload size={14} />
          </a>
        </div>
      )}

      <div className="parse-docx-preview-viewport">
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
          className={`parse-docx-render-host${loading || !!error ? ' is-hidden' : ''}`}
        />
      </div>
    </div>
  );
}
