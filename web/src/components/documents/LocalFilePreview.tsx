import { useEffect, useMemo, useState } from 'react';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import { IconChevronRight, IconDownload } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import { ScrollArea } from '@/components/ui/scroll-area';
import { type FsNode, readFileContent } from '@/lib/fs-access';

import { CodePreview } from './CodePreview';
import { DocumentPreviewFrame, DocumentPreviewMessage } from './DocumentPreviewShell';
import { DocxPreview } from './DocxPreview';
import { PdfjsExpressPreview } from './PdfjsExpressPreview';
import { PptxPreview } from './PptxPreview';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const JSON_EXTENSIONS = new Set(['.json']);
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.py', '.rs', '.go',
  '.yaml', '.yml', '.sql', '.sh', '.bash', '.vue', '.svelte',
]);
const TEXT_EXTENSIONS = new Set([
  '.txt', '.csv', '.tsv', '.toml', '.xml', '.ini', '.cfg', '.log', '.env',
]);
const PDF_EXTENSIONS = new Set(['.pdf']);
const DOCX_EXTENSIONS = new Set(['.docx']);
const PPTX_EXTENSIONS = new Set(['.pptx']);
const XLSX_EXTENSIONS = new Set(['.xlsx']);

type LocalPreviewKind =
  | 'none'
  | 'image'
  | 'markdown'
  | 'json'
  | 'text'
  | 'code'
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'file';

function getPreviewKind(extension: string): LocalPreviewKind {
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (MARKDOWN_EXTENSIONS.has(extension)) return 'markdown';
  if (JSON_EXTENSIONS.has(extension)) return 'json';
  if (PDF_EXTENSIONS.has(extension)) return 'pdf';
  if (DOCX_EXTENSIONS.has(extension)) return 'docx';
  if (PPTX_EXTENSIONS.has(extension)) return 'pptx';
  if (XLSX_EXTENSIONS.has(extension)) return 'xlsx';
  if (CODE_EXTENSIONS.has(extension)) return 'code';
  if (TEXT_EXTENSIONS.has(extension) || extension === '') return 'text';
  return 'file';
}

function formatBadge(extension: string): string {
  if (!extension) return 'FILE';
  return extension.slice(1).toUpperCase() || 'FILE';
}

