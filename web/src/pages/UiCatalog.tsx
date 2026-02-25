import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MenuRoot,
  MenuTrigger,
  MenuIndicator,
  MenuPositioner,
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuItemGroupLabel,
  MenuSeparator,
} from '@/components/ui/menu';
import { FileUpload } from '@/components/ui/file-upload';

type Kind = 'utility' | 'component';
type Mode = 'all' | 'utilities' | 'components';
type Framework = 'react' | 'vue' | 'svelte' | 'solid';

type CatalogItem = {
  name: string;
  slug: string;
  kind: Kind;
};

const FRAMEWORKS: Framework[] = ['react', 'vue', 'svelte', 'solid'];
const EXAMPLE_BY_COMPONENT_SLUG: Record<string, string> = {
  checkbox: 'checkbox-group',
  combobox: 'combobox-with-tags-input',
  'date-picker': 'standalone-date-picker',
  dialog: 'dialog-with-tooltip',
  menu: 'menu-with-links',
  popover: 'popover-selection',
  select: 'virtualized-select',
  slider: 'slider-with-number-input',
  tabs: 'tabs-with-links',
  tooltip: 'tooltip-with-following-cursor',
};

function MenuDemo() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Basic Menu</h3>
        <MenuRoot>
          <MenuTrigger>
            Actions
            <MenuIndicator />
          </MenuTrigger>
          <MenuPositioner>
            <MenuContent>
              <MenuItem value="edit">Edit</MenuItem>
              <MenuItem value="duplicate">Duplicate</MenuItem>
              <MenuSeparator />
              <MenuItem value="archive">Archive</MenuItem>
              <MenuItem value="delete" className="text-destructive">Delete</MenuItem>
            </MenuContent>
          </MenuPositioner>
        </MenuRoot>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Grouped Menu</h3>
        <MenuRoot>
          <MenuTrigger>
            Options
            <MenuIndicator />
          </MenuTrigger>
          <MenuPositioner>
            <MenuContent>
              <MenuItemGroup>
                <MenuItemGroupLabel>File</MenuItemGroupLabel>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="save">Save</MenuItem>
              </MenuItemGroup>
              <MenuSeparator />
              <MenuItemGroup>
                <MenuItemGroupLabel>Edit</MenuItemGroupLabel>
                <MenuItem value="undo">Undo</MenuItem>
                <MenuItem value="redo">Redo</MenuItem>
              </MenuItemGroup>
            </MenuContent>
          </MenuPositioner>
        </MenuRoot>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">With Disabled Items</h3>
        <MenuRoot>
          <MenuTrigger>
            More
            <MenuIndicator />
          </MenuTrigger>
          <MenuPositioner>
            <MenuContent>
              <MenuItem value="copy">Copy</MenuItem>
              <MenuItem value="paste">Paste</MenuItem>
              <MenuItem value="cut" disabled>Cut (disabled)</MenuItem>
            </MenuContent>
          </MenuPositioner>
        </MenuRoot>
      </div>
    </div>
  );
}

function FileUploadDemo() {
  return (
    <div className="max-w-lg">
      <FileUpload
        label="Upload documents"
        description="PDF, DOCX, or TXT up to 10MB"
        accept={{ 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }}
        maxFiles={5}
      />
    </div>
  );
}

const LOCAL_DEMOS: Record<string, () => ReactNode> = {
  menu: () => <MenuDemo />,
  'file-upload': () => <FileUploadDemo />,
};

