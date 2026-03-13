import { useEffect, useMemo, useState } from 'react';
import {
  IconLoader2,
  IconPlayerPlay,
  IconEye,
  IconDownload,
  IconX,
} from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBatchParse } from '@/hooks/useBatchParse';
import { DispatchBadge } from '@/components/documents/StatusBadge';
import { supabase } from '@/lib/supabase';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

const DOCUMENTS_BUCKET =
  (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

type ParsingProfile = {
  id: string;
  parser: string;
  config: Record<string, unknown>;
};

function getBaseName(locator: string | null | undefined): string | null {
  if (!locator) return null;
  const lastSlash = locator.lastIndexOf('/');
  const filename = lastSlash >= 0 ? locator.slice(lastSlash + 1) : locator;
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

/** Hook that manages all parse-tab state. Used by both the toolbar and row actions. */
export function useParseTab() {
  const [profiles, setProfiles] = useState<ParsingProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [configText, setConfigText] = useState('{}');
  const [jsonModal, setJsonModal] = useState<{ title: string; content: string } | null>(null);

  const parsedConfig = useMemo(() => {
    try {
      return JSON.parse(configText) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [configText]);

  const batch = useBatchParse({
    profileId: selectedProfileId,
    pipelineConfig: parsedConfig,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('parsing_profiles')
        .select('id, parser, config')
        .eq('parser', 'docling')
        .order('id');
      const rows = (data ?? []) as ParsingProfile[];
      setProfiles(rows);
      const defaultProfile = rows.find((p) => (p.config as any)?.is_default) ?? rows[0];
      if (defaultProfile) {
        setSelectedProfileId(defaultProfile.id);
        setConfigText(JSON.stringify(defaultProfile.config, null, 2));
      }
    })();
  }, []);

  const handleProfileChange = (id: string) => {
    setSelectedProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (profile) setConfigText(JSON.stringify(profile.config, null, 2));
  };

  const handleViewJson = async (doc: ProjectDocumentRow) => {
    const baseName = getBaseName(doc.source_locator);
    if (!baseName) return;
    const key = `converted/${doc.source_uid}/${baseName}.docling.json`;
    const { data, error: urlError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(key, 60 * 20);
    if (urlError || !data?.signedUrl) return;
    try {
      const resp = await fetch(data.signedUrl);
      const text = await resp.text();
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setJsonModal({ title: doc.doc_title, content: formatted });
    } catch {
      setJsonModal({ title: doc.doc_title, content: 'Failed to load JSON.' });
    }
  };

  const handleDownloadJson = async (doc: ProjectDocumentRow) => {
    const baseName = getBaseName(doc.source_locator);
    if (!baseName) return;
    const key = `converted/${doc.source_uid}/${baseName}.docling.json`;
    const { data } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(key, 60 * 20);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return {
    profiles,
    selectedProfileId,
    handleProfileChange,
    batch,
    jsonModal,
    setJsonModal,
    handleViewJson,
    handleDownloadJson,
  };
}

interface ParseTabPanelProps {
  docs: ProjectDocumentRow[];
  selected: Set<string>;
  parseTab: ReturnType<typeof useParseTab>;
}

export function ParseTabPanel({ docs, selected, parseTab }: ParseTabPanelProps) {
  const { profiles, selectedProfileId, handleProfileChange, batch, jsonModal, setJsonModal } = parseTab;

  const unparsedUids = docs
    .filter((d) => d.status === 'uploaded' || d.status === 'conversion_failed' || d.status === 'parse_failed')
    .map((d) => d.source_uid);

  const selectedUids = docs
    .filter((d) => selected.has(d.source_uid))
    .map((d) => d.source_uid);

  const parsedCount = docs.filter((d) => d.status === 'parsed').length;
  const convertingCount = docs.filter((d) => d.status === 'converting').length;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Profile</label>
          <select
            value={selectedProfileId}
            onChange={(e) => handleProfileChange(e.target.value)}
            className="h-7 rounded-md border border-border bg-background px-2 text-xs"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.config as any)?.name ?? p.id}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={unparsedUids.length === 0 || batch.isRunning || !selectedProfileId}
          onClick={() => batch.start(unparsedUids)}
          className="h-7 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Parse All ({unparsedUids.length})
        </button>

        {selected.size > 0 && (
          <button
            type="button"
            disabled={selectedUids.length === 0 || batch.isRunning || !selectedProfileId}
            onClick={() => batch.start(selectedUids)}
            className="h-7 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            Parse Selected ({selectedUids.length})
          </button>
        )}

        {batch.isRunning && (
          <button
            type="button"
            onClick={batch.cancel}
            className="h-7 rounded-md border border-destructive/50 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Cancel
          </button>
        )}

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{parsedCount}/{docs.length} parsed</span>
          {convertingCount > 0 && (
            <span className="flex items-center gap-1">
              <IconLoader2 size={12} className="animate-spin" />
              {convertingCount}
            </span>
          )}
        </div>

        {docs.length > 0 && (
          <div className="basis-full">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${(parsedCount / docs.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Spacer for empty state */}
      <div className="flex-1" />

      {/* JSON modal */}
      {jsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-foreground truncate">
                {jsonModal.title} — DoclingDocument
              </h3>
              <button
                type="button"
                onClick={() => setJsonModal(null)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <IconX size={16} />
              </button>
            </div>
            <ScrollArea className="min-h-0 flex-1 p-4" viewportClass="h-full overflow-auto">
              <pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground">
                {jsonModal.content}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

/** Row actions for the parse tab — rendered by DocumentFileTable via renderRowActions */
export function ParseRowActions({
  doc,
  parseTab,
}: {
  doc: ProjectDocumentRow;
  parseTab: ReturnType<typeof useParseTab>;
}) {
  const { batch, handleViewJson, handleDownloadJson } = parseTab;
  const dStatus = batch.dispatchStatus.get(doc.source_uid) ?? 'idle';
  const canParse =
    doc.status === 'uploaded' ||
    doc.status === 'conversion_failed' ||
    doc.status === 'parse_failed';
  const isConverting = doc.status === 'converting';
  const isParsed = doc.status === 'parsed';

  return (
    <div className="flex items-center gap-1">
      <DispatchBadge status={dStatus} />
      {canParse && (
        <button
          type="button"
          onClick={() => batch.start([doc.source_uid])}
          disabled={batch.isRunning}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
          title="Parse this file"
        >
          <IconPlayerPlay size={14} />
        </button>
      )}
      {isConverting && (
        <span className="flex h-6 w-6 items-center justify-center">
          <IconLoader2 size={14} className="animate-spin text-primary" />
        </span>
      )}
      {isParsed && (
        <>
          <button
            type="button"
            onClick={() => void handleViewJson(doc)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
            title="View DoclingDocument JSON"
          >
            <IconEye size={14} />
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadJson(doc)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Download DoclingDocument JSON"
          >
            <IconDownload size={14} />
          </button>
        </>
      )}
    </div>
  );
}
