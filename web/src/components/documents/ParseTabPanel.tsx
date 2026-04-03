import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconPlayerPlay,
  IconDotsVertical,
  IconX,
} from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBatchParse } from '@/hooks/useBatchParse';
import { resolveSignedUrlForLocators } from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';
import {
  findAppliedProfile,
  isParseSupported,
  type ParseTrack,
  type ParsingProfileOption,
} from './parseProfileSupport';

function getBaseName(locator: string | null | undefined): string | null {
  if (!locator) return null;
  const lastSlash = locator.lastIndexOf('/');
  const filename = lastSlash >= 0 ? locator.slice(lastSlash + 1) : locator;
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

// ─── ActionMenu ──────────────────────────────────────────────────────────────

function ActionMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <IconDotsVertical size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 min-w-[160px] rounded-md border border-border bg-popover py-1 shadow-md">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-xs hover:bg-accent',
                item.danger ? 'text-destructive' : 'text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── useParseTab ─────────────────────────────────────────────────────────────

/** Hook that manages all parse-tab state. Used by both the toolbar and row actions. */
export function useParseTab(activeTrack: ParseTrack, selectedDoc: ProjectDocumentRow | null) {
  const [allProfiles, setAllProfiles] = useState<ParsingProfileOption[]>([]);
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

  const profiles = useMemo(
    () => allProfiles.filter((p) => p.parser === activeTrack),
    [allProfiles, activeTrack],
  );

  const selectedParser = useMemo(() => {
    const profile = profiles.find((p) => p.id === selectedProfileId);
    return profile?.parser ?? activeTrack;
  }, [profiles, activeTrack, selectedProfileId]);

  const batch = useBatchParse({
    profileId: selectedProfileId,
    pipelineConfig: parsedConfig,
    parser: selectedParser,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('parsing_profiles')
        .select('id, parser, config')
        .order('id');
      const rows = (data ?? []) as ParsingProfileOption[];
      setAllProfiles(rows);
      const defaultProfile = rows.find((p) => (p.config as any)?.is_default) ?? rows[0];
      if (defaultProfile) {
        setSelectedProfileId(defaultProfile.id);
        setConfigText(JSON.stringify(defaultProfile.config, null, 2));
      }
    })();
  }, []);

  useEffect(() => {
    if (profiles.length === 0) return;

    const appliedProfile = selectedDoc?.status === 'parsed'
      ? findAppliedProfile(profiles, selectedDoc)
      : null;

    const nextProfile = appliedProfile
      ?? profiles.find((profile) => profile.id === selectedProfileId)
      ?? profiles[0];

    if (!nextProfile) return;

    if (nextProfile.id !== selectedProfileId) {
      setSelectedProfileId(nextProfile.id);
    }

    const nextConfigText = JSON.stringify(nextProfile.config, null, 2);
    if (nextConfigText !== configText) {
      setConfigText(nextConfigText);
    }
  }, [configText, profiles, selectedDoc, selectedProfileId]);

  const handleProfileChange = (id: string) => {
    setSelectedProfileId(id);
    const profile = allProfiles.find((p) => p.id === id);
    if (profile) setConfigText(JSON.stringify(profile.config, null, 2));
  };

  const handleViewJson = async (doc: ProjectDocumentRow) => {
    // Use conv_locator (from view_documents) which holds the actual artifact path,
    // regardless of parser. Falls back to legacy .docling.json for older rows.
    const locator = doc.conv_locator;
    const baseName = getBaseName(doc.source_locator);
    const key = locator
      || (baseName ? `converted/${doc.source_uid}/${baseName}.docling.json` : null);
    if (!key) return;
    const { url: signedUrl } = await resolveSignedUrlForLocators([key]);
    if (!signedUrl) return;
    try {
      const resp = await fetch(signedUrl);
      const text = await resp.text();
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setJsonModal({ title: doc.doc_title, content: formatted });
    } catch {
      setJsonModal({ title: doc.doc_title, content: 'Failed to load JSON.' });
    }
  };

  const handleDownloadJson = async (doc: ProjectDocumentRow) => {
    const locator = doc.conv_locator;
    const baseName = getBaseName(doc.source_locator);
    const key = locator
      || (baseName ? `converted/${doc.source_uid}/${baseName}.docling.json` : null);
    if (!key) return;
    const { url: signedUrl } = await resolveSignedUrlForLocators([key]);
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  return {
    profiles,
    selectedProfileId,
    selectedParser,
    activeTrack,
    handleProfileChange,
    batch,
    jsonModal,
    setJsonModal,
    handleViewJson,
    handleDownloadJson,
  };
}

// ─── ParseTabPanel ───────────────────────────────────────────────────────────

export function ParseTabPanel({ parseTab }: { parseTab: ReturnType<typeof useParseTab> }) {
  const { jsonModal, setJsonModal } = parseTab;

  return (
    <>
      {jsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-foreground truncate">
                {jsonModal.title} — Parse Output
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
    </>
  );
}

// ─── ParseRowActions ─────────────────────────────────────────────────────────

/** Row actions for the parse tab — rendered by DocumentFileTable via renderRowActions */
export function ParseRowActions({
  doc,
  parseTab,
  onReset,
  onDelete,
  onDoclingMdPreview,
  onBlocksPreview,
  onDoclingJsonPreview,
}: {
  doc: ProjectDocumentRow;
  parseTab: ReturnType<typeof useParseTab>;
  onReset?: (uid: string) => void;
  onDelete?: (uid: string) => void;
  onDoclingMdPreview?: (doc: ProjectDocumentRow) => void;
  onBlocksPreview?: (doc: ProjectDocumentRow) => void;
  onDoclingJsonPreview?: (doc: ProjectDocumentRow) => void;
}) {
  const { batch } = parseTab;
  const parseable = isParseSupported(doc);
  const canParse = parseable && (
    doc.status === 'uploaded' ||
    doc.status === 'conversion_failed' ||
    doc.status === 'parse_failed'
  );
  const isParsed = doc.status === 'parsed';

  const menuItems: { label: string; onClick: () => void; danger?: boolean }[] = [];

  if (isParsed) {
    if (onDoclingMdPreview) {
      menuItems.push({ label: 'View Parsed Markdown', onClick: () => onDoclingMdPreview(doc) });
    }
    if (onBlocksPreview) {
      menuItems.push({ label: 'View Parsed Blocks', onClick: () => onBlocksPreview(doc) });
    }
    if (onDoclingJsonPreview) {
      menuItems.push({ label: 'Download', onClick: () => onDoclingJsonPreview(doc) });
    }
  }
  if (onReset) {
    menuItems.push({ label: 'Reset', onClick: () => onReset(doc.source_uid) });
  }
  if (onDelete) {
    menuItems.push({ label: 'Delete', onClick: () => onDelete(doc.source_uid), danger: true });
  }

  return (
    <div className="flex items-center gap-0.5">
      {canParse && (
        <button
          type="button"
          onClick={() => batch.start([doc.source_uid])}
          disabled={batch.isRunning}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
          title="Parse this file"
        >
          <IconPlayerPlay size={12} />
        </button>
      )}
      {!parseable && doc.status === 'uploaded' && (
        <span
          className="flex h-5 w-5 items-center justify-center text-muted-foreground/40"
          title="No parser available for this file type"
        >
          <IconPlayerPlay size={12} />
        </span>
      )}
      {menuItems.length > 0 && <ActionMenu items={menuItems} />}
    </div>
  );
}
