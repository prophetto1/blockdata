/**
 * Standalone CodeMirror 6 editor surface for non-markdown files.
 * Supports edit and unified diff view modes.
 */
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, type Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { MergeView } from '@codemirror/merge';
import { appCodeMirrorTheme } from '@/lib/codemirrorTheme';
import { ScrollArea } from '@/components/ui/scroll-area';

type ViewMode = 'edit' | 'diff';

function getLanguageExtension(ext: string): Extension | null {
  switch (ext) {
    case '.js': return javascript();
    case '.jsx': return javascript({ jsx: true });
    case '.ts': return javascript({ typescript: true });
    case '.tsx': return javascript({ jsx: true, typescript: true });
    case '.html': case '.vue': case '.svelte': return html();
    case '.css': return css();
    case '.py': return python();
    case '.rs': return rust();
    case '.go': return go();
    case '.yaml': case '.yml': return yaml();
    case '.json': return json();
    default: return null;
  }
}

type Props = {
  content: string;
  /** Original file content for diff baseline. */
  originalContent?: string;
  extension: string;
  fileKey: string;
  /** Externally controlled view mode. */
  viewMode: ViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
};

export function CodeEditorSurface({ content, originalContent, extension, fileKey, viewMode, onChange, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  // ── Shared extensions ───────────────────────────────────────────────────────

  function buildExtensions(): Extension[] {
    const langExt = getLanguageExtension(extension);
    const extensions: Extension[] = [
      basicSetup,
      EditorView.theme({
        '&': { padding: '8px 0' },
        '.cm-content': { padding: '0 8px' },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.domEventHandlers({
        keydown(event) {
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            onSaveRef.current?.();
            return true;
          }
          return false;
        },
      }),
      EditorView.lineWrapping,
      appCodeMirrorTheme,
    ];
    if (langExt) extensions.push(langExt);
    return extensions;
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (viewMode !== 'edit') return;
    if (!containerRef.current) return;

    const state = EditorState.create({ doc: content, extensions: buildExtensions() });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [extension, fileKey, viewMode]);

  // ── Diff mode ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (viewMode !== 'diff') return;
    if (!containerRef.current) return;

    const langExt = getLanguageExtension(extension);
    const sharedExts: Extension[] = [
      EditorView.lineWrapping,
      appCodeMirrorTheme,
    ];
    if (langExt) sharedExts.push(langExt);

    const mv = new MergeView({
      a: {
        doc: originalContent ?? content,
        extensions: [
          ...sharedExts,
          EditorState.readOnly.of(true),
          EditorView.theme({ '&': { padding: '8px 0' }, '.cm-content': { padding: '0 8px' } }),
        ],
      },
      b: {
        doc: content,
        extensions: [
          ...sharedExts,
          EditorState.readOnly.of(true),
          EditorView.theme({ '&': { padding: '8px 0' }, '.cm-content': { padding: '0 8px' } }),
        ],
      },
      parent: containerRef.current,
    });
    mergeViewRef.current = mv;

    return () => {
      mv.destroy();
      mergeViewRef.current = null;
    };
  }, [extension, fileKey, viewMode, originalContent]);

  return (
    <ScrollArea className="h-full w-full" viewportClass="!overflow-x-hidden">
      <div
        ref={containerRef}
        className="[&_.cm-editor]:!h-auto [&_.cm-scroller]:!overflow-visible [&_.cm-mergeView]:flex [&_.cm-mergeView]:min-h-0"
      />
    </ScrollArea>
  );
}