export function LocalFilePreview({ node }: { node: FsNode | null }) {
  const [previewKind, setPreviewKind] = useState<LocalPreviewKind>('none');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setPreviewKind('none');
    setPreviewText(null);
    setError(null);
    setLoading(false);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });

    if (!node || node.kind !== 'file') {
      return () => {
        cancelled = true;
      };
    }

    const nextKind = getPreviewKind(node.extension);
    const handle = node.handle as FileSystemFileHandle;
    setLoading(true);

    const loadPreview = async () => {
      try {
        const file = await handle.getFile();
        if (cancelled) return;

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        if (nextKind === 'markdown' || nextKind === 'json' || nextKind === 'text' || nextKind === 'code') {
          const text = await readFileContent(handle);
          if (cancelled) return;
          const truncated = text.length > 200_000 ? `${text.slice(0, 200_000)}\n\n[Preview truncated]` : text;
          setPreviewKind(nextKind);
          setPreviewText(truncated.length > 0 ? truncated : '[Empty file]');
          setLoading(false);
          return;
        }

        setPreviewKind(nextKind);
        setLoading(false);
      } catch (previewError) {
        if (cancelled) return;
        setError(previewError instanceof Error ? previewError.message : 'Preview unavailable.');
        setLoading(false);
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [node]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const jsonData = useMemo(() => {
    if (previewKind !== 'json' || !previewText) return null;
    try {
      const parsed = JSON.parse(previewText);
      return parsed !== null && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }, [previewKind, previewText]);

  if (!node) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select a local file to preview." />
      </DocumentPreviewFrame>
    );
  }

  const downloadAction = previewUrl ? (
    <a
      href={previewUrl}
      download={node.name}
      aria-label="Download local file"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <IconDownload size={16} />
    </a>
  ) : null;

  return (
    <DocumentPreviewFrame scroll={false} padded={false}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid min-h-10 grid-cols-[auto_1fr_auto] items-center border-b border-border bg-card px-2">
          <span className="inline-flex min-w-[34px] justify-center rounded border border-border bg-muted/60 px-1 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {formatBadge(node.extension)}
          </span>
          <span
            className="min-w-0 px-2 text-center text-[13px] font-medium text-foreground truncate"
            title={node.path}
          >
            {node.name}
          </span>
          <div className="ml-auto flex min-w-[32px] items-center justify-end gap-2">
            {downloadAction}
          </div>
        </div>

        {loading ? (
          <div className="min-h-0 flex-1">
            <DocumentPreviewMessage message="Loading preview..." />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="min-h-0 flex-1">
            <DocumentPreviewMessage message={error} isError />
          </div>
        ) : null}

        {!loading && !error && previewKind === 'pdf' && previewUrl ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <PdfjsExpressPreview url={previewUrl} />
          </div>
        ) : null}

        {!loading && !error && previewKind === 'docx' && previewUrl ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <DocxPreview title={node.name} url={previewUrl} hideToolbar />
          </div>
        ) : null}

        {!loading && !error && previewKind === 'pptx' && previewUrl ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <PptxPreview title={node.name} url={previewUrl} hideHeaderMeta />
          </div>
        ) : null}

        {!loading && !error && previewKind === 'image' && previewUrl ? (
          <ScrollArea className="min-h-0 flex-1 bg-card" viewportClass="h-full overflow-y-auto overflow-x-hidden p-4">
            <div className="flex h-full w-full items-center justify-center overflow-auto">
              <img src={previewUrl} alt={node.name} className="max-h-full max-w-full" />
            </div>
          </ScrollArea>
        ) : null}

        {!loading && !error && previewKind === 'markdown' ? (
          <ScrollArea className="min-h-0 flex-1 bg-card" viewportClass="h-full overflow-y-auto overflow-x-hidden p-4">
            <div className="parse-markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkFrontmatter, remarkGfm]}>
                {previewText ?? ''}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        ) : null}

        {!loading && !error && previewKind === 'json' ? (
          <ScrollArea className="min-h-0 flex-1 bg-card" viewportClass="h-full overflow-y-auto overflow-x-hidden p-4">
            {jsonData ? (
              <JsonTreeView.Root
                defaultExpandedDepth={2}
                data={jsonData as Record<string, unknown>}
                className="json-tree-root"
              >
                <JsonTreeView.Tree className="json-tree" arrow={<IconChevronRight size={14} />} />
              </JsonTreeView.Root>
            ) : (
              <pre className="parse-preview-text">{previewText ?? ''}</pre>
            )}
          </ScrollArea>
        ) : null}

        {!loading && !error && previewKind === 'code' && previewText ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodePreview content={previewText} extension={node.extension} />
          </div>
        ) : null}

        {!loading && !error && previewKind === 'text' ? (
          <ScrollArea className="min-h-0 flex-1 bg-card" viewportClass="h-full overflow-y-auto overflow-x-hidden p-4">
            <pre className="parse-preview-text">{previewText ?? ''}</pre>
          </ScrollArea>
        ) : null}

        {!loading && !error && previewKind === 'xlsx' ? (
          <div className="min-h-0 flex-1">
            <DocumentPreviewMessage message="Spreadsheet preview is not available for local files yet." />
          </div>
        ) : null}

        {!loading && !error && previewKind === 'file' && previewUrl ? (
          <div className="min-h-0 flex-1">
            <DocumentPreviewMessage
              message={(
                <a href={previewUrl} download={node.name} className="text-primary hover:underline">
                  Download file
                </a>
              )}
            />
          </div>
        ) : null}
      </div>
    </DocumentPreviewFrame>
  );
}
