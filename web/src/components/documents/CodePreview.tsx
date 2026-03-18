/**
 * Read-only CodeMirror 6 viewer for code/data file preview.
 * Applies syntax highlighting when a language pack matches the extension.
 * Files without a language pack still get line numbers and monospace.
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
import { appCodeMirrorTheme } from '@/lib/codemirrorTheme';

function getLanguageExtension(ext: string): Extension | null {
  switch (ext) {
    case '.js': return javascript();
    case '.jsx': return javascript({ jsx: true });
    case '.ts': return javascript({ typescript: true });
    case '.tsx': return javascript({ jsx: true, typescript: true });
    case '.html': case '.htm': case '.vue': case '.svelte': return html();
    case '.css': return css();
    case '.py': return python();
    case '.rs': return rust();
    case '.go': return go();
    case '.yaml': case '.yml': return yaml();
    case '.json': return json();
    default: return null;
  }
}

type CodePreviewProps = {
  content: string;
  extension: string;
};

export function CodePreview({ content, extension }: CodePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    viewRef.current?.destroy();

    const extensions: Extension[] = [
      basicSetup,
      appCodeMirrorTheme,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      EditorView.lineWrapping,
    ];

    const lang = getLanguageExtension(extension);
    if (lang) extensions.push(lang);

    const state = EditorState.create({ doc: content, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [content, extension]);

  return <div ref={containerRef} className="h-full w-full overflow-auto" />;
}
