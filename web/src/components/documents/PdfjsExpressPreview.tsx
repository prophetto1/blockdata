import { useEffect, useRef, useState } from 'react';

const PDFJS_EXPRESS_ASSET_PATH = '/vendor/pdfjs-express';

export function PdfjsExpressPreview({ url }: { url: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let cancelled = false;
    setError(null);
    setLoading(true);
    host.replaceChildren();

    void (async () => {
      try {
        const { default: WebViewer } = await import('@pdftron/pdfjs-express');
        if (cancelled || !hostRef.current) return;

        const instance = await WebViewer(
          {
            path: PDFJS_EXPRESS_ASSET_PATH,
            initialDoc: url,
            enableReadOnlyMode: true,
            disabledElements: ['ribbons'],
            ...(import.meta.env.VITE_PDFJS_EXPRESS_LICENSE_KEY
              ? { licenseKey: import.meta.env.VITE_PDFJS_EXPRESS_LICENSE_KEY }
              : {}),
          },
          hostRef.current,
        );

        if (cancelled) return;

        instance.UI?.setTheme?.('light');
        instance.UI?.setToolbarGroup?.('toolbarGroup-View');
        const fitWidthMode = instance.UI?.FitMode?.FitWidth;
        if (fitWidthMode) {
          instance.UI?.setFitMode?.(fitWidthMode);
        }

        setLoading(false);
      } catch (viewerError) {
        if (cancelled) return;
        const message = viewerError instanceof Error ? viewerError.message : 'Failed to load PDF.js Express viewer.';
        setError(message);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-0">
      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-card/80">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : null}
      <div ref={hostRef} className="h-full w-full" data-testid="pdfjs-express-preview" />
    </div>
  );
}
