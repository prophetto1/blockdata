# Deliverables 2 J61 Superuser Bundle

Bundled source files for review.

## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-2-j61\source-snapshots\web\src\pages\superuser\MdxEditorSurface.tsx`

`$ext
/**
 * MDXEditor surface for .md/.mdx files in the superuser workspace.
 *
 * Full plugin integration â€” all MDXEditor features enabled:
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
  /** Optional image upload handler */
  onImageUpload?: (image: File) => Promise<string>;
};

export function MdxEditorSurface({ content, diffMarkdown, fileKey, viewMode, onChange, onSave, onImageUpload }: Props) {
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
      onImageUpload={onImageUpload}
    />
  );
}

// â”€â”€â”€ Inner component (only rendered when module is loaded) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MdxEditorInner({
  mod,
  content,
  diffMarkdown,
  isDark,
  viewMode,
  onChange,
  onSave,
  onImageUpload,
}: {
  mod: MDXEditorModule;
  content: string;
  diffMarkdown?: string;
  isDark: boolean;
  viewMode: MdxViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  onImageUpload?: (image: File) => Promise<string>;
}) {
  const {
    MDXEditor,
    // â”€â”€ Core formatting plugins â”€â”€
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    // â”€â”€ Links â”€â”€
    linkPlugin,
    linkDialogPlugin,
    // â”€â”€ Images â”€â”€
    imagePlugin,
    // â”€â”€ Tables â”€â”€
    tablePlugin,
    // â”€â”€ Code blocks â”€â”€
    codeBlockPlugin,
    codeMirrorPlugin,
    // â”€â”€ Front-matter â”€â”€
    frontmatterPlugin,
    // â”€â”€ JSX â”€â”€
    jsxPlugin,
    // â”€â”€ Directives & admonitions â”€â”€
    directivesPlugin,
    AdmonitionDirectiveDescriptor,
    // â”€â”€ Diff/source mode â”€â”€
    diffSourcePlugin,
    // â”€â”€ Toolbar â”€â”€
    toolbarPlugin,
    // â”€â”€ Toolbar components â”€â”€
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
    // â”€â”€ Realm API for viewMode sync â”€â”€
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

  // â”€â”€ Custom plugin to sync external viewMode into MDXEditor realm â”€â”€â”€â”€â”€â”€â”€â”€

  const viewModeSyncPlugin = realmPlugin({
    update(realm: any) {
      realm.pub(viewMode$, viewMode);
    },
  });

  // â”€â”€ Build plugin array â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    }),

    // Diff/source mode â€” all 3 views
    diffSourcePlugin({
      viewMode,
      ...(diffMarkdown != null ? { diffMarkdown } : {}),
    }),

    // ViewMode sync â€” keeps realm in sync when viewMode prop changes
    viewModeSyncPlugin(),

    // Toolbar â€” full feature set (mode toggle hidden via CSS, controlled externally)
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
      onKeyDownCapture={handleSaveKeyDown}
      tabIndex={0}
      role="presentation"
    >
      <ScrollArea className="h-full" viewportClass="!overflow-x-hidden" contentClass="!min-w-0">
        <MDXEditor
          ref={editorRef}
          markdown={content}
          onChange={onChange}
          className="h-full"
          contentEditableClassName="prose prose-sm max-w-none dark:prose-invert py-4 px-8"
          plugins={plugins}
        />
      </ScrollArea>
    </div>
  );
}
`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-2-j61\source-snapshots\web\src\pages\superuser\PlanDocumentPane.tsx`

`$ext
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import type { PlanArtifactSummary } from './planTrackerModel';

type Props = {
  artifact: PlanArtifactSummary | null;
  content: string;
  diffMarkdown: string;
  fileKey: string;
  viewMode: MdxViewMode;
  dirty: boolean;
  hasDirectory: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onOpenPlansDirectory: () => void;
};

const VIEW_MODE_OPTIONS = [
  { value: 'rich-text', label: 'Edit' },
  { value: 'preview', label: 'Preview' },
  { value: 'source', label: 'Source' },
  { value: 'diff', label: 'Diff' },
];

