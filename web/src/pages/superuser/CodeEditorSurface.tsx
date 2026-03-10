/**
 * Standalone CodeMirror 6 editor surface for non-markdown files.
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
import { oneDark } from '@codemirror/theme-one-dark';
import { useIsDark } from '@/lib/useIsDark';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  extension: string;
  fileKey: string;
  onChange: (value: string) => void;
  onSave?: () => void;
};

export function CodeEditorSurface({ content, extension, fileKey, onChange, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isDark = useIsDark();
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  // Recreate editor when file or extension or theme changes
  useEffect(() => {
    if (!containerRef.current) return;

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
    ];
    extensions.push(EditorView.lineWrapping);
    if (isDark) extensions.push(oneDark);
    if (langExt) extensions.push(langExt);

    const state = EditorState.create({ doc: content, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // fileKey forces full recreation on file change
  }, [extension, fileKey, isDark]);

  return (
    <ScrollArea className="h-full w-full" viewportClass="!overflow-x-hidden">
      <div
        ref={containerRef}
        className="[&_.cm-editor]:!h-auto [&_.cm-scroller]:!overflow-visible"
      />
    </ScrollArea>
  );
}