const ITEMS: CatalogItem[] = [
  { name: 'Client Only', slug: 'client-only', kind: 'utility' },
  { name: 'Download Trigger', slug: 'download-trigger', kind: 'utility' },
  { name: 'Environment', slug: 'environment', kind: 'utility' },
  { name: 'Focus Trap', slug: 'focus-trap', kind: 'utility' },
  { name: 'Format Byte', slug: 'format-byte', kind: 'utility' },
  { name: 'Format Relative Time', slug: 'format-relative-time', kind: 'utility' },
  { name: 'Frame', slug: 'frame', kind: 'utility' },
  { name: 'Highlight', slug: 'highlight', kind: 'utility' },
  { name: 'JSON Tree View', slug: 'json-tree-view', kind: 'utility' },
  { name: 'Locale', slug: 'locale', kind: 'utility' },
  { name: 'Presence', slug: 'presence', kind: 'utility' },
  { name: 'Swap', slug: 'swap', kind: 'utility' },
  { name: 'Accordion', slug: 'accordion', kind: 'component' },
  { name: 'Angle Slider', slug: 'angle-slider', kind: 'component' },
  { name: 'Avatar', slug: 'avatar', kind: 'component' },
  { name: 'Carousel', slug: 'carousel', kind: 'component' },
  { name: 'Checkbox', slug: 'checkbox', kind: 'component' },
  { name: 'Clipboard', slug: 'clipboard', kind: 'component' },
  { name: 'Collapsible', slug: 'collapsible', kind: 'component' },
  { name: 'Color Picker', slug: 'color-picker', kind: 'component' },
  { name: 'Combobox', slug: 'combobox', kind: 'component' },
  { name: 'Date Picker', slug: 'date-picker', kind: 'component' },
  { name: 'Dialog', slug: 'dialog', kind: 'component' },
  { name: 'Editable', slug: 'editable', kind: 'component' },
  { name: 'Field', slug: 'field', kind: 'component' },
  { name: 'Fieldset', slug: 'fieldset', kind: 'component' },
  { name: 'File Upload', slug: 'file-upload', kind: 'component' },
  { name: 'Floating Panel', slug: 'floating-panel', kind: 'component' },
  { name: 'Image Cropper', slug: 'image-cropper', kind: 'component' },
  { name: 'Hover Card', slug: 'hover-card', kind: 'component' },
  { name: 'Listbox', slug: 'listbox', kind: 'component' },
  { name: 'Marquee', slug: 'marquee', kind: 'component' },
  { name: 'Menu', slug: 'menu', kind: 'component' },
  { name: 'Number Input', slug: 'number-input', kind: 'component' },
  { name: 'Pagination', slug: 'pagination', kind: 'component' },
  { name: 'Password Input', slug: 'password-input', kind: 'component' },
  { name: 'Pin Input', slug: 'pin-input', kind: 'component' },
  { name: 'Popover', slug: 'popover', kind: 'component' },
  { name: 'QR Code', slug: 'qr-code', kind: 'component' },
  { name: 'Radio Group', slug: 'radio-group', kind: 'component' },
  { name: 'Rating Group', slug: 'rating-group', kind: 'component' },
  { name: 'Scroll Area', slug: 'scroll-area', kind: 'component' },
  { name: 'Segment Group', slug: 'segment-group', kind: 'component' },
  { name: 'Select', slug: 'select', kind: 'component' },
  { name: 'Signature Pad', slug: 'signature-pad', kind: 'component' },
  { name: 'Slider', slug: 'slider', kind: 'component' },
  { name: 'Splitter', slug: 'splitter', kind: 'component' },
  { name: 'Steps', slug: 'steps', kind: 'component' },
  { name: 'Switch', slug: 'switch', kind: 'component' },
  { name: 'Tabs', slug: 'tabs', kind: 'component' },
  { name: 'Tags Input', slug: 'tags-input', kind: 'component' },
  { name: 'Timer', slug: 'timer', kind: 'component' },
  { name: 'Toast', slug: 'toast', kind: 'component' },
  { name: 'Toggle', slug: 'toggle', kind: 'component' },
  { name: 'Toggle Group', slug: 'toggle-group', kind: 'component' },
  { name: 'Tooltip', slug: 'tooltip', kind: 'component' },
  { name: 'Tour', slug: 'tour', kind: 'component' },
  { name: 'Tree View', slug: 'tree-view', kind: 'component' },
];

function normalizeSection(value?: string): Mode {
  if (value === 'utilities' || value === 'utility') return 'utilities';
  if (value === 'components' || value === 'component') return 'components';
  return 'all';
}

function itemId(item: CatalogItem): string {
  return `${item.kind}:${item.slug}`;
}

function makeDocUrl(framework: Framework, item: CatalogItem): string {
  const group = item.kind === 'utility' ? 'utilities' : 'components';
  return `https://ark-ui.com/${framework}/docs/${group}/${item.slug}`;
}

function makeReactExampleUrl(item: CatalogItem): string | null {
  if (item.kind !== 'component') return null;
  const exampleId = EXAMPLE_BY_COMPONENT_SLUG[item.slug];
  if (!exampleId) return null;
  return `https://ark-plus.vercel.app/examples/${exampleId}`;
}

