/**
 * MDXEditor surface for .md/.mdx files in the superuser workspace.
 *
 * Full plugin integration — all MDXEditor features enabled:
 * - Rich text editing (headings, lists, quotes, bold/italic/underline, inline code)
 * - Diff/source mode (rich-text, source, diff views)
 * - Images (with upload handler)
 * - Tables
 * - Code blocks (CodeMirror with language support)
 * - Links & link dialogs
 * - Front-matter editing
 * - Directives & admonitions
 * - Markdown shortcuts
 * - Search & replace
 * - Toolbar with all built-in components
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsDark } from '@/lib/useIsDark';
import { appCodeMirrorTheme } from '@/lib/codemirrorTheme';
import { ScrollArea } from '@/components/ui/scroll-area';
import '@/styles/mdxeditor-overrides.css';

export type MdxViewMode = 'rich-text' | 'source' | 'diff';

type MDXEditorModule = typeof import('@mdxeditor/editor');
type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

type Props = {
  /** Current markdown content. When this changes (new file), the editor resets. */
  content: string;
  /** Previous version for diff view (optional) */
  diffMarkdown?: string;
  /** Unique key to force remount when file changes */
  fileKey: string;
  /** Externally controlled view mode */
  viewMode: MdxViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  /** Optional image upload handler */
  onImageUpload?: (image: File) => Promise<string>;
};

export function MdxEditorSurface({ content, diffMarkdown, fileKey, viewMode, onChange, onSave, readOnly = false, onImageUpload }: Props) {
  const [mod, setMod] = useState<MDXEditorModule | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const isDark = useIsDark();

  const loadEditor = useCallback(() => {
    setLoadState('loading');
    Promise.all([
      import('@mdxeditor/editor'),
      import('@mdxeditor/editor/style.css'),
    ])
      .then(([editorMod]) => {
        setMod(editorMod as unknown as MDXEditorModule);
        setLoadState('ready');
      })
      .catch((err) => {
        console.error('[MdxEditorSurface] Failed to load:', err);
        setLoadState('failed');
      });
  }, []);

  useEffect(() => {
    loadEditor();
  }, [loadEditor]);

  if (loadState === 'failed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>MDX editor failed to load.</span>
        <button type="button" className="text-primary underline text-xs" onClick={loadEditor}>
          Retry
        </button>
      </div>
    );
  }

  if (!mod || loadState !== 'ready') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <MdxEditorInner
      key={fileKey}
      mod={mod}
      content={content}
      diffMarkdown={diffMarkdown}
      isDark={isDark}
      viewMode={viewMode}
      onChange={onChange}
      onSave={onSave}
      readOnly={readOnly}
      onImageUpload={onImageUpload}
    />
  );
}

// ─── Inner component (only rendered when module is loaded) ───────────────────

