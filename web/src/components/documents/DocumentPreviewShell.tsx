import { useState, type ReactNode } from 'react';
import { IconDownload } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadFromSignedUrl, getDocumentFormat, type ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { normalizePath } from '@/lib/filesTree';

function getSelectedDocTitle(doc: ProjectDocumentRow | null): string {
  const selectedDocPath = normalizePath(doc?.doc_title ?? '');
  const selectedDocPathParts = selectedDocPath.split('/').filter((part) => part.length > 0);
  return selectedDocPathParts[selectedDocPathParts.length - 1]
    ?? doc?.doc_title
    ?? 'Asset';
}

function getSelectedDocFormat(doc: ProjectDocumentRow | null): string {
  return doc ? getDocumentFormat(doc) : 'FILE';
}

export function DocumentPreviewFrame({
  children,
  scroll = true,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  return (
    <div className="h-full w-full min-h-0 p-1">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        {scroll ? (
          <ScrollArea
            className="min-h-0 h-full flex-1 bg-card"
            viewportClass={[
              'h-full overflow-y-auto overflow-x-hidden',
              padded ? 'p-4' : '',
            ].join(' ').trim()}
          >
            {children}
          </ScrollArea>
        ) : (
          <div
            className={[
              'min-h-0 flex-1 overflow-hidden bg-card',
              padded ? 'p-4' : '',
            ].join(' ').trim()}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentPreviewHeader({
  doc,
  downloadUrl,
  downloadFilename,
  centerContent,
  actions,
}: {
  doc: ProjectDocumentRow | null;
  downloadUrl?: string | null;
  downloadFilename?: string | null;
  centerContent?: ReactNode;
  actions?: ReactNode;
}) {
  const selectedDocTitle = getSelectedDocTitle(doc);
  const selectedDocFormat = getSelectedDocFormat(doc);
  const [isDownloading, setIsDownloading] = useState(false);

  return (
    <div className="grid min-h-10 grid-cols-[auto_1fr_auto] items-center border-b border-border bg-card px-2">
      <span className="inline-flex min-w-[34px] justify-center rounded border border-border bg-muted/60 px-1 py-0.5 text-[11px] font-semibold text-muted-foreground">
        {selectedDocFormat}
      </span>
      {centerContent ?? (
        <span
          className="min-w-0 px-2 text-center text-[13px] font-medium text-foreground truncate"
          title={selectedDocTitle}
        >
          {selectedDocTitle}
        </span>
      )}
      <div className="ml-auto flex min-w-[32px] items-center justify-end gap-2">
        {actions}
        {downloadUrl ? (
          <button
            type="button"
            aria-label="Download file"
            disabled={isDownloading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={async () => {
              const fallbackBase = selectedDocTitle || 'document';
              const filename = downloadFilename?.trim() || fallbackBase;
              setIsDownloading(true);
              try {
                await downloadFromSignedUrl(downloadUrl, filename);
              } finally {
                setIsDownloading(false);
              }
            }}
          >
            <IconDownload size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DocumentPreviewShell({
  doc,
  children,
  downloadUrl,
  downloadFilename,
  contentClassName,
  useScrollArea = true,
  headerCenterContent,
  headerActions,
}: {
  doc: ProjectDocumentRow | null;
  children: ReactNode;
  downloadUrl?: string | null;
  downloadFilename?: string | null;
  contentClassName?: string;
  useScrollArea?: boolean;
  headerCenterContent?: ReactNode;
  headerActions?: ReactNode;
}) {
  return (
    <DocumentPreviewFrame scroll={false} padded={false}>
      <div className="flex h-full min-h-0 flex-col">
        <DocumentPreviewHeader
          doc={doc}
          downloadUrl={downloadUrl}
          downloadFilename={downloadFilename}
          centerContent={headerCenterContent}
          actions={headerActions}
        />
        {useScrollArea ? (
          <ScrollArea
            className="min-h-0 flex-1 bg-card"
            viewportClass={[
              'h-full overflow-y-auto overflow-x-hidden',
              contentClassName ?? '',
            ].join(' ').trim()}
            contentClass="!min-w-0"
          >
            {children}
          </ScrollArea>
        ) : (
          <div className={['min-h-0 flex-1 bg-card', contentClassName ?? ''].join(' ').trim()}>
            {children}
          </div>
        )}
      </div>
    </DocumentPreviewFrame>
  );
}

export function DocumentPreviewStandardContent({
  doc,
  children,
  contentClassName,
  downloadUrl,
  downloadFilename,
}: {
  doc: ProjectDocumentRow | null;
  children: ReactNode;
  contentClassName?: string;
  downloadUrl?: string | null;
  downloadFilename?: string | null;
}) {
  return (
    <DocumentPreviewShell doc={doc} downloadUrl={downloadUrl} downloadFilename={downloadFilename}>
      <div className={['p-4', contentClassName ?? ''].join(' ').trim()}>
        {children}
      </div>
    </DocumentPreviewShell>
  );
}

export function DocumentPreviewMessage({
  message,
  isError = false,
}: {
  message: ReactNode;
  isError?: boolean;
}) {
  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center text-sm',
        isError ? 'text-red-500' : 'text-muted-foreground',
      ].join(' ')}
    >
      {message}
    </div>
  );
}