export default function UiCatalog() {
  const params = useParams<{ section?: string }>();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'demo' | 'docs'>('demo');
  const mode = useMemo(() => normalizeSection(params.section), [params.section]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter((item) => {
      if (mode === 'utilities' && item.kind !== 'utility') return false;
      if (mode === 'components' && item.kind !== 'component') return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });
  }, [mode, query]);

  const resolvedActiveId = useMemo(() => {
    const hasActive = activeId ? filtered.some((item) => itemId(item) === activeId) : false;
    if (hasActive && activeId) return activeId;
    return filtered[0] ? itemId(filtered[0]) : null;
  }, [activeId, filtered]);

  const activeItem = useMemo(
    () => filtered.find((item) => itemId(item) === resolvedActiveId) ?? filtered[0] ?? null,
    [filtered, resolvedActiveId],
  );

  const canEmbedArkPlus = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.location.origin === 'http://localhost:3000';
  }, []);

  const sideNavFreePreviewUrl = activeItem ? makeReactExampleUrl(activeItem) : null;
  const reactPreviewUrl = activeItem
    ? (sideNavFreePreviewUrl && canEmbedArkPlus
      ? sideNavFreePreviewUrl
      : makeDocUrl('react', activeItem))
    : 'https://ark-ui.com/react/docs/overview/getting-started';

  const onModeChange = (nextMode: Mode) => {
    if (nextMode === 'all') {
      navigate('/app/ui', { replace: true });
      return;
    }
    navigate(`/app/ui/${nextMode}`, { replace: true });
  };

  return (
    <div className="h-full min-h-0 p-4 sm:p-5">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_1fr]">
        <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
          <header className="border-b border-border p-3">
            <h1 className="text-base font-semibold text-foreground">Ark UI Catalog</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Hover any item to update live React docs preview instantly.
            </p>
          </header>

          <div className="space-y-2 border-b border-border p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onModeChange('utilities')}
                className={`rounded-md border px-2 py-1 text-xs font-medium ${mode === 'utilities' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
              >
                Utilities
              </button>
              <button
                type="button"
                onClick={() => onModeChange('components')}
                className={`rounded-md border px-2 py-1 text-xs font-medium ${mode === 'components' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
              >
                Components
              </button>
              <button
                type="button"
                onClick={() => onModeChange('all')}
                className={`rounded-md border px-2 py-1 text-xs font-medium ${mode === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
              >
                All
              </button>
            </div>

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
            />
            <div className="text-xs text-muted-foreground">
              {filtered.length} item{filtered.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            <ul className="space-y-1">
              {filtered.map((item) => {
                const id = itemId(item);
                const isActive = id === (activeItem ? itemId(activeItem) : '');
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveId(id)}
                      onFocus={() => setActiveId(id)}
                      onClick={() => setActiveId(id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.kind}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {activeItem ? activeItem.name : 'React preview'}
              </h2>
              {activeItem && LOCAL_DEMOS[activeItem.slug] && (
                <div className="flex rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setViewMode('demo')}
                    className={`px-2 py-1 text-xs font-medium ${viewMode === 'demo' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Local Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('docs')}
                    className={`border-l border-border px-2 py-1 text-xs font-medium ${viewMode === 'docs' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Ark Docs
                  </button>
                </div>
              )}
            </div>
            {activeItem && (
              <div className="flex flex-wrap gap-2">
                {FRAMEWORKS.map((framework) => (
                  <a
                    key={framework}
                    href={makeDocUrl(framework, activeItem)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    {framework}
                  </a>
                ))}
              </div>
            )}
          </header>

          <div className="min-h-0 flex-1 bg-background">
            {activeItem && LOCAL_DEMOS[activeItem.slug] && viewMode === 'demo' ? (
              <div className="h-full overflow-auto p-6">
                {LOCAL_DEMOS[activeItem.slug]()}
              </div>
            ) : reactPreviewUrl ? (
              <iframe
                key={reactPreviewUrl}
                title={activeItem ? `Ark UI React preview - ${activeItem.name}` : 'Ark UI React preview'}
                src={reactPreviewUrl}
                className="h-full w-full border-0"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-6">
                <div className="max-w-md rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Live preview unavailable for this item
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use the React docs link above for the official reference.
                  </p>
                  {activeItem && (
                    <a
                      href={makeDocUrl('react', activeItem)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      Open React Docs
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
