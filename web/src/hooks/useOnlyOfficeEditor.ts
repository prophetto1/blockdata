import { useCallback, useEffect, useRef, useState } from 'react';
import { platformApiFetch } from '@/lib/platformApi';
import { useExternalScript } from '@/hooks/useExternalScript';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnlyOfficeEditorState =
  | { status: 'idle' }
  | { status: 'opening' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

type SessionInfo = {
  sessionId: string;
  filename: string;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const OO_API_SCRIPT = '/oo-api/web-apps/apps/api/documents/api.js';

export function useOnlyOfficeEditor(
  containerId: string,
  doc: { source_uid: string } | null,
  active: boolean,
) {
  const scriptStatus = useExternalScript(active ? OO_API_SCRIPT : null);
  const [state, setState] = useState<OnlyOfficeEditorState>({ status: 'idle' });
  const editorRef = useRef<DocsAPI.DocEditor | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const activeDocRef = useRef<string | null>(null);

  const destroy = useCallback(() => {
    editorRef.current?.destroyEditor();
    editorRef.current = null;
    sessionRef.current = null;
    activeDocRef.current = null;
  }, []);

  useEffect(() => {
    if (!active || !doc || scriptStatus !== 'ready') {
      if (!active || !doc) {
        destroy();
        setState({ status: 'idle' });
      }
      if (scriptStatus === 'error') {
        setState({ status: 'error', message: 'Failed to load OnlyOffice API script' });
      }
      return;
    }

    // Don't re-open if same doc is already active
    if (activeDocRef.current === doc.source_uid && editorRef.current) {
      return;
    }

    let cancelled = false;

    const mount = async () => {
      destroy();
      setState({ status: 'opening' });

      try {
        // 1. Open session — bridge looks up doc, verifies ownership, pulls from storage
        const openRes = await platformApiFetch('/onlyoffice/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_uid: doc.source_uid }),
        });
        if (!openRes.ok) throw new Error(await openRes.text());
        const { session_id, filename } = await openRes.json();
        if (cancelled) return;

        sessionRef.current = { sessionId: session_id, filename };

        // 2. Get signed editor config
        const configRes = await platformApiFetch('/onlyoffice/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id }),
        });
        if (!configRes.ok) throw new Error(await configRes.text());
        const config = await configRes.json();
        if (cancelled) return;

        // Tell the editor to route all Document Server requests through the
        // Vite proxy (/oo-api → localhost:9980) so that the iframe's origin
        // matches the page origin, avoiding CORS blocks on cache/file URLs.
        config.documentServerUrl = '/oo-api/';

        // 3. Add event handlers — setState('ready') only when editor signals onAppReady,
        //    not immediately after construction (the editor still needs to fetch the doc).
        config.events = {
          onAppReady: () => {
            console.log('[OnlyOffice] Editor ready');
            if (!cancelled) setState({ status: 'ready' });
          },
          onDocumentStateChange: (event: { data: boolean }) => {
            console.log('[OnlyOffice] Dirty:', event.data);
          },
          onError: (event: { data: { errorCode: number; errorDescription: string } }) => {
            console.error('[OnlyOffice] Error:', event.data);
            if (!cancelled) setState({ status: 'error', message: event.data.errorDescription });
          },
          onDownloadAs: (event: { data: { fileType: string; url: string } }) => {
            console.log('[OnlyOffice] Download:', event.data);
          },
        };

        // 4. Mount editor
        await new Promise((r) => setTimeout(r, 0)); // ensure DOM is ready
        if (cancelled) return;

        console.log('[OnlyOffice] Mounting editor in container:', containerId);
        const editor = new DocsAPI.DocEditor(containerId, config);
        editorRef.current = editor;
        activeDocRef.current = doc.source_uid;
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to open OnlyOffice editor:', err);
        setState({ status: 'error', message });
      }
    };

    void mount();

    return () => {
      cancelled = true;
      destroy();
    };
  }, [active, doc?.source_uid, containerId, destroy, scriptStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return { state };
}
