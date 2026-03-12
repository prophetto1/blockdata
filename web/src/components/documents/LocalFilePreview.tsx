import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FsNode } from '@/lib/fs-access';
import { readFileContent } from '@/lib/fs-access';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);
const TEXT_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.toml',
  '.xml', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.py', '.rs', '.go',
  '.java', '.sql', '.sh', '.bash', '.env', '.ini', '.cfg', '.log', '.vue',
  '.svelte', '.rb', '.php', '.c', '.cpp', '.h', '.hpp', '.swift', '.kt',
]);

function isImageFile(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext);
}

function isTextFile(ext: string): boolean {
  if (TEXT_EXTENSIONS.has(ext)) return true;
  return ext === '';
}

export function LocalFilePreview({ node }: { node: FsNode | null }) {
  const [content, setContent] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }

    if (!node || node.kind !== 'file') {
      setLoading(false);
      return;
    }

    const handle = node.handle as FileSystemFileHandle;

    if (isImageFile(node.extension)) {
      setLoading(true);
      handle.getFile().then((file) => {
        if (cancelled) return;
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        setLoading(false);
      }).catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    } else if (isTextFile(node.extension)) {
      setLoading(true);
      readFileContent(handle).then((text) => {
        if (cancelled) return;
        const truncated = text.length > 200_000 ? `${text.slice(0, 200_000)}\n\n[Preview truncated]` : text;
        setContent(truncated.length > 0 ? truncated : '[Empty file]');
        setLoading(false);
      }).catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    } else {
      setLoading(true);
      handle.getFile().then((file) => {
        if (cancelled) return;
        const sizeKb = (file.size / 1024).toFixed(1);
        setContent(`File: ${node.name}\nSize: ${sizeKb} KB\n\nNo preview available for this file type.`);
        setLoading(false);
      }).catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectUrl]);

  if (!node) {
    return (
      <div className="h-full w-full min-h-0 p-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a local file to preview
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-0 p-1">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex min-h-10 items-center border-b border-border bg-card px-3">
          <span className="truncate text-sm font-medium">{node.name}</span>
        </div>

        {loading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && objectUrl && (
          <div className="flex h-full w-full items-center justify-center overflow-auto">
            <img src={objectUrl} alt={node.name} className="max-h-full max-w-full" />
          </div>
        )}

        {!loading && !error && content && !objectUrl && (
          <ScrollArea className="min-h-0 flex-1 bg-card">
            <pre className="whitespace-pre-wrap break-words p-4 text-sm font-mono">{content}</pre>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}