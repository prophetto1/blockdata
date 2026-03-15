import { useEffect, useState, type ReactNode } from 'react';
import { IconEdit, IconEye, IconChevronRight } from '@tabler/icons-react';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { PdfResultsHighlighter } from '@/components/documents/PdfResultsHighlighter';
import { PdfjsExpressPreview } from '@/components/documents/PdfjsExpressPreview';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { OnlyOfficeEditorPanel } from '@/components/documents/OnlyOfficeEditorPanel';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PptxPreview } from '@/components/documents/PptxPreview';
import {
  DocumentPreviewFrame,
  DocumentPreviewMessage,
  DocumentPreviewShell,
  DocumentPreviewStandardContent,
} from '@/components/documents/DocumentPreviewShell';
import {
  dedupeLocators,
  isDocxDocument,
  isImageDocument,
  isJsonDocument,
  isMarkdownDocument,
  isPdfDocument,
  isPptxDocument,
  isTextDocument,
  isXlsxDocument,
  type PreviewKind,
  type ProjectDocumentRow,
  resolveSignedUrlForLocators,
  toDoclingJsonLocator,
} from '@/lib/projectDetailHelpers';

type PreviewTabPanelProps = {
  doc: ProjectDocumentRow | null;
  allowParsedPdfView?: boolean;
  showHeaderDownload?: boolean;
  pdfViewer?: 'react-pdf' | 'pdfjs-express';
};

