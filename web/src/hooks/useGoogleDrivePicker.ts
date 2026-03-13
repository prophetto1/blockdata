import { useCallback, useRef, useState } from 'react';
import { useExternalScript } from './useExternalScript';

// ── Env ──────────────────────────────────────────────────────────────────────
const GOOGLE_API_KEY = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim() || null;
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null;
const GOOGLE_APP_ID = (import.meta.env.VITE_GOOGLE_APP_ID as string | undefined)?.trim() || null;

const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

/**
 * MIME types the Google Picker will allow the user to select.
 * Aligned with the ingest pipeline's allowed_extensions so that every
 * file the user can pick will be accepted server-side.
 *
 * Google Workspace types (Docs/Sheets/Slides) are included because the
 * google-drive-import edge function exports them to DOCX/XLSX/PPTX.
 */
const PICKER_MIME_TYPES = [
  // Binary files the pipeline accepts directly
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',     // .txt
  'text/markdown',  // .md
  'text/csv',       // .csv
  'text/html',      // .html
  // Google Workspace types → exported to Office formats by edge function
  'application/vnd.google-apps.document',     // → .docx
  'application/vnd.google-apps.spreadsheet',  // → .xlsx
  'application/vnd.google-apps.presentation', // → .pptx
].join(',');

// ── Types ────────────────────────────────────────────────────────────────────

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  /** Optional — Google does not always return this field. */
  sizeBytes?: number;
};

export type UseGoogleDrivePickerResult = {
  openPicker: () => void;
  /** True when env vars are set and both Google scripts are loaded. */
  isReady: boolean;
  /** True while the Picker popup is visible. */
  isOpen: boolean;
  error: string | null;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGoogleDrivePicker(opts: {
  onFilesSelected: (files: GoogleDriveFile[], accessToken: string) => void;
}): UseGoogleDrivePickerResult {
  const envReady = Boolean(GOOGLE_API_KEY && GOOGLE_CLIENT_ID && GOOGLE_APP_ID);

  // Only load scripts when env vars are configured
  const gapiStatus = useExternalScript(envReady ? 'https://apis.google.com/js/api.js' : null);
  const gsiStatus = useExternalScript(envReady ? 'https://accounts.google.com/gsi/client' : null);

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable ref so the picker callback always calls the latest handler
  const onFilesSelectedRef = useRef(opts.onFilesSelected);
  onFilesSelectedRef.current = opts.onFilesSelected;

  const scriptsReady = gapiStatus === 'ready' && gsiStatus === 'ready';
  const isReady = envReady && scriptsReady;

  const openPicker = useCallback(() => {
    if (!isReady) return;
    setError(null);

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID!,
      scope: SCOPE,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          setError(`Google auth failed: ${tokenResponse.error_description ?? tokenResponse.error}`);
          return;
        }

        gapi.load('picker', () => {
          const view = new google.picker.View(google.picker.ViewId.DOCS);
          view.setMimeTypes(PICKER_MIME_TYPES);

          const picker = new google.picker.PickerBuilder()
            .setAppId(GOOGLE_APP_ID!)
            .setOAuthToken(tokenResponse.access_token)
            .setDeveloperKey(GOOGLE_API_KEY!)
            .addView(view)
            .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
            .setCallback((data: google.picker.CallbackData) => {
              if (data.action === google.picker.Action.PICKED && data.docs) {
                const files: GoogleDriveFile[] = data.docs.map((doc) => ({
                  id: doc.id,
                  name: doc.name,
                  mimeType: doc.mimeType,
                  sizeBytes: doc.sizeBytes,
                }));
                onFilesSelectedRef.current(files, tokenResponse.access_token);
              }
              if (
                data.action === google.picker.Action.PICKED ||
                data.action === google.picker.Action.CANCEL
              ) {
                setIsOpen(false);
              }
            })
            .build();

          picker.setVisible(true);
          setIsOpen(true);
        });
      },
      error_callback: (err) => {
        setError(`Google auth error: ${err.message}`);
      },
    });

    tokenClient.requestAccessToken();
  }, [isReady]);

  return { openPicker, isReady, isOpen, error };
}
