import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { Extension, Mark } from '@tiptap/core';
import {
  suggestChanges,
  enableSuggestChanges,
  disableSuggestChanges,
  applySuggestions,
  revertSuggestions,
  withSuggestChanges,
} from '@handlewithcare/prosemirror-suggest-changes';
import { ScrollArea } from '@/components/ui/scroll-area';
import '@/styles/tiptap-suggest.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = 'visual' | 'suggest';

type Props = {
  content: string;
  fileKey: string;
  viewMode: ViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
};

// ─── Suggestion marks ────────────────────────────────────────────────────────
// prosemirror-suggest-changes requires marks named 'insertion', 'deletion', and
// 'modification' in schema.marks. These Tiptap Mark extensions register them.

const InsertionMark = Mark.create({
  name: 'insertion',
  inclusive: false,
  excludes: 'deletion modification insertion',

  addAttributes() {
    return { id: { default: null } };
  },

  parseHTML() {
    return [{
      tag: 'ins[data-id]',
      getAttrs: (el) => ({ id: JSON.parse((el as HTMLElement).dataset.id!) }),
    }];
  },

  renderHTML({ mark }) {
    return ['ins', { 'data-id': JSON.stringify(mark.attrs.id) }, 0];
  },
});

const DeletionMark = Mark.create({
  name: 'deletion',
  inclusive: false,
  excludes: 'insertion modification deletion',

  addAttributes() {
    return { id: { default: null } };
  },

  parseHTML() {
    return [{
      tag: 'del[data-id]',
      getAttrs: (el) => ({ id: JSON.parse((el as HTMLElement).dataset.id!) }),
    }];
  },

  renderHTML({ mark }) {
    return ['del', { 'data-id': JSON.stringify(mark.attrs.id) }, 0];
  },
});

const ModificationMark = Mark.create({
  name: 'modification',
  inclusive: false,
  excludes: 'deletion insertion',

  addAttributes() {
    return {
      id: { default: null },
      type: { default: null },
      attrName: { default: null },
      previousValue: { default: null },
      newValue: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="modification"]',
        getAttrs: (el) => {
          const node = el as HTMLElement;
          if (!node.dataset.id) return false;
          return {
            id: JSON.parse(node.dataset.id),
            type: node.dataset.modType,
            previousValue: node.dataset.modPrevVal,
            newValue: node.dataset.modNewVal,
          };
        },
      },
      {
        tag: 'div[data-type="modification"]',
        getAttrs: (el) => {
          const node = el as HTMLElement;
          if (!node.dataset.id) return false;
          return {
            id: JSON.parse(node.dataset.id),
            type: node.dataset.modType,
            previousValue: node.dataset.modPrevVal,
          };
        },
      },
    ];
  },

  renderHTML({ mark }) {
    return [
      'span',
      {
        'data-type': 'modification',
        'data-id': JSON.stringify(mark.attrs.id),
        'data-mod-type': mark.attrs.type,
        'data-mod-prev-val': JSON.stringify(mark.attrs.previousValue),
        'data-mod-new-val': JSON.stringify(mark.attrs.newValue),
      },
      0,
    ];
  },
});

// ─── Suggest-changes ProseMirror plugin ──────────────────────────────────────

const SuggestChangesPlugin = Extension.create({
  name: 'suggestChanges',

  addProseMirrorPlugins() {
    return [suggestChanges()];
  },
});

// ─── Component ───────────────────────────────────────────────────────────────

export function TiptapEditorSurface({ content, fileKey, viewMode, onChange, onSave }: Props) {
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Markdown,
        InsertionMark,
        DeletionMark,
        ModificationMark,
        SuggestChangesPlugin,
      ],
      content,
      onUpdate({ editor }) {
        const md = editor.storage.markdown?.getMarkdown?.() ?? editor.getText();
        onChangeRef.current(md);
      },
      editorProps: {
        handleKeyDown(view, event) {
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            onSaveRef.current?.();
            return true;
          }
          return false;
        },
        // withSuggestChanges intercepts transactions when suggest mode is enabled.
        // Passing no base dispatch uses the default (view.updateState(view.state.apply(tr))).
        // `this` is bound to the EditorView by ProseMirror.
        dispatchTransaction: withSuggestChanges(),
      },
    },
    [fileKey],
  );

  // Toggle suggest mode based on viewMode prop
  useEffect(() => {
    if (!editor) return;
    const view = editor.view;
    if (viewMode === 'suggest') {
      enableSuggestChanges(view.state, view.dispatch);
    } else {
      disableSuggestChanges(view.state, view.dispatch);
    }
  }, [editor, viewMode]);

  const handleAcceptAll = useCallback(() => {
    if (!editor) return;
    applySuggestions(editor.view.state, editor.view.dispatch);
  }, [editor]);

  const handleRejectAll = useCallback(() => {
    if (!editor) return;
    revertSuggestions(editor.view.state, editor.view.dispatch);
  }, [editor]);

  if (!editor) return null;

  const suggestActive = viewMode === 'suggest';

  return (
    <div className="flex h-full flex-col">
      {/* Suggest-changes toolbar — only visible in suggest mode */}
      {suggestActive && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Suggesting</span>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            onClick={handleAcceptAll}
          >
            Accept All
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handleRejectAll}
          >
            Reject All
          </button>
        </div>
      )}

      {/* Editor */}
      <ScrollArea className="flex-1 min-h-0" viewportClass="!overflow-x-hidden">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none dark:prose-invert py-4 px-8"
        />
      </ScrollArea>
    </div>
  );
}