export function PreviewTabPanel({
  doc,
  allowParsedPdfView = true,
  showHeaderDownload = true,
  pdfViewer = 'react-pdf',
}: PreviewTabPanelProps) {
  const [previewKind, setPreviewKind] = useState<PreviewKind>('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsedPreviewUrl, setParsedPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfPreviewMode, setPdfPreviewMode] = useState<'file' | 'parsed'>('file');
  const [pdfToolbarHost, setPdfToolbarHost] = useState<HTMLDivElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);

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
        setEditMode(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);
      setParsedPreviewUrl(null);
      setPreviewText(null);
      setPdfPreviewMode('file');
      setEditMode(false);

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
        if (!allowParsedPdfView || !doc.conv_uid) return;

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
      if (isJsonDocument(doc)) {
        try {
          const response = await fetch(signedUrl);
          const text = await response.text();
          if (cancelled) return;
          setPreviewKind('json');
          setPreviewText(text);
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
      if (isXlsxDocument(doc)) {
        setPreviewKind('xlsx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowParsedPdfView, doc?.source_uid]);

  const canShowParsedPdfView = Boolean(
    doc
    && previewKind === 'pdf'
    && previewUrl
    && doc.conv_uid
    && parsedPreviewUrl,
  );
  const pdfViewToggleLabel = pdfPreviewMode === 'parsed' ? 'File view' : 'Parsed view';

  const renderPreviewWithUnifiedHeader = (
    content: ReactNode,
    options?: {
      downloadUrl?: string | null;
      contentClassName?: string;
      useScrollArea?: boolean;
      headerCenterContent?: ReactNode;
      headerActions?: ReactNode;
    },
  ) => (
    <DocumentPreviewShell
      doc={doc}
      downloadUrl={options?.downloadUrl}
      contentClassName={options?.contentClassName}
      useScrollArea={options?.useScrollArea !== false}
      headerCenterContent={options?.headerCenterContent}
      headerActions={options?.headerActions}
    >
      {content}
    </DocumentPreviewShell>
  );

  const renderStandardContentPreview = (
    content: ReactNode,
    options?: { contentClassName?: string; downloadUrl?: string | null },
  ) => (
    <DocumentPreviewStandardContent
      doc={doc}
      contentClassName={options?.contentClassName}
      downloadUrl={options?.downloadUrl}
    >
      {content}
    </DocumentPreviewStandardContent>
  );

  const renderEditToggle = () => (
    <button
      type="button"
      aria-pressed={editMode}
      onClick={() => {
        setEditMode((prev) => {
          if (prev) setPreviewRevision((r) => r + 1);
          return !prev;
        });
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {editMode ? <><IconEye size={14} /> Preview</> : <><IconEdit size={14} /> Edit</>}
    </button>
  );

  if (!doc) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select an asset to preview." />
      </DocumentPreviewFrame>
    );
  }

  if (previewLoading) {
    return renderPreviewWithUnifiedHeader(<DocumentPreviewMessage message="Loading preview..." />);
  }

  if (previewError) {
    return renderPreviewWithUnifiedHeader(<DocumentPreviewMessage message={previewError} isError />);
  }

  if (previewKind === 'pdf' && previewUrl) {
    const headerActions = allowParsedPdfView && canShowParsedPdfView ? (
      <button
        type="button"
        aria-pressed={pdfPreviewMode === 'parsed'}
        onClick={() => setPdfPreviewMode((current) => (current === 'parsed' ? 'file' : 'parsed'))}
        className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {pdfViewToggleLabel}
      </button>
    ) : null;

    if (pdfViewer === 'pdfjs-express') {
      return renderPreviewWithUnifiedHeader(
        <PdfjsExpressPreview url={previewUrl} />,
        {
          downloadUrl: showHeaderDownload ? previewUrl : null,
          contentClassName: 'overflow-hidden',
          useScrollArea: false,
        },
      );
    }

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
          downloadUrl: showHeaderDownload ? previewUrl : null,
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
        downloadUrl: showHeaderDownload ? previewUrl : null,
        contentClassName: 'overflow-hidden',
        useScrollArea: false,
        headerActions,
        headerCenterContent: <div className="parse-preview-toolbar-host flex min-w-0 items-center" ref={setPdfToolbarHost} />,
      },
    );
  }

  if (previewKind === 'image' && previewUrl) {
    return renderStandardContentPreview(
      <div className="flex h-full w-full items-center justify-center overflow-auto">
        <img src={previewUrl} alt={doc.doc_title} className="max-h-full max-w-full" />
      </div>,
      { downloadUrl: showHeaderDownload ? previewUrl : null },
    );
  }

  if (previewKind === 'json' && previewText) {
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(previewText);
    } catch {
      jsonData = null;
    }
    if (jsonData !== null && typeof jsonData === 'object') {
      return renderStandardContentPreview(
        <JsonTreeView.Root
          defaultExpandedDepth={2}
          data={jsonData as Record<string, unknown>}
          className="json-tree-root"
        >
          <JsonTreeView.Tree
            className="json-tree"
            arrow={<IconChevronRight size={14} />}
          />
        </JsonTreeView.Root>,
        { downloadUrl: showHeaderDownload ? previewUrl : null, contentClassName: 'overflow-auto' },
      );
    }
    // Fall through to plain text if JSON parse fails
    return renderStandardContentPreview(
      <pre className="parse-preview-text">{previewText}</pre>,
      { downloadUrl: showHeaderDownload ? previewUrl : null },
    );
  }

  if (previewKind === 'text') {
    return renderStandardContentPreview(
      <pre className="parse-preview-text">{previewText ?? ''}</pre>,
      { downloadUrl: showHeaderDownload ? previewUrl : null },
    );
  }

  if (previewKind === 'markdown') {
    return renderStandardContentPreview(
      <div className="parse-markdown-preview">
        <ReactMarkdown remarkPlugins={[remarkFrontmatter, remarkGfm]}>
          {previewText ?? ''}
        </ReactMarkdown>
      </div>,
      { downloadUrl: showHeaderDownload ? previewUrl : null },
    );
  }

  if (previewKind === 'xlsx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      editMode ? (
        <OnlyOfficeEditorPanel key={doc.source_uid} doc={doc} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Click Edit to open in spreadsheet editor.
        </div>
      ),
      {
        downloadUrl: showHeaderDownload ? previewUrl : null,
        useScrollArea: editMode ? false : undefined,
        headerActions: renderEditToggle(),
      },
    );
  }

  if (previewKind === 'docx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      editMode ? (
        <OnlyOfficeEditorPanel key={doc.source_uid} doc={doc} />
      ) : (
        <DocxPreview
          key={`${doc.source_uid}:${previewUrl}:${previewRevision}`}
          title={doc.doc_title}
          url={previewUrl}
          hideToolbar
        />
      ),
      {
        downloadUrl: showHeaderDownload ? previewUrl : null,
        useScrollArea: editMode ? false : undefined,
        headerActions: renderEditToggle(),
      },
    );
  }

  if (previewKind === 'pptx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      editMode ? (
        <OnlyOfficeEditorPanel key={doc.source_uid} doc={doc} />
      ) : (
        <PptxPreview
          key={`${doc.source_uid}:${previewUrl}:${previewRevision}`}
          title={doc.doc_title}
          url={previewUrl}
          hideHeaderMeta
        />
      ),
      {
        downloadUrl: showHeaderDownload ? previewUrl : null,
        useScrollArea: editMode ? false : undefined,
        headerActions: renderEditToggle(),
      },
    );
  }

  if (previewUrl) {
    return renderStandardContentPreview(
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Open file
        </a>
      </div>,
      { downloadUrl: showHeaderDownload ? previewUrl : null },
    );
  }

  return renderPreviewWithUnifiedHeader(<DocumentPreviewMessage message="Preview unavailable." />);
}
