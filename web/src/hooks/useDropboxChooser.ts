import { useCallback, useEffect, useRef, useState } from 'react';

// ── Env ──────────────────────────────────────────────────────────────────────
const DROPBOX_APP_KEY = (import.meta.env.VITE_DROPBOX_APP_KEY as string | undefined)?.trim() || null;

const SCRIPT_URL = 'https://www.dropbox.com/static/api/2/dropins.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type DropboxFile = {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
};

export type UseDropboxChooserResult = {
  openChooser: () => void;
  /** True when env var is set and the Chooser script is loaded. */
  isReady: boolean;
  error: string | null;
};

// ── Dropbox global type ──────────────────────────────────────────────────────

type DropboxChooserFile = {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
};

declare global {
  interface Window {
    Dropbox?: {
      choose: (options: {
        success: (files: DropboxChooserFile[]) => void;
        cancel?: () => void;
        linkType: 'direct' | 'preview';
        multiselect: boolean;
        folderselect: boolean;
      }) => void;
    };
  }
}

// ── Script loader (Dropbox requires data-app-key attribute) ──────────────────

let scriptPromise: Promise<void> | null = null;

function loadDropboxScript(appKey: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.id = 'dropboxjs';
    script.setAttribute('data-app-key', appKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Dropbox Chooser SDK'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDropboxChooser(opts: {
  onFilesSelected: (files: DropboxFile[]) => void;
}): UseDropboxChooserResult {
  const envReady = Boolean(DROPBOX_APP_KEY);

  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFilesSelectedRef = useRef(opts.onFilesSelected);
  onFilesSelectedRef.current = opts.onFilesSelected;

  useEffect(() => {
    if (!envReady || !DROPBOX_APP_KEY) return;
    loadDropboxScript(DROPBOX_APP_KEY)
      .then(() => setScriptReady(true))
      .catch(() => setError('Failed to load Dropbox SDK'));
  }, [envReady]);

  const isReady = envReady && scriptReady;

  const openChooser = useCallback(() => {
    if (!isReady || !window.Dropbox) return;
    setError(null);

    try {
      window.Dropbox.choose({
        success: (files: DropboxChooserFile[]) => {
          const mapped: DropboxFile[] = files.map((f) => ({
            id: f.id,
            name: f.name,
            link: f.link,
            bytes: f.bytes,
            icon: f.icon,
          }));
          onFilesSelectedRef.current(mapped);
        },
        cancel: () => {},
        linkType: 'direct',
        multiselect: true,
        folderselect: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open Dropbox chooser');
    }
  }, [isReady]);

  return { openChooser, isReady, error };
}