import { useEffect, useState, type ReactNode } from 'react';
import { IconDownload } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PdfResultsHighlighter } from '@/components/documents/PdfResultsHighlighter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PptxPreview } from '@/components/documents/PptxPreview';
import {
  dedupeLocators,
  getDocumentFormat,
  isDocxDocument,
  isImageDocument,
  isMarkdownDocument,
  isPdfDocument,
  isPptxDocument,
  isTextDocument,
  type PreviewKind,
  type ProjectDocumentRow,
  resolveSignedUrlForLocators,
  toDoclingJsonLocator,
} from '@/lib/projectDetailHelpers';
import { normalizePath } from '@/lib/filesTree';

export function PreviewTabPanel({ doc }: { doc: ProjectDocumentRow | null }) {
  const [previewKind, setPreviewKind] = useState<PreviewKind>('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsedPreviewUrl, setParsedPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfPreviewMode, setPdfPreviewMode] = useState<'file' | 'parsed'>('file');
  const [pdfToolbarHost, setPdfToolbarHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!doc) {
        setPreviewKind('none');
        setPreviewUrl(null);
        setParsedPreviewUrl(null);
        setPreviewText(null);
        setPreviewError(null);
        setPreviewLoading(false);
        setPdfPreviewMode('file');
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);
      setParsedPreviewUrl(null);
      setPreviewText(null);
      setPdfPreviewMode('file');

      const { url: signedUrl, error: signedUrlError } = await resolveSignedUrlForLocators([
        doc.source_locator,
        doc.conv_locator,
      ]);

      if (cancelled) return;

      if (!signedUrl) {
        setPreviewKind('none');
        setPreviewError(
          signedUrlError
            ? `Preview unavailable: ${signedUrlError}`
            : 'Preview unavailable for this document.',
        );
        setPreviewLoading(false);
        return;
      }

      if (isPdfDocument(doc)) {
        setPreviewKind('pdf');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        if (!doc.conv_uid) return;

        const doclingLocators = dedupeLocators([
          toDoclingJsonLocator(doc.conv_locator),
          toDoclingJsonLocator(doc.source_locator),
        ]);
        if (doclingLocators.length === 0) return;

        const { url: signedDoclingUrl } = await resolveSignedUrlForLocators(doclingLocators);
        if (cancelled) return;
        setParsedPreviewUrl(signedDoclingUrl);
        return;
      }
      if (isImageDocument(doc)) {
        setPreviewKind('image');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }
      if (isTextDocument(doc)) {
        try {
          const response = await fetch(signedUrl);
          const text = await response.text();
          if (cancelled) return;
          const truncated = text.length > 200000 ? `${text.slice(0, 200000)}\n\n[Preview truncated]` : text;
          setPreviewKind(isMarkdownDocument(doc) ? 'markdown' : 'text');
          setPreviewText(truncated.length > 0 ? truncated : '[Empty file]');
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        } catch {
          if (cancelled) return;
          setPreviewKind('file');
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        }
      }
      if (isDocxDocument(doc)) {
        setPreviewKind('docx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }
      if (isPptxDocument(doc)) {
        setPreviewKind('pptx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }

      setPreviewKind('file');
      setPreviewUrl(signedUrl);
      setPreviewLoading(false);
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [doc]);

  const selectedDocPath = normalizePath(doc?.doc_title ?? '');
  const selectedDocPathParts = selectedDocPath.split('/').filter((part) => part.length > 0);
  const selectedDocTitle = selectedDocPathParts[selectedDocPathParts.length - 1]
    ?? doc?.doc_title
    ?? 'Asset';
  const selectedDocFormat = doc ? getDocumentFormat(doc) : 'FILE';
  const canShowParsedPdfView = Boolean(
    doc
    && previewKind === 'pdf'
    && previewUrl
    && doc.conv_uid
    && parsedPreviewUrl,
  );
  const pdfViewToggleLabel = pdfPreviewMode === 'parsed' ? 'File view' : 'Parsed view';

  const renderPreviewFrame = (
    content: ReactNode,
    options?: { scroll?: boolean; padded?: boolean },
  ) => (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      {options?.scroll === false ? (
        <div
          className={[
            'min-h-0 flex-1 overflow-hidden bg-card',
            options?.padded === false ? '' : 'p-4',
          ].join(' ')}
        >
          {content}
        </div>
      ) : (
        <ScrollArea
          className="min-h-0 h-full flex-1 bg-card"
          viewportClass={[
            'h-full overflow-y-auto overflow-x-hidden',
            options?.padded === false ? '' : 'p-4',
          ].join(' ').trim()}
        >
          {content}
        </ScrollArea>
      )}
    </div>
  );

  const renderCenteredMessage = (message: ReactNode, isError = false) => (
    <div
      className={[
        'flex h-full w-full items-center justify-center text-sm',
        isError ? 'text-red-500' : 'text-muted-foreground',
      ].join(' ')}
    >
      {message}
    </div>
  );

  const renderUnifiedPreviewHeader = (options?: {
    downloadUrl?: string | null;
    centerContent?: ReactNode;
    actions?: ReactNode;
  }) => (
    <div className="grid min-h-10 grid-cols-[auto_1fr_auto] items-center border-b border-border bg-card px-2">
      <span className="inline-flex min-w-[34px] justify-center rounded border border-border bg-muted/60 px-1 py-0.5 text-[11px] font-semibold text-muted-foreground">
        {selectedDocFormat}
      </span>
      {options?.centerContent ?? (
        <span
          className="min-w-0 px-2 text-center text-[13px] font-medium text-foreground truncate"
          title={selectedDocTitle}
        >
          {selectedDocTitle}
        </span>
      )}
      <div className="ml-auto flex min-w-[32px] items-center justify-end gap-2">
        {options?.actions}
        {options?.downloadUrl ? (
          <a
            href={options.downloadUrl}
            target="_blank"
            rel="noreferrer"
            download
            aria-label="Download file"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <IconDownload size={16} />
          </a>
        ) : null}
      </div>
    </div>
  );

  const renderPreviewWithUnifiedHeader = (
    content: ReactNode,
    options?: {
      downloadUrl?: string | null;
      contentClassName?: string;
      useScrollArea?: boolean;
      headerCenterContent?: ReactNode;
      headerActions?: ReactNode;
    },
  ) => renderPreviewFrame(
    <div className="flex h-full min-h-0 flex-col">
      {renderUnifiedPreviewHeader({
        downloadUrl: options?.downloadUrl,
        centerContent: options?.headerCenterContent,
        actions: options?.headerActions,
      })}
      {options?.useScrollArea === false ? (
        <div className={['min-h-0 flex-1 bg-card', options?.contentClassName ?? ''].join(' ').trim()}>
          {content}
        </div>
      ) : (
        <ScrollArea
          className="min-h-0 flex-1 bg-card"
          viewportClass={[
            'h-full overflow-y-auto overflow-x-hidden',
            options?.contentClassName ?? '',
          ].join(' ').trim()}
        >
          {content}
        </ScrollArea>
      )}
    </div>,
    { scroll: false, padded: false },
  );

  const renderStandardContentPreview = (
    content: ReactNode,
    options?: { contentClassName?: string; downloadUrl?: string | null },
  ) => renderPreviewWithUnifiedHeader(
    <div className={['parse-docx-preview-viewport', options?.contentClassName ?? ''].join(' ').trim()}>
      {content}
    </div>,
    { downloadUrl: options?.downloadUrl },
  );

  if (!doc) {
    return renderPreviewFrame(renderCenteredMessage('Select an asset to preview.'));
  }

  if (previewLoading) {
    return renderPreviewWithUnifiedHeader(renderCenteredMessage('Loading preview...'));
  }

  if (previewError) {
    return renderPreviewWithUnifiedHeader(renderCenteredMessage(previewError, true));
  }

  if (previewKind === 'pdf' && previewUrl) {
    const headerActions = canShowParsedPdfView ? (
      <button
        type="button"
        aria-pressed={pdfPreviewMode === 'parsed'}
        onClick={() => setPdfPreviewMode((current) => (current === 'parsed' ? 'file' : 'parsed'))}
        className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {pdfViewToggleLabel}
      </button>
    ) : null;

    if (pdfPreviewMode === 'parsed' && parsedPreviewUrl && doc?.conv_uid) {
      return renderPreviewWithUnifiedHeader(
        <PdfResultsHighlighter
          key={`${doc.source_uid}:${doc.conv_uid}:${parsedPreviewUrl}`}
          title={doc.doc_title}
          pdfUrl={previewUrl}
          doclingJsonUrl={parsedPreviewUrl}
          convUid={doc.conv_uid}
        />,
        {
          downloadUrl: previewUrl,
          contentClassName: 'overflow-hidden',
          useScrollArea: false,
          headerActions,
        },
      );
    }

    return renderPreviewWithUnifiedHeader(
      <PdfPreview
        key={`${doc.source_uid}:${previewUrl}`}
        url={previewUrl}
        hideToolbar={!pdfToolbarHost}
        toolbarPortalTarget={pdfToolbarHost}
      />,
      {
        downloadUrl: previewUrl,
        contentClassName: 'overflow-hidden',
        useScrollArea: false,
        headerActions,
        headerCenterContent: <div className="parse-preview-toolbar-host flex min-w-0 items-center" ref={setPdfToolbarHost} />,
      },
    );
  }

  if (previewKind === 'image' && previewUrl) {
    return renderStandardContentPreview(
      <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
        <img src={previewUrl} alt={doc.doc_title} className="max-h-full max-w-full" />
      </div>,
      { downloadUrl: previewUrl },
    );
  }

  if (previewKind === 'text') {
    return renderStandardContentPreview(
      <pre className="parse-preview-text">{previewText ?? ''}</pre>,
      { downloadUrl: previewUrl },
    );
  }

  if (previewKind === 'markdown') {
    return renderStandardContentPreview(
      <div className="parse-markdown-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {previewText ?? ''}
        </ReactMarkdown>
      </div>,
      { downloadUrl: previewUrl },
    );
  }

  if (previewKind === 'docx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      <DocxPreview
        key={`${doc.source_uid}:${previewUrl}`}
        title={doc.doc_title}
        url={previewUrl}
        hideToolbar
      />,
      { downloadUrl: previewUrl },
    );
  }

  if (previewKind === 'pptx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      <PptxPreview
        key={`${doc.source_uid}:${previewUrl}`}
        title={doc.doc_title}
        url={previewUrl}
        hideHeaderMeta
      />,
      { downloadUrl: previewUrl },
    );
  }

  if (previewUrl) {
    return renderStandardContentPreview(
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Open file
        </a>
      </div>,
      { downloadUrl: previewUrl },
    );
  }

  return renderPreviewWithUnifiedHeader(renderCenteredMessage('Preview unavailable.'));
}