function MdxEditorInner({
  mod,
  content,
  diffMarkdown,
  isDark,
  viewMode,
  onChange,
  onSave,
  readOnly,
  onImageUpload,
}: {
  mod: MDXEditorModule;
  content: string;
  diffMarkdown?: string;
  isDark: boolean;
  viewMode: MdxViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly: boolean;
  onImageUpload?: (image: File) => Promise<string>;
}) {
  const {
    MDXEditor,
    // ── Core formatting plugins ──
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    // ── Links ──
    linkPlugin,
    linkDialogPlugin,
    // ── Images ──
    imagePlugin,
    // ── Tables ──
    tablePlugin,
    // ── Code blocks ──
    codeBlockPlugin,
    codeMirrorPlugin,
    // ── Front-matter ──
    frontmatterPlugin,
    // ── JSX ──
    jsxPlugin,
    // ── Directives & admonitions ──
    directivesPlugin,
    AdmonitionDirectiveDescriptor,
    // ── Diff/source mode ──
    diffSourcePlugin,
    // ── Toolbar ──
    toolbarPlugin,
    // ── Toolbar components ──
    UndoRedo,
    BoldItalicUnderlineToggles,
    CodeToggle,
    HighlightToggle,
    BlockTypeSelect,
    CreateLink,
    InsertImage,
    InsertTable,
    InsertThematicBreak,
    InsertFrontmatter,
    InsertCodeBlock,
    InsertAdmonition,
    ListsToggle,
    Separator,
    ConditionalContents,
    ChangeCodeMirrorLanguage,
    // ── Realm API for viewMode sync ──
    realmPlugin,
    viewMode$,
  } = mod as any;

  // searchPlugin may not exist in all versions
  const searchPlugin = (mod as any).searchPlugin;

  const editorRef = useRef<any>(null);

  function handleSaveKeyDown(event: React.KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      onSave?.();
    }
  }

  // ── Custom plugin to sync external viewMode into MDXEditor realm ────────

  const viewModeSyncPlugin = realmPlugin({
    update(realm: any) {
      realm.pub(viewMode$, viewMode);
    },
  });

  // ── Build plugin array ─────────────────────────────────────────────────────

  const plugins = [
    // Core formatting
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),

    // Links
    linkPlugin(),
    linkDialogPlugin(),

    // Images
    imagePlugin({
      ...(onImageUpload ? { imageUploadHandler: onImageUpload } : {}),
    }),

    // Tables
    tablePlugin(),

    // Code blocks with full language support
    codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        '': 'Plain',
        js: 'JavaScript',
        jsx: 'JSX',
        ts: 'TypeScript',
        tsx: 'TSX',
        css: 'CSS',
        html: 'HTML',
        python: 'Python',
        rust: 'Rust',
        go: 'Go',
        sql: 'SQL',
        bash: 'Bash',
        shell: 'Shell',
        json: 'JSON',
        yaml: 'YAML',
        toml: 'TOML',
        xml: 'XML',
        markdown: 'Markdown',
        c: 'C',
        cpp: 'C++',
        csharp: 'C#',
        java: 'Java',
        kotlin: 'Kotlin',
        swift: 'Swift',
        ruby: 'Ruby',
        php: 'PHP',
        lua: 'Lua',
        r: 'R',
        scala: 'Scala',
        haskell: 'Haskell',
        elixir: 'Elixir',
        erlang: 'Erlang',
        clojure: 'Clojure',
        dart: 'Dart',
        zig: 'Zig',
        nim: 'Nim',
        dockerfile: 'Dockerfile',
        graphql: 'GraphQL',
        protobuf: 'Protocol Buffers',
        terraform: 'Terraform',
        vue: 'Vue',
        svelte: 'Svelte',
      },
      codeMirrorExtensions: [appCodeMirrorTheme],
    }),

    // Front-matter
    frontmatterPlugin(),

    // JSX components in MDX
    jsxPlugin(),

    // Directives & admonitions
    directivesPlugin({
      directiveDescriptors: [AdmonitionDirectiveDescriptor],
      escapeUnknownTextDirectives: true,
    }),

    // Diff/source mode — all 3 views
    diffSourcePlugin({
      viewMode,
      ...(diffMarkdown != null ? { diffMarkdown } : {}),
    }),

    // ViewMode sync — keeps realm in sync when viewMode prop changes
    viewModeSyncPlugin(),

    // Toolbar — full feature set (mode toggle hidden via CSS, controlled externally)
    toolbarPlugin({
      toolbarContents: () => (
        <ConditionalContents
          options={[
            {
              when: (editor: any) => editor?.editorType === 'codeblock',
              contents: () => <ChangeCodeMirrorLanguage />,
            },
            {
              fallback: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <HighlightToggle />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertThematicBreak />
                  <Separator />
                  <InsertCodeBlock />
                  <InsertAdmonition />
                  <InsertFrontmatter />
                </>
              ),
            },
          ]}
        />
      ),
    }),
  ];

  // Add search plugin if available
  if (searchPlugin) {
    plugins.splice(-1, 0, searchPlugin());
  }

  return (
    <div
      className={`h-full w-full overflow-hidden ${isDark ? 'dark-theme' : 'light-theme'}`}
      onKeyDownCapture={readOnly ? undefined : handleSaveKeyDown}
      tabIndex={0}
      role="presentation"
    >
      <ScrollArea className="h-full" viewportClass="!overflow-x-hidden" contentClass="!min-w-0">
        <MDXEditor
          ref={editorRef}
          markdown={content}
          onChange={onChange}
          readOnly={readOnly}
          className="h-full"
          contentEditableClassName="prose prose-sm max-w-none dark:prose-invert py-4 px-8"
          plugins={plugins}
        />
      </ScrollArea>
    </div>
  );
}