export function PlanDocumentPane({
  artifact,
  content,
  diffMarkdown,
  fileKey,
  viewMode,
  dirty,
  hasDirectory,
  onChange,
  onSave,
  onOpenPlansDirectory,
}: Props) {
  const title = artifact?.title ?? 'No artifact selected';
  const pathLabel = artifact?.path ?? 'Choose a plan from the lifecycle navigator to open its controlling artifact.';

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-document-pane">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Document Workspace</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              MDX-backed plan artifact editing, preview, and save surface
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPlansDirectory}
          >
            {hasDirectory ? 'Reconnect Plans Directory' : 'Open Plans Directory'}
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{pathLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={dirty ? 'default' : 'outline'} size="sm">
              {dirty ? 'Unsaved' : artifact ? 'Saved' : 'Idle'}
            </Badge>
            <Badge variant="outline" size="sm">
              {artifact?.artifactType ?? 'artifact pending'}
            </Badge>
            <Badge variant="outline" size="sm">
              {artifact ? `v${artifact.version}` : 'version pending'}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!artifact}
              onClick={onSave}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <SegmentedControl
            data={VIEW_MODE_OPTIONS}
            value={viewMode}
            size="sm"
            disabled={!artifact}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {artifact ? (
          <MdxEditorSurface
            content={content}
            diffMarkdown={diffMarkdown}
            fileKey={fileKey}
            viewMode={viewMode}
            onChange={onChange}
            onSave={onSave}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 py-6">
            <div className="w-full max-w-2xl rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Select a plan artifact to begin editing</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The document workspace stays visible before selection so the route reads as an MDX-backed editing surface.
              </p>
              {!hasDirectory ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Open the repository&apos;s <span className="font-mono">docs/plans</span> directory from the navigator to populate this workspace.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-2-j61\source-snapshots\web\src\pages\superuser\PlanDocumentPreview.tsx`

`$ext
import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

type Props = {
  title: string;
  markdown: string;
};

function stripLeadingFrontmatter(markdown: string) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

export function PlanDocumentPreview({ title, markdown }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" data-testid="plan-document-preview">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Document Surface</h2>
        <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <article className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkFrontmatter, remarkGfm]}>
            {stripLeadingFrontmatter(markdown)}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-2-j61\source-snapshots\web\src\pages\superuser\PlanMetadataPane.tsx`

`$ext
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { normalizeLifecycleState, type PlanArtifactSummary, type PlanUnit, type WorkflowActionId } from './planTrackerModel';

type WorkflowActionOption = {
  id: WorkflowActionId;
  label: string;
};

type Props = {
  plan?: PlanUnit | null;
  artifact?: PlanArtifactSummary | null;
  dirty?: boolean;
  availableActions?: WorkflowActionOption[];
  onAction?: (actionId: WorkflowActionId) => void;
  onCreateNote?: (input: { title: string; body: string }) => void;
  pendingAction?: { actionId: WorkflowActionId } | null;
  onResolvePendingAction?: (choice: 'save' | 'discard' | 'cancel') => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function InfoBadge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'status' | 'type';
}) {
  const variant = tone === 'status' ? 'default' : 'outline';
  return (
    <Badge variant={variant} size="sm">
      {children}
    </Badge>
  );
}

function Field({
  label,
  value,
  editable = false,
}: {
  label: string;
  value: string | undefined | null;
  editable?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <span
          className={[
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            editable
              ? 'bg-muted text-muted-foreground'
              : 'border border-border bg-background text-muted-foreground',
          ].join(' ')}
        >
          {editable ? 'Editable' : 'Read only'}
        </span>
      </div>
      <div className="text-sm text-foreground">{value && value.length > 0 ? value : '--'}</div>
    </div>
  );
}

function TagsRow({ tags }: { tags: string[] }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Tags
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" size="sm">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '--';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function PlanMetadataPane({
  plan,
  artifact,
  dirty = false,
  availableActions = [],
  onAction,
  onCreateNote,
  pendingAction = null,
  onResolvePendingAction,
}: Props) {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const hasSelection = Boolean(plan && artifact);

  const relatedArtifacts = useMemo(
    () => artifact?.metadata.relatedArtifacts ?? [],
    [artifact?.metadata.relatedArtifacts],
  );

  const lifecycle = normalizeLifecycleState(artifact?.status);
  const summaryTitle = artifact?.title ?? 'No artifact selected';
  const owner = artifact?.metadata.owner ?? plan?.artifacts[0]?.metadata.owner ?? '--';
  const reviewer = artifact?.metadata.reviewer ?? plan?.artifacts[0]?.metadata.reviewer ?? '--';
  const tags = artifact?.metadata.tags ?? ['tag pending', 'tag pending'];
  const metadataNotes = artifact?.metadata.notes ?? 'Notes metadata will appear here once a tracker artifact is selected.';
  const visibleActions = hasSelection
    ? availableActions
    : [
        { id: 'start-work', label: 'Start Work' },
        { id: 'submit-for-review', label: 'Submit for Review' },
        { id: 'approve', label: 'Approve' },
        { id: 'mark-implemented', label: 'Mark Implemented' },
      ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-metadata-pane">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Metadata, lifecycle actions, and artifact-backed notes
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          <Section title="Summary">
            <div>
              <div className="text-base font-semibold text-foreground">{summaryTitle}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <InfoBadge tone="status">{hasSelection ? lifecycle : 'status pending'}</InfoBadge>
                <InfoBadge tone="type">{artifact?.artifactType ?? 'artifact pending'}</InfoBadge>
                <InfoBadge>{artifact ? `v${artifact.version}` : 'version pending'}</InfoBadge>
              </div>
            </div>
          </Section>

          <Section title="Classification">
            <div className="grid gap-3">
              <Field label="Product L1" value={artifact?.metadata.productL1 ?? plan?.productArea ?? '--'} editable />
              <Field label="Product L2" value={artifact?.metadata.productL2 ?? plan?.functionalArea ?? '--'} editable />
              <Field label="Product L3" value={artifact?.metadata.productL3 ?? '--'} editable />
              <Field label="Plan ID" value={plan?.planId ?? '--'} />
              <Field label="Owner" value={owner} editable />
              <Field label="Reviewer" value={reviewer} editable />
              <TagsRow tags={tags} />
            </div>
          </Section>

          <Section title="Timeline">
            <div className="grid gap-3">
              <Field label="Created" value={formatDate(artifact?.metadata.createdAt)} />
              <Field label="Updated" value={formatDate(artifact?.metadata.updatedAt)} />
              <Field label="Supersedes" value={artifact?.metadata.supersedesArtifactId ?? '--'} />
              <Field
                label="Lineage"
                value={relatedArtifacts.length ? `${relatedArtifacts.length} related artifact(s)` : '--'}
              />
            </div>
          </Section>

          <Section title="Workflow Actions">
            <div className="space-y-2">
              {visibleActions.length > 0 ? (
                visibleActions.map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasSelection || !onAction || !availableActions.some((candidate) => candidate.id === action.id)}
                    onClick={() => onAction?.(action.id)}
                    className="w-full justify-start"
                  >
                    {action.label}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No workflow actions are available for this lifecycle state.
                </p>
              )}
            </div>

            {pendingAction ? (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
                <div className="text-sm font-medium text-foreground">Resolve pending action</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dirty
                    ? `Unsaved edits must be resolved before ${pendingAction.actionId}.`
                    : `Continue ${pendingAction.actionId}.`}
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => onResolvePendingAction?.('save')}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => onResolvePendingAction?.('discard')}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => onResolvePendingAction?.('cancel')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {!hasSelection
                  ? 'Select a plan artifact to enable lifecycle actions. The workflow area stays visible so the route reads as an approval and implementation tool immediately.'
                  : dirty
                  ? 'Unsaved edits will trigger the dirty-action gate before workflow side effects occur.'
                  : 'Workflow actions update the controlling plan artifact and may create note artifacts.'}
              </p>
            )}
          </Section>

          <Section title="Notes / Action Composer">
            <div className="space-y-2">
              <Field label="Notes" value={metadataNotes} editable />
              <Input
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Note title"
                disabled={!hasSelection || !onCreateNote}
              />
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Write a structured note that should become a real artifact file..."
                rows={5}
                disabled={!hasSelection || !onCreateNote}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!hasSelection || !onCreateNote || !noteTitle.trim() || !noteBody.trim()}
                onClick={() => {
                  onCreateNote?.({ title: noteTitle.trim(), body: noteBody.trim() });
                  setNoteTitle('');
                  setNoteBody('');
                }}
              >
                Create note artifact
              </Button>
            </div>
          </Section>

          <Section title="Related Artifacts">
            {relatedArtifacts.length ? (
              <div className="space-y-2">
                {relatedArtifacts.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No related artifacts recorded yet.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-2-j61\source-snapshots\web\src\pages\superuser\PlanStateNavigator.tsx`

`$ext
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  normalizeLifecycleState,
  type LifecycleState,
  type PlanArtifactSummary,
  type PlanUnit,
} from './planTrackerModel';

const LIFECYCLE_TABS: Array<{ id: LifecycleState; label: string }> = [
  { id: 'to-do', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'under-review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'implemented', label: 'Implemented' },
  { id: 'verified', label: 'Verified' },
  { id: 'closed', label: 'Closed' },
];

type PlanStateNavigatorProps = {
  activeState: LifecycleState;
  onChangeState: (state: LifecycleState) => void;
  planUnits: PlanUnit[];
  loading?: boolean;
  error?: string;
  hasDirectory?: boolean;
  selectedPlanId: string | null;
  selectedArtifactId: string | null;
  onSelectPlan: (planId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
  onOpenPlansDirectory?: () => void;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '--';

  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function artifactTypeLabel(value: string) {
  return value.replace(/-/g, ' ');
}

function getArtifactTimestamp(artifact: PlanArtifactSummary) {
  return artifact.metadata.updatedAt ?? artifact.metadata.createdAt ?? null;
}

export function PlanStateNavigator({
  activeState,
  onChangeState,
  planUnits,
  loading = false,
  error = '',
  hasDirectory = false,
  selectedPlanId,
  selectedArtifactId,
  onSelectPlan,
  onSelectArtifact,
  onOpenPlansDirectory,
}: PlanStateNavigatorProps) {
  const counts = useMemo(() => {
    const map = new Map<LifecycleState, number>();
    for (const tab of LIFECYCLE_TABS) {
      map.set(tab.id, 0);
    }

    for (const unit of planUnits) {
      const resolved = normalizeLifecycleState(unit.status);
      map.set(resolved, (map.get(resolved) ?? 0) + 1);
    }

    return map;
  }, [planUnits]);

  const filteredPlans = useMemo(
    () => planUnits.filter((unit) => normalizeLifecycleState(unit.status) === activeState),
    [activeState, planUnits],
  );

  const activeLabel = LIFECYCLE_TABS.find((tab) => tab.id === activeState)?.label ?? 'Current State';

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-state-navigator">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Plans</h2>
        <p className="mt-1 text-xs text-muted-foreground">Lifecycle-driven tracker view</p>
      </div>

      <div className="border-b border-border px-2 py-2">
        <div className="grid grid-cols-2 gap-1 xl:grid-cols-1">
          {LIFECYCLE_TABS.map((tab) => {
            const selected = tab.id === activeState;
            const count = counts.get(tab.id) ?? 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeState(tab.id)}
                className={[
                  'flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
              >
                <span className="font-medium">{tab.label}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="space-y-3 px-2 py-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-lg border border-border bg-background px-3 py-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div className="w-full max-w-xs rounded-lg border border-dashed border-border bg-background px-4 py-5">
              <p className="text-sm font-medium text-foreground">
                {hasDirectory ? `No plans in ${activeLabel}` : 'Open the plans directory to start'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasDirectory
                  ? 'Switch lifecycle tabs or verify metadata normalization for this directory.'
                  : 'The navigator stays visible before selection so the route reads as a lifecycle-driven tracker.'}
              </p>
              {!hasDirectory && onOpenPlansDirectory ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onOpenPlansDirectory}
                >
                  Open Plans Directory
                </Button>
              ) : null}
              {error ? (
                <p className="mt-3 text-xs text-destructive">{error}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPlans.map((plan) => {
              const selectedPlan = plan.planId === selectedPlanId;

              return (
                <div
                  key={plan.planId}
                  className={[
                    'rounded-lg border transition-colors',
                    selectedPlan ? 'border-primary/30 bg-primary/5' : 'border-border bg-background',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan.planId)}
                    className="w-full px-3 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{plan.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{plan.artifacts.length} artifacts</span>
                          {plan.productArea ? <span>{plan.productArea}</span> : null}
                          {plan.functionalArea ? <span>{plan.functionalArea}</span> : null}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {normalizeLifecycleState(plan.status)}
                      </span>
                    </div>
                  </button>

                  {selectedPlan ? (
                    <div className="border-t border-border px-2 py-2">
                      <div className="space-y-1">
                        {plan.artifacts.map((artifact) => {
                          const selectedArtifact = artifact.artifactId === selectedArtifactId;

                          return (
                            <button
                              key={artifact.artifactId}
                              type="button"
                              onClick={() => onSelectArtifact(artifact.artifactId)}
                              className={[
                                'flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors',
                                selectedArtifact
                                  ? 'bg-accent text-foreground'
                                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                              ].join(' ')}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{artifact.title}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                                  <span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
                                    {artifactTypeLabel(artifact.artifactType)}
                                  </span>
                                  <span>v{artifact.version}</span>
                                  <span>{formatTimestamp(getArtifactTimestamp(artifact))}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-2-j61\source-snapshots\web\src\pages\superuser\PlanTracker.tsx`

`$ext
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Workbench } from '@/components/workbench/Workbench';

import {
  PLAN_TRACKER_DEFAULT_PANES,
  PLAN_TRACKER_TABS,
  usePlanTracker,
} from './usePlanTracker';

export function Component() {
  useShellHeaderTitle({ title: 'Plan Tracker', breadcrumbs: ['Superuser'] });

  const tracker = usePlanTracker();

  return (
    <div className="h-full w-full min-h-0 p-2" data-testid="plan-tracker-shell">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={PLAN_TRACKER_TABS}
          defaultPanes={PLAN_TRACKER_DEFAULT_PANES}
          saveKey="plan-tracker-layout-v2"
          renderContent={tracker.renderContent}
          hideToolbar
          maxColumns={3}
          minColumns={3}
          maxTabsPerPane={1}
          disableDrag
          lockLayout
        />
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-2-j61\source-snapshots\web\src\pages\superuser\usePlanTracker.tsx`

`$ext
/* eslint-disable react-refresh/only-export-components */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChecklist, IconListDetails, IconNotes } from '@tabler/icons-react';

import {
  createFile,
  type FsNode,
  pickDirectory,
  readDirectory,
  readFileContent,
  restoreDirectoryHandle,
  saveDirectoryHandle,
  writeFileContent,
} from '@/lib/fs-access';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';

import { type MdxViewMode } from './MdxEditorSurface';
import { PlanDocumentPane } from './PlanDocumentPane';
import { PlanDocumentPreview } from './PlanDocumentPreview';
import { PlanMetadataPane } from './PlanMetadataPane';
import {
  buildArtifactFilename,
  derivePlanStem,
  getAvailableWorkflowActions,
  groupPlanDocuments,
  isTrackerMetadataComplete,
  latestPlanArtifact,
  noteArtifactTypeForState,
  nextArtifactSequence,
  resolveControllingArtifact,
  resolveControllingLifecycleState,
  serializePlanTrackerDocument,
  workflowArtifactStatus,
  workflowArtifactTitle,
  workflowArtifactType,
  workflowPlanStatus,
  type LifecycleState,
  type PlanArtifactSummary,
  type PlanTrackerMetadata,
  type PlanUnit,
  type WorkflowActionId,
} from './planTrackerModel';
import { PlanStateNavigator } from './PlanStateNavigator';

export const PLAN_TRACKER_TABS = [
  { id: 'plan-state', label: 'Plans', icon: IconChecklist },
  { id: 'document', label: 'Document', icon: IconNotes },
  { id: 'metadata', label: 'Metadata', icon: IconListDetails },
];

export const PLAN_TRACKER_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['plan-state'], activeTab: 'plan-state', width: 26 },
  { id: 'pane-2', tabs: ['document'], activeTab: 'document', width: 52 },
  { id: 'pane-3', tabs: ['metadata'], activeTab: 'metadata', width: 22 },
]);

function flattenMarkdownNodes(nodes: FsNode[]): FsNode[] {
  const results: FsNode[] = [];

  for (const node of nodes) {
    if (node.kind === 'file' && (node.extension === '.md' || node.extension === '.mdx')) {
      results.push(node);
      continue;
    }
    if (node.kind === 'directory' && node.children) {
      results.push(...flattenMarkdownNodes(node.children));
    }
  }

  return results;
}

function findDefaultArtifact(plan: PlanUnit | null) {
  return (plan ? resolveControllingArtifact(plan) : null) ?? plan?.artifacts[0] ?? null;
}

type PendingWorkflowAction = {
  actionId: WorkflowActionId;
};

type PendingActionChoice = 'save' | 'discard' | 'cancel';

type PendingActionResolution = {
  actionId: string | null;
  shouldProceed: boolean;
  resolution: PendingActionChoice;
};

type UsePlanTrackerResult = {
  planUnits: PlanUnit[];
  selectedPlan: PlanUnit | null;
  selectedArtifact: PlanArtifactSummary | null;
  activeState: LifecycleState;
  documentContent: string;
  dirty: boolean;
  pendingAction: PendingWorkflowAction | null;
  loading: boolean;
  error: string;
  openPlansDirectory: () => Promise<void>;
  selectPlan: (planId: string) => void;
  selectArtifact: (artifactId: string) => void;
  setDocumentContent: (value: string) => void;
  requestWorkflowAction: (actionId: WorkflowActionId) => boolean;
  runWorkflowAction: (actionId: WorkflowActionId) => Promise<boolean>;
  resolvePendingAction: (choice: PendingActionChoice) => Promise<PendingActionResolution>;
  saveCurrentDocument: () => Promise<void>;
  renderContent: (tabId: string) => React.ReactNode;
};

function siblingPath(path: string, fileName: string) {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash === -1 ? fileName : `${path.slice(0, lastSlash)}/${fileName}`;
}

function buildWorkflowArtifactBody(actionId: WorkflowActionId, title: string, planTitle: string) {
  switch (actionId) {
    case 'start-work':
      return `# ${planTitle}\n\nWork has started.\n`;
    case 'submit-for-review':
      return `# ${planTitle}\n\nSubmitted for review.\n`;
    case 'send-back':
      return `# ${title}\n\n## Summary\n\nAdd review feedback for ${planTitle}.\n`;
    case 'approve':
      return `# ${title}\n\n## Summary\n\nAdd approval notes for ${planTitle}.\n`;
    case 'mark-implementing':
    case 'mark-implemented':
      return `# ${title}\n\n## Summary\n\nDocument implementation progress for ${planTitle}.\n`;
    case 'request-verification':
      return `# ${title}\n\n## Summary\n\nDocument verification notes for ${planTitle}.\n`;
    case 'close':
      return `# ${title}\n\n## Summary\n\nDocument closure notes for ${planTitle}.\n`;
  }
}

export function usePlanTracker(storeKey = 'plan-tracker-dir'): UsePlanTrackerResult {
  const [planUnits, setPlanUnits] = useState<PlanUnit[]>([]);
  const [activeState, setActiveState] = useState<LifecycleState>('to-do');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [documentContent, setDocumentContentState] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [fileKey, setFileKey] = useState('plan-tracker-empty');
  const [pendingAction, setPendingAction] = useState<PendingWorkflowAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode] = useState<MdxViewMode>('rich-text');

  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const artifactNodeMapRef = useRef<Map<string, FsNode>>(new Map());
  const activeStateRef = useRef<LifecycleState>('to-do');
  const selectedPlanIdRef = useRef<string | null>(null);
  const selectedArtifactIdRef = useRef<string | null>(null);

  const selectedPlan = useMemo(
    () => planUnits.find((plan) => plan.planId === selectedPlanId) ?? null,
    [planUnits, selectedPlanId],
  );

  const selectedArtifact = useMemo(
    () => selectedPlan?.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ?? null,
    [selectedArtifactId, selectedPlan],
  );

  const dirty = documentContent !== originalContent;
  const hasDirectory = Boolean(directoryHandleRef.current);

  useEffect(() => {
    activeStateRef.current = activeState;
  }, [activeState]);

  useEffect(() => {
    selectedPlanIdRef.current = selectedPlanId;
  }, [selectedPlanId]);

  useEffect(() => {
    selectedArtifactIdRef.current = selectedArtifactId;
  }, [selectedArtifactId]);

  const clearSelection = useCallback(() => {
    setSelectedPlanId(null);
    setSelectedArtifactId(null);
    setDocumentContentState('');
    setOriginalContent('');
    setFileKey('plan-tracker-empty');
    setPendingAction(null);
  }, []);

  const syncSelection = useCallback(
    (nextPlans: PlanUnit[], preferredPlanId?: string | null, preferredArtifactId?: string | null) => {
      if (nextPlans.length === 0) {
        clearSelection();
        return;
      }

      const currentState = activeStateRef.current;
      const currentSelectedPlanId = selectedPlanIdRef.current;
      const currentSelectedArtifactId = selectedArtifactIdRef.current;
      const preferredPlan = preferredPlanId
        ? nextPlans.find((plan) => plan.planId === preferredPlanId) ?? null
        : null;
      const visiblePlans = nextPlans.filter((plan) => resolveControllingLifecycleState(plan) === currentState);
      if (!preferredPlan && visiblePlans.length === 0 && !currentSelectedPlanId) {
        clearSelection();
        setActiveState(currentState);
        return;
      }

      const nextPlan =
        preferredPlan ??
        visiblePlans.find((plan) => plan.planId === currentSelectedPlanId) ??
        visiblePlans[0] ??
        nextPlans[0] ??
        null;
      const nextArtifact =
        nextPlan?.artifacts.find((artifact) => artifact.artifactId === preferredArtifactId) ??
        nextPlan?.artifacts.find((artifact) => artifact.artifactId === currentSelectedArtifactId) ??
        findDefaultArtifact(nextPlan);

      setSelectedPlanId(nextPlan?.planId ?? null);
      setSelectedArtifactId(nextArtifact?.artifactId ?? null);
      setActiveState(nextPlan ? resolveControllingLifecycleState(nextPlan) : currentState);
      setDocumentContentState(nextArtifact?.content ?? '');
      setOriginalContent(nextArtifact?.content ?? '');
      setFileKey(nextArtifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [clearSelection],
  );

  const loadFromHandle = useCallback(
    async (handle: FileSystemDirectoryHandle, preferredPlanId?: string | null, preferredArtifactId?: string | null) => {
      setLoading(true);
      setError('');
      directoryHandleRef.current = handle;

      try {
        const tree = await readDirectory(handle);
        const markdownNodes = flattenMarkdownNodes(tree);
        const artifactNodes = new Map<string, FsNode>();
        const documents = await Promise.all(
          markdownNodes.map(async (node) => {
            const content = await readFileContent(node.handle as FileSystemFileHandle);
            return { path: node.path, content, node };
          }),
        );

        const grouped = groupPlanDocuments(documents.map(({ path, content }) => ({ path, content })));

        for (const document of documents) {
          const pathArtifactId = `${document.path.replace(/\\/g, '/')}`;
          artifactNodes.set(pathArtifactId, document.node);
        }

        const nodeMap = new Map<string, FsNode>();
        for (const plan of grouped) {
          for (const artifact of plan.artifacts) {
            const node = documents.find((entry) => entry.path.replace(/\\/g, '/') === artifact.path)?.node;
            if (node) {
              nodeMap.set(artifact.artifactId, node);
            }
          }
        }

        artifactNodeMapRef.current = nodeMap;
        setPlanUnits(grouped);
        syncSelection(grouped, preferredPlanId, preferredArtifactId);
      } catch (err) {
        setPlanUnits([]);
        setError(err instanceof Error ? err.message : 'Failed to load plans directory');
      } finally {
        setLoading(false);
      }
    },
    [syncSelection],
  );

  useEffect(() => {
    restoreDirectoryHandle(storeKey).then(async (handle) => {
      if (!handle) {
        setLoading(false);
        return;
      }

      try {
        const permissionHandle = handle as FileSystemDirectoryHandle & {
          queryPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
        };
        const permission = await permissionHandle.queryPermission?.({ mode: 'readwrite' });
        if (permission === 'granted') {
          await loadFromHandle(handle);
          return;
        }
      } catch {
        // fall through to unloaded state
      }

      setLoading(false);
    });
  }, [loadFromHandle, storeKey]);

  const openPlansDirectory = useCallback(async () => {
    const handle = await pickDirectory();
    await saveDirectoryHandle(handle, storeKey);
    await loadFromHandle(handle);
  }, [loadFromHandle, storeKey]);

  const selectState = useCallback(
    (nextState: LifecycleState) => {
      const plansInState = planUnits.filter((plan) => resolveControllingLifecycleState(plan) === nextState);
      if (plansInState.length === 0) {
        clearSelection();
        setActiveState(nextState);
        return;
      }

      setActiveState(nextState);

      const nextPlan =
        plansInState.find((plan) => plan.planId === selectedPlanId) ??
        plansInState[0] ??
        null;
      const nextArtifact =
        nextPlan?.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ??
        findDefaultArtifact(nextPlan);

      setSelectedPlanId(nextPlan?.planId ?? null);
      setSelectedArtifactId(nextArtifact?.artifactId ?? null);
      setDocumentContentState(nextArtifact?.content ?? '');
      setOriginalContent(nextArtifact?.content ?? '');
      setFileKey(nextArtifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [clearSelection, planUnits, selectedArtifactId, selectedPlanId],
  );

  const selectPlan = useCallback(
    (planId: string) => {
      const plan = planUnits.find((entry) => entry.planId === planId) ?? null;
      const artifact = findDefaultArtifact(plan);
      setSelectedPlanId(plan?.planId ?? null);
      setSelectedArtifactId(artifact?.artifactId ?? null);
      setActiveState(plan ? resolveControllingLifecycleState(plan) : activeState);
      setDocumentContentState(artifact?.content ?? '');
      setOriginalContent(artifact?.content ?? '');
      setFileKey(artifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [activeState, planUnits],
  );

  const selectArtifact = useCallback(
    (artifactId: string) => {
      const artifact = selectedPlan?.artifacts.find((entry) => entry.artifactId === artifactId) ?? null;
      setSelectedArtifactId(artifact?.artifactId ?? null);
      setDocumentContentState(artifact?.content ?? '');
      setOriginalContent(artifact?.content ?? '');
      setFileKey(artifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [selectedPlan],
  );

  const setDocumentContent = useCallback((value: string) => {
    setDocumentContentState(value);
  }, []);

  const buildNormalizedMetadata = useCallback((
    artifact: PlanArtifactSummary,
    overrides: Partial<PlanTrackerMetadata> = {},
    planContext?: PlanUnit | null,
  ): PlanTrackerMetadata => {
    const scope = planContext ?? selectedPlan;
    const title = overrides.title ?? artifact.metadata.title ?? artifact.title;
    const createdAt =
      overrides.createdAt ??
      artifact.metadata.createdAt ??
      artifact.metadata.updatedAt ??
      new Date().toISOString();
    return {
      ...artifact.metadata,
      title,
      description:
        overrides.description ??
        artifact.metadata.description ??
        `${title} artifact for ${artifact.planId}.`,
      planId: overrides.planId ?? artifact.planId,
      artifactType: overrides.artifactType ?? artifact.artifactType,
      status: overrides.status ?? artifact.status,
      version: overrides.version ?? artifact.version,
      createdAt,
      updatedAt: overrides.updatedAt ?? new Date().toISOString(),
      productArea: overrides.productArea ?? artifact.metadata.productArea ?? scope?.productArea,
      functionalArea: overrides.functionalArea ?? artifact.metadata.functionalArea ?? scope?.functionalArea,
      productL1: overrides.productL1 ?? artifact.metadata.productL1,
      productL2: overrides.productL2 ?? artifact.metadata.productL2,
      productL3: overrides.productL3 ?? artifact.metadata.productL3,
      priority: overrides.priority ?? artifact.metadata.priority,
      owner: overrides.owner ?? artifact.metadata.owner,
      reviewer: overrides.reviewer ?? artifact.metadata.reviewer,
      trackerId: overrides.trackerId ?? artifact.metadata.trackerId,
      tags: overrides.tags ?? artifact.metadata.tags,
      supersedesArtifactId: overrides.supersedesArtifactId ?? artifact.metadata.supersedesArtifactId,
      relatedArtifacts: overrides.relatedArtifacts ?? artifact.metadata.relatedArtifacts,
      notes: overrides.notes ?? artifact.metadata.notes,
    };
  }, [selectedPlan]);

  const availableActions = useMemo(
    () => (selectedPlan ? getAvailableWorkflowActions(selectedPlan) : []),
    [selectedPlan],
  );

  const isActionAvailable = useCallback(
    (actionId: WorkflowActionId) =>
      Boolean(selectedPlan && getAvailableWorkflowActions(selectedPlan).some((action) => action.id === actionId)),
    [selectedPlan],
  );

  const writeExistingArtifact = useCallback(async (
    artifact: PlanArtifactSummary,
    metadata: PlanTrackerMetadata,
    body?: string,
  ) => {
    const node = artifactNodeMapRef.current.get(artifact.artifactId);
    if (!node || node.kind !== 'file') {
      throw new Error('Tracker artifact is not writable.');
    }

    const content = serializePlanTrackerDocument(metadata, body ?? artifact.body);
    await writeFileContent(node.handle as FileSystemFileHandle, content);
    return { node, content };
  }, []);

  const createNoteArtifact = useCallback(async ({ title, body }: { title: string; body: string }) => {
    if (!selectedPlan || !selectedArtifact) {
      return;
    }

    const controllingArtifact = resolveControllingArtifact(selectedPlan) ?? selectedArtifact;
    const currentState = resolveControllingLifecycleState(selectedPlan);
    const artifactType = noteArtifactTypeForState(currentState);
    const sequence = nextArtifactSequence(selectedPlan.artifacts, artifactType, controllingArtifact.version);
    const selectedArtifactNode = artifactNodeMapRef.current.get(selectedArtifact.artifactId);

    if (!selectedArtifactNode || selectedArtifactNode.kind !== 'file' || !selectedArtifactNode.parentHandle) {
      throw new Error('Selected artifact parent directory is not writable.');
    }

    const timestamp = new Date().toISOString();
    const fileName = buildArtifactFilename({
      planStem: derivePlanStem(controllingArtifact.path),
      artifactType,
      version: controllingArtifact.version,
      sequence,
    });
    const newHandle = await createFile(selectedArtifactNode.parentHandle, fileName);
    const noteMetadata: PlanTrackerMetadata = {
      title,
      description: `${title} for ${selectedPlan.title}.`,
      planId: selectedPlan.planId,
      artifactType,
      status: currentState,
      version: controllingArtifact.version,
      createdAt: timestamp,
      updatedAt: timestamp,
      productArea: selectedPlan.productArea ?? selectedArtifact.metadata.productArea,
      functionalArea: selectedPlan.functionalArea ?? selectedArtifact.metadata.functionalArea,
      productL1: selectedArtifact.metadata.productL1,
      productL2: selectedArtifact.metadata.productL2,
      productL3: selectedArtifact.metadata.productL3,
      owner: selectedArtifact.metadata.owner,
      reviewer: selectedArtifact.metadata.reviewer,
      trackerId: selectedArtifact.metadata.trackerId,
      tags: selectedArtifact.metadata.tags,
      relatedArtifacts: [selectedArtifact.path],
      notes: selectedArtifact.metadata.notes,
    };

    await writeFileContent(newHandle, serializePlanTrackerDocument(noteMetadata, `# ${title}\n\n${body}\n`));

    if (directoryHandleRef.current) {
      await loadFromHandle(
        directoryHandleRef.current,
        selectedPlan.planId,
        `${selectedPlan.planId}:${siblingPath(selectedArtifact.path, fileName)}`,
      );
    }
  }, [loadFromHandle, selectedArtifact, selectedPlan]);

  const executeWorkflowAction = useCallback(async (actionId: WorkflowActionId) => {
    if (!selectedPlan || !selectedArtifact || !isActionAvailable(actionId)) {
      return false;
    }

    const timestamp = new Date().toISOString();
    const selectedArtifactMetadata = buildNormalizedMetadata(
      selectedArtifact,
      isTrackerMetadataComplete(selectedArtifact) ? { updatedAt: timestamp } : { updatedAt: timestamp },
      selectedPlan,
    );

    if (!isTrackerMetadataComplete(selectedArtifact)) {
      await writeExistingArtifact(selectedArtifact, selectedArtifactMetadata, documentContent);
    }

    const targetPlanArtifact = resolveControllingArtifact(selectedPlan) ?? latestPlanArtifact(selectedPlan.artifacts) ?? selectedArtifact;
    const planStatus = workflowPlanStatus(actionId);
    const artifactType = workflowArtifactType(actionId);
    const artifactVersion = targetPlanArtifact.version;

    const updatedPlanMetadata = buildNormalizedMetadata(
      targetPlanArtifact,
      { status: planStatus, updatedAt: timestamp },
      selectedPlan,
    );
    const targetPlanBody =
      targetPlanArtifact.artifactId === selectedArtifact.artifactId ? documentContent : targetPlanArtifact.body;
    await writeExistingArtifact(targetPlanArtifact, updatedPlanMetadata, targetPlanBody);

    if (artifactType === 'plan') {
      if (directoryHandleRef.current) {
        await loadFromHandle(
          directoryHandleRef.current,
          selectedPlan.planId,
          targetPlanArtifact.artifactId,
        );
      }

      return true;
    }

    const selectedArtifactNode = artifactNodeMapRef.current.get(selectedArtifact.artifactId);
    if (!selectedArtifactNode || selectedArtifactNode.kind !== 'file' || !selectedArtifactNode.parentHandle) {
      throw new Error('Selected artifact parent directory is not writable.');
    }

    const sequence = nextArtifactSequence(selectedPlan.artifacts, artifactType, artifactVersion);
    const artifactTitle = workflowArtifactTitle(actionId, selectedPlan.title, artifactVersion, sequence);
    const artifactBody = buildWorkflowArtifactBody(actionId, artifactTitle, selectedPlan.title);
    const artifactStatus = workflowArtifactStatus(actionId);

    const fileName = buildArtifactFilename({
      planStem: derivePlanStem(targetPlanArtifact.path),
      artifactType,
      version: artifactVersion,
      sequence,
    });
    const newHandle = await createFile(selectedArtifactNode.parentHandle, fileName);
    const artifactMetadata: PlanTrackerMetadata = {
      title: artifactTitle,
      description: `${artifactTitle} for ${selectedPlan.title}.`,
      planId: selectedPlan.planId,
      artifactType,
      status: artifactStatus,
      version: artifactVersion,
      createdAt: timestamp,
      productArea: selectedPlan.productArea ?? selectedArtifact.metadata.productArea,
      functionalArea: selectedPlan.functionalArea ?? selectedArtifact.metadata.functionalArea,
      productL1: selectedArtifact.metadata.productL1,
      productL2: selectedArtifact.metadata.productL2,
      productL3: selectedArtifact.metadata.productL3,
      updatedAt: timestamp,
      priority: selectedArtifact.metadata.priority,
      owner: selectedArtifact.metadata.owner,
      reviewer: selectedArtifact.metadata.reviewer,
      trackerId: selectedArtifact.metadata.trackerId,
      tags: selectedArtifact.metadata.tags,
      relatedArtifacts: [targetPlanArtifact.path],
      notes: selectedArtifact.metadata.notes,
    };
    await writeFileContent(newHandle, serializePlanTrackerDocument(artifactMetadata, artifactBody));

    if (directoryHandleRef.current) {
      await loadFromHandle(
        directoryHandleRef.current,
        selectedPlan.planId,
        `${selectedPlan.planId}:${siblingPath(targetPlanArtifact.path, fileName)}`,
      );
    }

    return true;
  }, [buildNormalizedMetadata, documentContent, isActionAvailable, loadFromHandle, selectedArtifact, selectedPlan, writeExistingArtifact]);

  const requestWorkflowAction = useCallback((actionId: WorkflowActionId) => {
    if (!isActionAvailable(actionId)) {
      return false;
    }

    if (!dirty) {
      return true;
    }

    setPendingAction({ actionId });
    return false;
  }, [dirty, isActionAvailable]);

  const runWorkflowAction = useCallback(async (actionId: WorkflowActionId) => {
    if (!requestWorkflowAction(actionId)) {
      return false;
    }

    await executeWorkflowAction(actionId);
    return true;
  }, [executeWorkflowAction, requestWorkflowAction]);

  const saveCurrentDocument = useCallback(async () => {
    if (!selectedArtifact || !dirty) return;

    const node = artifactNodeMapRef.current.get(selectedArtifact.artifactId);
    if (!node || node.kind !== 'file') {
      throw new Error('Selected artifact is not writable.');
    }

    await writeFileContent(node.handle as FileSystemFileHandle, documentContent);
    setOriginalContent(documentContent);

    if (directoryHandleRef.current) {
      await loadFromHandle(directoryHandleRef.current, selectedPlan?.planId ?? null, selectedArtifact.artifactId);
    }
  }, [dirty, documentContent, loadFromHandle, selectedArtifact, selectedPlan?.planId]);

  const resolvePendingAction = useCallback(async (choice: PendingActionChoice): Promise<PendingActionResolution> => {
    const actionId = pendingAction?.actionId ?? null;
    if (!actionId) {
      return {
        actionId: null,
        shouldProceed: false,
        resolution: choice,
      };
    }

    if (choice === 'cancel') {
      setPendingAction(null);
      return {
        actionId,
        shouldProceed: false,
        resolution: 'cancel',
      };
    }

    if (choice === 'discard') {
      setDocumentContentState(originalContent);
      setPendingAction(null);
      await executeWorkflowAction(actionId);
      return {
        actionId,
        shouldProceed: true,
        resolution: 'discard',
      };
    }

    await saveCurrentDocument();
    setPendingAction(null);
    await executeWorkflowAction(actionId);
    setPendingAction(null);
    return {
      actionId,
      shouldProceed: true,
      resolution: 'save',
    };
  }, [executeWorkflowAction, originalContent, pendingAction, saveCurrentDocument]);

  // Phase 2 keeps pane scaffolds mounted; legacy whole-pane empty replacement stays disabled.
  const showLegacyPaneFallback = false;

  const renderContent = useCallback(
    (tabId: string) => {
      if (tabId === 'plan-state') {
        if (!planUnits.length && showLegacyPaneFallback) {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading plans directoryâ€¦' : 'Open the docs/plans directory to start the tracker.'}
              </p>
              {!loading && (
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium"
                  onClick={() => void openPlansDirectory()}
                >
                  Open Plans Directory
                </button>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        }

        return (
          <PlanStateNavigator
            activeState={activeState}
            onChangeState={selectState}
            planUnits={planUnits}
            loading={loading}
            error={error}
            hasDirectory={hasDirectory}
            selectedPlanId={selectedPlan?.planId ?? null}
            selectedArtifactId={selectedArtifact?.artifactId ?? null}
            onSelectPlan={selectPlan}
            onSelectArtifact={selectArtifact}
            onOpenPlansDirectory={() => void openPlansDirectory()}
          />
        );
      }

      if (tabId === 'document') {
        return (
          <PlanDocumentPane
            artifact={selectedArtifact}
            content={documentContent}
            diffMarkdown={originalContent}
            fileKey={fileKey}
            viewMode={viewMode}
            dirty={dirty}
            hasDirectory={hasDirectory}
            onChange={setDocumentContent}
            onSave={() => void saveCurrentDocument()}
            onOpenPlansDirectory={() => void openPlansDirectory()}
          />
        );
      }

      if (tabId === 'metadata') {
        return (
          <PlanMetadataPane
            plan={selectedPlan}
            artifact={selectedArtifact}
            dirty={dirty}
            availableActions={availableActions}
            pendingAction={pendingAction}
            onAction={(actionId) => void runWorkflowAction(actionId)}
            onCreateNote={(input) => void createNoteArtifact(input)}
            onResolvePendingAction={(choice) => void resolvePendingAction(choice)}
          />
        );
      }

      if (tabId === 'document-preview' && selectedArtifact) {
        return <PlanDocumentPreview title={selectedArtifact.title} markdown={documentContent} />;
      }

      return null;
    },
    [
      activeState,
      documentContent,
      dirty,
      error,
      fileKey,
      hasDirectory,
      loading,
      openPlansDirectory,
      originalContent,
      pendingAction,
      planUnits,
      availableActions,
      createNoteArtifact,
      resolvePendingAction,
      runWorkflowAction,
      saveCurrentDocument,
      selectState,
      selectArtifact,
      selectPlan,
      selectedArtifact,
      selectedPlan,
      setDocumentContent,
      showLegacyPaneFallback,
      viewMode,
    ],
  );

  return {
    planUnits,
    selectedPlan,
    selectedArtifact,
    activeState,
    documentContent,
    dirty,
    pendingAction,
    loading,
    error,
    openPlansDirectory,
    selectPlan,
    selectArtifact,
    setDocumentContent,
    requestWorkflowAction,
    runWorkflowAction,
    resolvePendingAction,
    saveCurrentDocument,
    renderContent,
  };
}

`$nl
