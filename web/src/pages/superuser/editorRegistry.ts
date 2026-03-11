import { lazy, type ComponentType } from 'react';

// ─── Shared prop contract for all editor surfaces ────────────────────────────

export type EditorSurfaceProps = {
  content: string;
  fileKey: string;
  onChange: (value: string) => void;
  onSave?: () => void;
};

// ─── View mode definitions ───────────────────────────────────────────────────

export type ViewModeEntry = {
  id: string;
  label: string;
};

// ─── Editor profile ──────────────────────────────────────────────────────────

export type EditorSurfaceId = 'mdx' | 'code' | 'tiptap';

export type EditorProfile = {
  id: EditorSurfaceId;
  /** File extensions this surface handles (e.g. '.md', '.mdx'). Empty = fallback. */
  extensions: Set<string>;
  viewModes: ViewModeEntry[];
  /** Lazy-loaded surface component. Extra props beyond EditorSurfaceProps are passed through. */
  component: ComponentType<any>;
};

// ─── Lazy-loaded surfaces ────────────────────────────────────────────────────

const MdxEditorSurface = lazy(() =>
  import('./MdxEditorSurface').then((m) => ({ default: m.MdxEditorSurface })),
);

const CodeEditorSurface = lazy(() =>
  import('./CodeEditorSurface').then((m) => ({ default: m.CodeEditorSurface })),
);

const TiptapEditorSurface = lazy(() =>
  import('./TiptapEditorSurface').then((m) => ({ default: m.TiptapEditorSurface })),
);

// ─── Registry ────────────────────────────────────────────────────────────────

const PROFILES: EditorProfile[] = [
  {
    id: 'mdx',
    extensions: new Set(['.md', '.mdx']),
    viewModes: [
      { id: 'rich-text', label: 'Rich Text' },
      { id: 'source', label: 'Source' },
      { id: 'diff', label: 'Diff' },
    ],
    component: MdxEditorSurface,
  },
  {
    id: 'tiptap',
    extensions: new Set(['.md']),
    viewModes: [
      { id: 'visual', label: 'Visual' },
      { id: 'suggest', label: 'Suggest' },
    ],
    component: TiptapEditorSurface,
  },
  {
    id: 'code',
    extensions: new Set(), // fallback — handles everything else
    viewModes: [
      { id: 'edit', label: 'Edit' },
      { id: 'diff', label: 'Diff' },
    ],
    component: CodeEditorSurface,
  },
];

const profileMap = new Map(PROFILES.map((p) => [p.id, p]));

/**
 * Resolve which editor profile to use for a given file extension and layout preference.
 *
 * - If the preferred profile supports the extension, use it.
 * - Otherwise fall back: try 'mdx' for markdown extensions, then 'code' for everything else.
 */
export function resolveEditorProfile(
  extension: string,
  preferred: EditorSurfaceId,
): EditorProfile {
  const pref = profileMap.get(preferred);
  if (pref && pref.extensions.has(extension)) return pref;

  // Fallback chain
  const mdx = profileMap.get('mdx')!;
  if (mdx.extensions.has(extension)) return mdx;

  return profileMap.get('code')!;
}
