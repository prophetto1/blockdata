import { Field } from '@ark-ui/react/field';
import { NumberInput } from '@ark-ui/react/number-input';
import { Switch } from '@ark-ui/react/switch';
import { TagsInput } from '@ark-ui/react/tags-input';
import Editor from '@monaco-editor/react';
import * as TablerIcons from '@tabler/icons-react';
import { IconAlertTriangle, IconDatabase, IconSparkles } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/ui/app-icon';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ICON_SIZES,
  ICON_STROKES,
  ICON_STANDARD,
  ICON_CONTEXT_SIZE,
  type IconSizeToken,
  type IconStrokeToken,
  type IconToneToken,
  type IconContextToken,
} from '@/lib/icon-contract';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  FONT_STANDARD,
  FONT_RECIPES,
  type FontFamilyToken,
  type FontSizeToken,
  type FontWeightToken,
} from '@/lib/font-contract';
import { COLOR_CONTRACT_GROUPS, type ColorPair } from '@/lib/color-contract';
import { coerceTextInputValue } from '@/lib/input-value';
import { styleTokens } from '@/lib/styleTokens';
import { cn } from '@/lib/utils';
import { edgeFetch } from '@/lib/edge';
import { supabase } from '@/lib/supabase';

type PolicyValueType = 'boolean' | 'integer' | 'number' | 'string' | 'object' | 'array';

type PolicyRow = {
  policy_key: string;
  value: unknown;
  value_type: PolicyValueType;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

type AuditRow = {
  audit_id: number;
  policy_key: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
};

type AdminConfigResponse = {
  superuser: { user_id: string; email: string };
  policies: PolicyRow[];
  audit: AuditRow[];
};

type ServiceRow = {
  service_id: string;
  service_type: string;
  service_name: string;
  base_url: string;
  health_status: string;
  last_heartbeat: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ServiceFunctionRow = {
  function_id: string;
  service_id: string;
  function_name: string;
  function_type: string;
  label: string;
  description: string | null;
  entrypoint: string;
  http_method: string;
  enabled: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

type ServiceTypeRow = {
  service_type: string;
  label: string;
  description: string | null;
};

type AdminServicesResponse = {
  superuser: { user_id: string; email: string };
  service_types: ServiceTypeRow[];
  services: ServiceRow[];
  functions: ServiceFunctionRow[];
};

type ServiceDraft = {
  service_type: string;
  service_name: string;
  base_url: string;
  health_status: string;
  enabled: boolean;
  configText: string;
};

type FunctionDraft = {
  function_name: string;
  function_type: string;
  label: string;
  description: string;
  entrypoint: string;
  http_method: string;
  tagsText: string;
  enabled: boolean;
};

type ComponentInventoryComponent = {
  usedAs: string;
  category: string;
};

type ComponentInventoryPage = {
  page: string;
  components: ComponentInventoryComponent[];
};

type ComponentInventoryReport = {
  generatedAt: string;
  scope: 'auth' | 'all';
  pages: ComponentInventoryPage[];
  totalComponentUsages: number;
  categoryTotals: Record<string, number>;
};

type IconInventoryRow = {
  icon: string;
  usageCount: number;
  pageCount: number;
  pages: string[];
};

type AppShellSpecRow = {
  component: string;
  spec: string;
  source: string;
  note: string;
};

const APP_SHELL_SPEC_ROWS: AppShellSpecRow[] = [
  {
    component: 'App header',
    spec: `${styleTokens.shell.headerHeight}px height`,
    source: 'src/lib/styleTokens.ts + src/components/layout/AppLayout.tsx',
    note: 'Sets top chrome height and main content top inset.',
  },
  {
    component: 'Left rail (expanded)',
    spec: `${styleTokens.shell.navbarWidth}px width`,
    source: 'src/lib/styleTokens.ts + src/components/layout/AppLayout.tsx',
    note: 'Primary navigation width on desktop.',
  },
  {
    component: 'Left rail (compact)',
    spec: `${styleTokens.shell.navbarCompactWidth}px width`,
    source: 'src/lib/styleTokens.ts + src/components/layout/AppLayout.tsx',
    note: 'Collapsed desktop navigation width.',
  },
  {
    component: 'Settings second rail',
    spec: 'w-65 (16.25rem ~= 260px)',
    source: 'src/pages/settings/SettingsLayout.tsx',
    note: 'Secondary navigation rail in settings pages.',
  },
  {
    component: 'Pane headers (schema shell)',
    spec: 'var(--shell-pane-header-height, 50px)',
    source: 'src/theme.css + src/pages/SchemaLayout.css',
    note: 'Header row height for shell panes and toolbars.',
  },
  {
    component: 'Shell guide columns (schema header)',
    spec: '--shell-guide-left-width: 392px, --shell-guide-middle-width: 300px',
    source: 'src/components/shell/TopCommandBar.css',
    note: 'Aligns top command bar with schema columns.',
  },
  {
    component: 'Top command bar icon toggles',
    spec: '24px (shell guides) and 32px (standard action buttons)',
    source: 'src/components/shell/TopCommandBar.css + src/components/shell/TopCommandBar.tsx',
    note: '24px is for schema guide toggles; 32px is standard command actions.',
  },
  {
    component: 'Constrained page shell max width',
    spec: 'var(--app-shell-content-max-width)',
    source: 'src/lib/styleTokens.ts + src/tailwind.css + src/components/layout/AppPageShell.tsx',
    note: 'Used in constrained mode to cap reading width.',
  },
];

const CATEGORY_IDS = ['models', 'worker', 'upload', 'services', 'design', 'design-shell', 'design-icons', 'audit'] as const;
type CategoryId = (typeof CATEGORY_IDS)[number];

type Category = {
  id: CategoryId;
  label: string;
  match: (policyKey: string) => boolean;
};

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

const CATEGORIES: Category[] = [
  {
    id: 'models',
    label: 'Models',
    match: (key) => key.startsWith('models.'),
  },
  {
    id: 'worker',
    label: 'Worker',
    match: (key) => key.startsWith('worker.'),
  },
  {
    id: 'upload',
    label: 'Upload',
    match: (key) => key.startsWith('upload.'),
  },
  {
    id: 'services',
    label: 'Services',
    match: () => false,
  },
  {
    id: 'design',
    label: 'Design Standards',
    match: () => false,
  },
  {
    id: 'design-shell',
    label: 'App Shell Specs',
    match: () => false,
  },
  {
    id: 'design-icons',
    label: 'Icon Inventory',
    match: () => false,
  },
  {
    id: 'audit',
    label: 'Audit History',
    match: () => false,
  },
];

type AdminSubTabGroup = {
  id: 'runtime' | 'operations' | 'design';
  label: string;
  tabs: Array<{ id: CategoryId; label: string }>;
};

const ADMIN_SUBTAB_GROUPS: AdminSubTabGroup[] = [
  {
    id: 'runtime',
    label: 'Runtime',
    tabs: [
      { id: 'models', label: 'Runtime Policy' },
      { id: 'worker', label: 'Worker' },
      { id: 'upload', label: 'Upload' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    tabs: [
      { id: 'services', label: 'Services' },
      { id: 'audit', label: 'Audit History' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    tabs: [
      { id: 'design', label: 'Design Standards' },
      { id: 'design-shell', label: 'App Shell Specs' },
      { id: 'design-icons', label: 'Icon Inventory' },
    ],
  },
];

function toCategoryId(value: string | undefined): CategoryId | null {
  if (!value) return null;
  return CATEGORY_IDS.includes(value as CategoryId) ? (value as CategoryId) : null;
}

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function parseJsonTextarea(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}

function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function summarizePreviewValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.length > 28 ? `${value.slice(0, 28)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

function summarizeAuditChange(row: AuditRow): string {
  const oldRecord = asRecord(row.old_value);
  const newRecord = asRecord(row.new_value);

  if (oldRecord && newRecord) {
    const keys = Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]));
    const changedKeys = keys.filter((key) => JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key]));
    if (changedKeys.length === 0) return 'No value delta';

    const key = changedKeys[0];
    if (!key) return 'No value delta';
    const oldPreview = summarizePreviewValue(oldRecord[key]);
    const newPreview = summarizePreviewValue(newRecord[key]);
    const extraCount = changedKeys.length - 1;
    return extraCount > 0
      ? `${key}: ${oldPreview} -> ${newPreview} (+${extraCount} more)`
      : `${key}: ${oldPreview} -> ${newPreview}`;
  }

  const oldPreview = summarizePreviewValue(row.old_value);
  const newPreview = summarizePreviewValue(row.new_value);
  if (oldPreview === newPreview) return 'No value delta';
  return `${oldPreview} -> ${newPreview}`;
}

function parseTagsText(input: string): string[] {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}

function serviceToDraft(row: ServiceRow): ServiceDraft {
  return {
    service_type: row.service_type,
    service_name: row.service_name,
    base_url: row.base_url,
    health_status: row.health_status,
    enabled: row.enabled,
    configText: stringifyValue(row.config ?? {}),
  };
}

function functionToDraft(row: ServiceFunctionRow): FunctionDraft {
  return {
    function_name: row.function_name,
    function_type: row.function_type,
    label: row.label,
    description: row.description ?? '',
    entrypoint: row.entrypoint,
    http_method: row.http_method,
    tagsText: (row.tags ?? []).join(', '),
    enabled: row.enabled,
  };
}

function emptyFunctionDraft(): FunctionDraft {
  return {
    function_name: '',
    function_type: 'utility',
    label: '',
    description: '',
    entrypoint: '',
    http_method: 'POST',
    tagsText: '',
    enabled: true,
  };
}

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const FUNCTION_TYPE_OPTIONS = ['source', 'destination', 'transform', 'parse', 'convert', 'export', 'test', 'utility', 'macro', 'custom', 'ingest', 'callback'] as const;
const HTTP_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

const SIZE_ORDER: IconSizeToken[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
const STROKE_ORDER: IconStrokeToken[] = ['light', 'regular', 'strong'];
const TONE_ORDER: IconToneToken[] = ['default', 'muted', 'accent', 'success', 'warning', 'danger'];
const CONTEXT_ORDER: IconContextToken[] = ['inline', 'content', 'nav', 'hero'];

const FAMILY_ORDER: FontFamilyToken[] = ['sans', 'mono'];
const FONT_SIZE_ORDER: FontSizeToken[] = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
const WEIGHT_ORDER: FontWeightToken[] = ['normal', 'medium', 'semibold', 'bold'];
const AUDIT_TIME_RANGE_OPTIONS = ['24h', '7d', '30d', 'all'] as const;
type AuditTimeRange = (typeof AUDIT_TIME_RANGE_OPTIONS)[number];

function isAuditRowInRange(changedAt: string, range: AuditTimeRange): boolean {
  if (range === 'all') return true;
  const timestamp = new Date(changedAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  const now = Date.now();
  const rangeMs = range === '24h'
    ? 24 * 60 * 60 * 1000
    : range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  return now - timestamp <= rangeMs;
}

function subscribeTheme(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getMonacoTheme(): string {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'vs-dark';
}

function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeTheme, getMonacoTheme, () => 'vs-dark');
}

function useLiveCssVar(cssVar: string): string {
  const [value, setValue] = useState('');
  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    setValue(raw || '-');
  }, [cssVar]);
  return value;
}

function ColorSwatch({ pair }: { pair: ColorPair }) {
  const live = useLiveCssVar(pair.cssVar);
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      <div
        className="h-6 w-6 shrink-0 rounded border border-border"
        style={{ backgroundColor: `var(${pair.cssVar})` }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{pair.cssVar}</p>
        <p className="text-xs text-muted-foreground">{pair.note}</p>
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{live}</span>
    </div>
  );
}

function FontStandardsPreview() {
  return (
    <div className="space-y-4">
      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Font Contract</h3>
        <p className="mt-2 text-xs text-muted-foreground">{FONT_STANDARD.note}</p>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Font Families</h3>
        <div className="mt-3 space-y-3">
          {FAMILY_ORDER.map((token) => {
            const family = FONT_FAMILIES[token];
            return (
              <div key={token} className="rounded-md border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">font-{token}</span>
                  <span className="font-mono text-xs text-muted-foreground">{family.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{family.use}</p>
                <p
                  className="mt-2 text-base text-foreground"
                  style={{ fontFamily: family.stack }}
                >
                  The quick brown fox jumps over the lazy dog 0123456789
                </p>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Usage Recipes</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Each row shows the exact Tailwind classes to use for that UI context.
        </p>
        <div className="mt-3 space-y-1">
          {FONT_RECIPES.map((recipe) => (
            <div key={recipe.context} className="flex items-baseline gap-4 rounded-md border border-border bg-background px-3 py-2">
              <div className="w-40 shrink-0">
                <p className="text-xs font-medium text-foreground">{recipe.context}</p>
                <p className="font-mono text-2xs text-muted-foreground">{recipe.classes}</p>
              </div>
              <span
                className={recipe.classes}
                style={{ fontFamily: FONT_FAMILIES[recipe.family].stack }}
              >
                {recipe.sample}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Size Scale</h3>
        <div className="mt-3 space-y-1">
          {FONT_SIZE_ORDER.map((token) => {
            const size = FONT_SIZES[token];
            return (
              <div key={token} className="flex items-baseline justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                <span className="text-foreground" style={{ fontSize: size.rem }}>
                  text-{token}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {size.rem} ({size.px}px) - {size.note}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Weight Scale</h3>
        <div className="mt-3 space-y-1">
          {WEIGHT_ORDER.map((token) => {
            const weight = FONT_WEIGHTS[token];
            return (
              <div key={token} className="flex items-baseline justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                <span className="text-sm text-foreground" style={{ fontWeight: weight.value }}>
                  font-{token}
                </span>
                <span className="text-xs text-muted-foreground">
                  {weight.value} - {weight.note}
                </span>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}

function ColorContractPreview() {
  return (
    <div className="space-y-4">
      {COLOR_CONTRACT_GROUPS.map((group) => (
        <article key={group.label} className="rounded-lg bg-transparent p-4">
          <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(group.tokens).map(([name, pair]) => (
              <ColorSwatch key={name} pair={pair} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function IconStandardsPreview() {
  return (
    <div className="space-y-4">
      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Icon Contract</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Default context: <span className="font-medium text-foreground">{ICON_STANDARD.defaultContext}</span>
          {' | '}Default size: <span className="font-medium text-foreground">{ICON_STANDARD.defaultSize}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{ICON_STANDARD.migrationStatus}.</p>
        <p className="mt-2 text-xs text-muted-foreground">{ICON_STANDARD.note}</p>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Semantic Contexts</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Use <span className="font-mono">context</span> prop instead of explicit size. Each context resolves to a size token.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CONTEXT_ORDER.map((ctx) => {
            const resolvedSize = ICON_CONTEXT_SIZE[ctx];
            return (
              <div key={ctx} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-3">
                <AppIcon icon={IconSparkles} context={ctx} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">{ctx}</p>
                  <p className="font-mono text-2xs text-muted-foreground">
                    {'-> '} {resolvedSize} ({ICON_SIZES[resolvedSize]}px)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Size Tokens</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SIZE_ORDER.map((token) => (
            <div key={token} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <span className="text-xs text-muted-foreground">{token}</span>
              <span className="inline-flex items-center gap-2 text-xs text-foreground">
                <AppIcon icon={IconSparkles} size={token} />
                {ICON_SIZES[token]}px
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Stroke Tokens</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {STROKE_ORDER.map((token) => (
            <div key={token} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <AppIcon icon={IconDatabase} stroke={token} />
              <span className="text-xs text-foreground">{token} ({ICON_STROKES[token]})</span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Tone Tokens</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {TONE_ORDER.map((tone) => (
            <div key={tone} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <AppIcon icon={IconAlertTriangle} tone={tone} />
              <span className="text-xs text-foreground">{tone}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function AppShellSpecsPreview() {
  const appShellHeaderHeight = useLiveCssVar('--app-shell-header-height');
  const shellPaneHeaderHeight = useLiveCssVar('--shell-pane-header-height');
  const appShellContentMaxWidth = useLiveCssVar('--app-shell-content-max-width');
  const appShellPageGap = useLiveCssVar('--app-shell-page-gap');
  const appShellPageBottomPadding = useLiveCssVar('--app-shell-page-bottom-padding');

  return (
    <div className="space-y-4">
      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Shell Source of Truth</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Use <span className="font-mono">styleTokens.shell</span> for TypeScript dimensions and CSS variables in
          <span className="font-mono"> tailwind.css</span>/<span className="font-mono">theme.css</span> for shared runtime sizing.
          This page is the quick reference for implementation and review.
        </p>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Live Shell Tokens</h3>
        <div className="mt-3 overflow-auto rounded-md border border-border">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Token</th>
                <th className="px-3 py-2 font-medium">Configured</th>
                <th className="px-3 py-2 font-medium">Live</th>
                <th className="px-3 py-2 font-medium">Primary Source</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-foreground">--app-shell-header-height</td>
                <td className="px-3 py-2 text-foreground">{styleTokens.shell.headerHeight}px</td>
                <td className="px-3 py-2 text-foreground">{appShellHeaderHeight}</td>
                <td className="px-3 py-2 text-muted-foreground">styleTokens.shell.headerHeight</td>
              </tr>
              <tr className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-foreground">--shell-pane-header-height</td>
                <td className="px-3 py-2 text-foreground">50px</td>
                <td className="px-3 py-2 text-foreground">{shellPaneHeaderHeight}</td>
                <td className="px-3 py-2 text-muted-foreground">theme.css</td>
              </tr>
              <tr className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-foreground">--app-shell-content-max-width</td>
                <td className="px-3 py-2 text-foreground">1460px</td>
                <td className="px-3 py-2 text-foreground">{appShellContentMaxWidth}</td>
                <td className="px-3 py-2 text-muted-foreground">tailwind.css</td>
              </tr>
              <tr className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-foreground">--app-shell-page-gap</td>
                <td className="px-3 py-2 text-foreground">1rem</td>
                <td className="px-3 py-2 text-foreground">{appShellPageGap}</td>
                <td className="px-3 py-2 text-muted-foreground">tailwind.css</td>
              </tr>
              <tr className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-foreground">--app-shell-page-bottom-padding</td>
                <td className="px-3 py-2 text-foreground">1.5rem</td>
                <td className="px-3 py-2 text-foreground">{appShellPageBottomPadding}</td>
                <td className="px-3 py-2 text-muted-foreground">tailwind.css</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Component Size Spec</h3>
        <div className="mt-3 overflow-auto rounded-md border border-border">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Component</th>
                <th className="px-3 py-2 font-medium">Spec</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {APP_SHELL_SPEC_ROWS.map((row) => (
                <tr key={row.component} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-foreground">{row.component}</td>
                  <td className="px-3 py-2 font-mono text-foreground">{row.spec}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.source}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

export default function SettingsAdmin() {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const monacoTheme = useMonacoTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('all');
  const [auditRangeFilter, setAuditRangeFilter] = useState<AuditTimeRange>('7d');
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [uploadSearch, setUploadSearch] = useState('');
  const [uploadTypeFilter, setUploadTypeFilter] = useState<PolicyValueType | 'all'>('all');
  const [selectedUploadPolicyKey, setSelectedUploadPolicyKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [refreshingInventory, setRefreshingInventory] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryReport, setInventoryReport] = useState<ComponentInventoryReport | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [serviceFunctions, setServiceFunctions] = useState<ServiceFunctionRow[]>([]);
  const [serviceSavingKey, setServiceSavingKey] = useState<string | null>(null);
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({});
  const [functionDrafts, setFunctionDrafts] = useState<Record<string, FunctionDraft>>({});
  const [newServiceDraft, setNewServiceDraft] = useState<ServiceDraft>({
    service_type: 'custom',
    service_name: '',
    base_url: '',
    health_status: 'unknown',
    enabled: true,
    configText: '{}',
  });
  const [newFunctionDraftsByService, setNewFunctionDraftsByService] = useState<Record<string, FunctionDraft>>({});
  const [configDialogServiceId, setConfigDialogServiceId] = useState<string | null>(null);
  const serviceImportInputRef = useRef<HTMLInputElement | null>(null);

  const auditActorOptions = useMemo(() => {
    const actors = Array.from(new Set(
      auditRows
        .map((row) => row.changed_by?.trim() ?? '')
        .filter((value) => value.length > 0),
    )).sort((a, b) => a.localeCompare(b));
    return ['all', ...actors];
  }, [auditRows]);

  const filteredAuditRows = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    return auditRows.filter((row) => {
      if (!isAuditRowInRange(row.changed_at, auditRangeFilter)) return false;
      if (auditActorFilter !== 'all' && (row.changed_by ?? '') !== auditActorFilter) return false;
      if (!query) return true;

      const haystack = [
        row.policy_key,
        row.changed_by ?? '',
        row.reason ?? '',
        summarizeAuditChange(row),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [auditActorFilter, auditRangeFilter, auditRows, auditSearch]);

  const selectedAuditRow = useMemo(() => {
    if (filteredAuditRows.length === 0) return null;
    if (selectedAuditId !== null) {
      const found = filteredAuditRows.find((row) => row.audit_id === selectedAuditId);
      if (found) return found;
    }
    return filteredAuditRows[0] ?? null;
  }, [filteredAuditRows, selectedAuditId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setForbiddenMessage(null);

    try {
      const resp = await edgeFetch('admin-config?audit_limit=100', { method: 'GET' });
      const text = await resp.text();
      let payload: { error?: string } | AdminConfigResponse = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw text fallback below.
      }

      if (resp.status === 403 || resp.status === 503) {
        const msg = (payload as { error?: string }).error ?? text ?? 'Superuser access required.';
        setForbiddenMessage(msg);
        setLoading(false);
        return;
      }
      if (!resp.ok) {
        const msg = (payload as { error?: string }).error ?? text ?? `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      const data = payload as AdminConfigResponse;
      setPolicies(data.policies);
      setAuditRows(data.audit);

      const nextDraftValues: Record<string, unknown> = {};
      const nextJsonDrafts: Record<string, string> = {};
      for (const row of data.policies) {
        nextDraftValues[row.policy_key] = row.value;
        if (row.value_type === 'object' || row.value_type === 'array') {
          nextJsonDrafts[row.policy_key] = stringifyValue(row.value);
        }
      }
      setDraftValues(nextDraftValues);
      setJsonDrafts(nextJsonDrafts);
      setReasons({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadServices = useCallback(async () => {
    setServiceLoading(true);
    setServiceError(null);

    try {
      const resp = await edgeFetch('admin-services', { method: 'GET' });
      const text = await resp.text();
      let payload: AdminServicesResponse | { error?: string } = {};
      try {
        payload = text ? (JSON.parse(text) as AdminServicesResponse) : payload;
      } catch {
        // Keep raw fallback below.
      }

      if (!resp.ok) {
        const errPayload = payload as { error?: string };
        throw new Error(errPayload.error ?? text ?? `HTTP ${resp.status}`);
      }

      const data = payload as AdminServicesResponse;
      const nextServiceTypes = Array.isArray(data.service_types) ? data.service_types : [];
      const nextServices = Array.isArray(data.services) ? data.services : [];
      const nextFunctions = Array.isArray(data.functions) ? data.functions : [];

      setServiceTypes(nextServiceTypes);
      setServiceRows(nextServices);
      setServiceFunctions(nextFunctions);
      setServiceDrafts(
        nextServices.reduce<Record<string, ServiceDraft>>((acc, row) => {
          acc[row.service_id] = serviceToDraft(row);
          return acc;
        }, {}),
      );
      setFunctionDrafts(
        nextFunctions.reduce<Record<string, FunctionDraft>>((acc, row) => {
          acc[row.function_id] = functionToDraft(row);
          return acc;
        }, {}),
      );
      setNewFunctionDraftsByService(
        nextServices.reduce<Record<string, FunctionDraft>>((acc, row) => {
          acc[row.service_id] = emptyFunctionDraft();
          return acc;
        }, {}),
      );
      setNewServiceDraft((prev) => ({
        ...prev,
        service_type: prev.service_type === 'custom' && nextServiceTypes.length > 0
          ? nextServiceTypes[0].service_type
          : prev.service_type,
      }));
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : String(e));
    } finally {
      setServiceLoading(false);
    }
  }, []);

  const selectedCategory = useMemo(() => toCategoryId(category), [category]);

  const selectedCategoryDef = useMemo(() => {
    if (!selectedCategory) return null;
    return CATEGORIES.find((c) => c.id === selectedCategory) ?? null;
  }, [selectedCategory]);

  const selectedSubTabGroup = useMemo(() => {
    if (!selectedCategory) return null;
    return ADMIN_SUBTAB_GROUPS.find((group) =>
      group.tabs.some((tab) => tab.id === selectedCategory),
    ) ?? null;
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory === 'services' && !forbiddenMessage) {
      void loadServices();
    }
  }, [selectedCategory, forbiddenMessage, loadServices]);

  useEffect(() => {
    if (selectedCategory !== 'services' || forbiddenMessage) return;

    const channel = supabase
      .channel('admin-services-registry')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_registry' },
        () => {
          void loadServices();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_functions' },
        () => {
          void loadServices();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedCategory, forbiddenMessage, loadServices]);

  const filteredPolicies = useMemo(() => {
    if (!selectedCategoryDef || selectedCategoryDef.id === 'audit' || selectedCategoryDef.id === 'services') return [];
    return policies.filter((p) => selectedCategoryDef.match(p.policy_key));
  }, [policies, selectedCategoryDef]);
  const policyPanelClassName = 'space-y-3';

  const uploadPolicies = useMemo(
    () => filteredPolicies.filter((row) => row.policy_key.startsWith('upload.')),
    [filteredPolicies],
  );

  const filteredUploadPolicies = useMemo(() => {
    const query = uploadSearch.trim().toLowerCase();
    return uploadPolicies.filter((row) => {
      if (uploadTypeFilter !== 'all' && row.value_type !== uploadTypeFilter) return false;
      if (!query) return true;
      const haystack = `${row.policy_key} ${row.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [uploadPolicies, uploadSearch, uploadTypeFilter]);

  const selectedUploadPolicy = useMemo(() => {
    if (filteredUploadPolicies.length === 0) return null;
    if (selectedUploadPolicyKey) {
      const found = filteredUploadPolicies.find((row) => row.policy_key === selectedUploadPolicyKey);
      if (found) return found;
    }
    return filteredUploadPolicies[0] ?? null;
  }, [filteredUploadPolicies, selectedUploadPolicyKey]);

  useEffect(() => {
    if (selectedCategory !== 'upload') return;
    if (!selectedUploadPolicy) return;
    if (selectedUploadPolicy.policy_key !== selectedUploadPolicyKey) {
      setSelectedUploadPolicyKey(selectedUploadPolicy.policy_key);
    }
  }, [selectedCategory, selectedUploadPolicy, selectedUploadPolicyKey]);

  const serviceFunctionsByService = useMemo(() => {
    const map = new Map<string, ServiceFunctionRow[]>();
    for (const fn of serviceFunctions) {
      if (!map.has(fn.service_id)) map.set(fn.service_id, []);
      map.get(fn.service_id)?.push(fn);
    }
    for (const [serviceId, rows] of map.entries()) {
      rows.sort((a, b) => a.function_name.localeCompare(b.function_name));
      map.set(serviceId, rows);
    }
    return map;
  }, [serviceFunctions]);

  const activeConfigServiceDraft = useMemo(() => {
    if (!configDialogServiceId) return null;
    return serviceDrafts[configDialogServiceId] ?? null;
  }, [configDialogServiceId, serviceDrafts]);

  const activeConfigServiceName = useMemo(() => {
    if (!configDialogServiceId) return 'Service';
    return serviceRows.find((row) => row.service_id === configDialogServiceId)?.service_name ?? 'Service';
  }, [configDialogServiceId, serviceRows]);

  useEffect(() => {
    if (!configDialogServiceId) return;
    if (!serviceDrafts[configDialogServiceId]) {
      setConfigDialogServiceId(null);
    }
  }, [configDialogServiceId, serviceDrafts]);

  const toggleServiceEnabled = async (row: ServiceRow) => {
    setStatus(null);
    const nextEnabled = !row.enabled;
    const key = `service:${row.service_id}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_id: row.service_id,
          enabled: nextEnabled,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw fallback below.
      }
      if (!resp.ok) {
        throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await loadServices();
      setStatus({
        kind: 'success',
        message: `${row.service_name} ${nextEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const toggleFunctionEnabled = async (row: ServiceFunctionRow) => {
    setStatus(null);
    const nextEnabled = !row.enabled;
    const key = `function:${row.function_id}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          function_id: row.function_id,
          enabled: nextEnabled,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw fallback below.
      }
      if (!resp.ok) {
        throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await loadServices();
      setStatus({
        kind: 'success',
        message: `${row.function_name} ${nextEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const importRegistryJson = async (rawText: string) => {
    setStatus(null);
    const parsed = parseJsonTextarea(rawText);
    if (!parsed.ok) {
      setStatus({
        kind: 'error',
        message: `Invalid JSON file: ${parsed.error}`,
      });
      return;
    }

    let payload: Record<string, unknown> = {};
    if (Array.isArray(parsed.value)) {
      payload = { plugins: parsed.value };
    } else if (isPlainRecord(parsed.value)) {
      payload = parsed.value;
    } else {
      setStatus({
        kind: 'error',
        message: 'Import JSON must be an object or an array of plugins.',
      });
      return;
    }

    const key = 'service:import';
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'import_registry',
          import_mode: 'upsert',
          ...payload,
        }),
      });
      const text = await resp.text();
      let responsePayload: { error?: string; imported?: { services?: number; functions?: number }; warnings?: string[] } = {};
      try {
        responsePayload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) {
        throw new Error(responsePayload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await loadServices();
      const importedServices = responsePayload.imported?.services ?? 0;
      const importedFunctions = responsePayload.imported?.functions ?? 0;
      const warningCount = Array.isArray(responsePayload.warnings) ? responsePayload.warnings.length : 0;
      setStatus({
        kind: 'success',
        message: warningCount > 0
          ? `Imported ${importedServices} services and ${importedFunctions} functions (${warningCount} warnings).`
          : `Imported ${importedServices} services and ${importedFunctions} functions.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const createService = async () => {
    setStatus(null);
    const parsedConfig = parseJsonTextarea(newServiceDraft.configText);
    if (!parsedConfig.ok || typeof parsedConfig.value !== 'object' || parsedConfig.value === null || Array.isArray(parsedConfig.value)) {
      setStatus({
        kind: 'error',
        message: `Service config JSON must be an object${parsedConfig.ok ? '' : `: ${parsedConfig.error}`}.`,
      });
      return;
    }

    if (!newServiceDraft.service_type.trim() || !newServiceDraft.service_name.trim() || !newServiceDraft.base_url.trim()) {
      setStatus({
        kind: 'error',
        message: 'Service type, service name, and base URL are required.',
      });
      return;
    }

    const key = 'service:create';
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_type: newServiceDraft.service_type.trim(),
          service_name: newServiceDraft.service_name.trim(),
          base_url: newServiceDraft.base_url.trim(),
          health_status: newServiceDraft.health_status,
          enabled: newServiceDraft.enabled,
          config: parsedConfig.value,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setNewServiceDraft((prev) => ({
        ...prev,
        service_name: '',
        base_url: '',
        configText: '{}',
      }));
      setStatus({ kind: 'success', message: 'Service created.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const saveServiceDetails = async (serviceId: string) => {
    setStatus(null);
    const draft = serviceDrafts[serviceId];
    if (!draft) return;

    const parsedConfig = parseJsonTextarea(draft.configText);
    if (!parsedConfig.ok || typeof parsedConfig.value !== 'object' || parsedConfig.value === null || Array.isArray(parsedConfig.value)) {
      setStatus({
        kind: 'error',
        message: `Service config JSON must be an object${parsedConfig.ok ? '' : `: ${parsedConfig.error}`}.`,
      });
      return;
    }
    if (!draft.base_url.trim() || !draft.service_name.trim() || !draft.service_type.trim()) {
      setStatus({
        kind: 'error',
        message: 'Service type, service name, and base URL are required.',
      });
      return;
    }

    const key = `service:save:${serviceId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_id: serviceId,
          service_type: draft.service_type.trim(),
          service_name: draft.service_name.trim(),
          base_url: draft.base_url.trim(),
          health_status: draft.health_status,
          enabled: draft.enabled,
          config: parsedConfig.value,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: 'Service updated.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const deleteService = async (serviceId: string, serviceName: string) => {
    setStatus(null);
    const key = `service:delete:${serviceId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_id: serviceId,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: `${serviceName} deleted.` });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const createFunction = async (serviceId: string) => {
    setStatus(null);
    const draft = newFunctionDraftsByService[serviceId] ?? emptyFunctionDraft();
    if (!draft.function_name.trim() || !draft.label.trim() || !draft.entrypoint.trim()) {
      setStatus({
        kind: 'error',
        message: 'Function name, label, and entrypoint are required.',
      });
      return;
    }

    const key = `function:create:${serviceId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          service_id: serviceId,
          function_name: draft.function_name.trim(),
          function_type: draft.function_type,
          label: draft.label.trim(),
          description: draft.description.trim() ? draft.description.trim() : null,
          entrypoint: draft.entrypoint.trim(),
          http_method: draft.http_method,
          enabled: draft.enabled,
          tags: parseTagsText(draft.tagsText),
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setNewFunctionDraftsByService((prev) => ({
        ...prev,
        [serviceId]: emptyFunctionDraft(),
      }));
      setStatus({ kind: 'success', message: 'Function created.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const saveFunctionDetails = async (functionId: string) => {
    setStatus(null);
    const draft = functionDrafts[functionId];
    if (!draft) return;
    if (!draft.function_name.trim() || !draft.label.trim() || !draft.entrypoint.trim()) {
      setStatus({
        kind: 'error',
        message: 'Function name, label, and entrypoint are required.',
      });
      return;
    }

    const key = `function:save:${functionId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          function_id: functionId,
          function_name: draft.function_name.trim(),
          function_type: draft.function_type,
          label: draft.label.trim(),
          description: draft.description.trim() ? draft.description.trim() : null,
          entrypoint: draft.entrypoint.trim(),
          http_method: draft.http_method,
          enabled: draft.enabled,
          tags: parseTagsText(draft.tagsText),
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: 'Function updated.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const deleteFunction = async (functionId: string, functionName: string) => {
    setStatus(null);
    const key = `function:delete:${functionId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          function_id: functionId,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: `${functionName} deleted.` });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const savePolicy = async (row: PolicyRow) => {
    setStatus(null);
    let nextValue: unknown = draftValues[row.policy_key];
    if (row.value_type === 'object' || row.value_type === 'array') {
      const parsed = parseJsonTextarea(jsonDrafts[row.policy_key] ?? '');
      if (!parsed.ok) {
        setStatus({
          kind: 'error',
          message: `${row.policy_key}: ${parsed.error}`,
        });
        return;
      }
      nextValue = parsed.value;
    }

    setSavingKey(row.policy_key);
    try {
      const resp = await edgeFetch('admin-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_key: row.policy_key,
          value: nextValue,
          reason: reasons[row.policy_key]?.trim() || null,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw text fallback below.
      }
      if (!resp.ok) {
        throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await load();
      setStatus({
        kind: 'success',
        message: `${row.policy_key} updated.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingKey(null);
    }
  };

  const loadComponentInventory = async () => {
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const resp = await fetch(`/component-inventory.json?t=${Date.now()}`, { method: 'GET' });
      const text = await resp.text();
      let payload: ComponentInventoryReport | { error?: string } = { pages: [], totalComponentUsages: 0, categoryTotals: {}, generatedAt: '', scope: 'auth' };
      try {
        payload = text ? JSON.parse(text) as ComponentInventoryReport : payload;
      } catch {
        // Keep raw fallback below.
      }

      if (!resp.ok) {
        const errPayload = payload as { error?: string };
        throw new Error(errPayload.error ?? text ?? `HTTP ${resp.status}`);
      }

      setInventoryReport(payload as ComponentInventoryReport);
    } catch (e) {
      setInventoryError(e instanceof Error ? e.message : String(e));
    } finally {
      setInventoryLoading(false);
    }
  };

  const refreshComponentInventory = async () => {
    setStatus(null);
    setRefreshingInventory(true);
    try {
      const resp = await fetch('/__admin/refresh-component-inventory', { method: 'POST' });
      const text = await resp.text();
      let payload: { error?: string; message?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw fallback below.
      }

      if (!resp.ok) {
        throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      }

      setStatus({
        kind: 'success',
        message: 'Component inventory refreshed.',
      });
      await loadComponentInventory();
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRefreshingInventory(false);
    }
  };

  useEffect(() => {
    if (selectedCategory === 'design-icons') {
      void loadComponentInventory();
    }
  }, [selectedCategory]);

  const iconInventoryRows = useMemo<IconInventoryRow[]>(() => {
    if (!inventoryReport) return [];
    const map = new Map<string, Set<string>>();

    for (const page of inventoryReport.pages) {
      for (const component of page.components) {
        if (component.category !== 'tabler-icons') continue;
        if (!map.has(component.usedAs)) map.set(component.usedAs, new Set());
        map.get(component.usedAs)?.add(page.page);
      }
    }

    return Array.from(map.entries())
      .map(([icon, pages]) => ({
        icon,
        usageCount: pages.size,
        pageCount: pages.size,
        pages: Array.from(pages).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => {
        if (b.pageCount !== a.pageCount) return b.pageCount - a.pageCount;
        return a.icon.localeCompare(b.icon);
      });
  }, [inventoryReport]);

  const totalTrackedIcons = iconInventoryRows.length;

  const hugeiconsSearchHref = (iconName: string) => {
    const query = iconName.replace(/^Icon/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    return `https://www.google.com/search?q=${encodeURIComponent(`hugeicons ${query}`)}`;
  };

  const resolveIconComponent = (iconName: string) => {
    const componentMap = TablerIcons as Record<string, unknown>;
    const candidate = componentMap[iconName];
    return typeof candidate === 'function' ? (candidate as typeof IconSparkles) : null;
  };

  const categoryAction = null;

  if (!selectedCategory) {
    return <Navigate to="/app/settings/admin/models" replace />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {status && (
        <div
          className="mb-4 rounded-md border px-3 py-2 text-sm"
          style={status.kind === 'success'
            ? {
                borderColor: styleTokens.adminConfig.status.success.border,
                backgroundColor: styleTokens.adminConfig.status.success.background,
                color: styleTokens.adminConfig.status.success.foreground,
              }
            : {
                borderColor: styleTokens.adminConfig.status.error.border,
                backgroundColor: styleTokens.adminConfig.status.error.background,
                color: styleTokens.adminConfig.status.error.foreground,
              }}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      {error && <ErrorAlert message={error} />}
      {forbiddenMessage && (
        <ErrorAlert message={`${forbiddenMessage} Set SUPERUSER_EMAIL_ALLOWLIST to grant access.`} />
      )}
      {loading && !error && !forbiddenMessage && (
        <p className="text-sm text-muted-foreground">Loading superuser policies...</p>
      )}

      {!loading && !error && !forbiddenMessage && selectedCategoryDef && (
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border"
          style={{ backgroundColor: styleTokens.adminConfig.frameBackground }}
        >
          <header
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-2"
            style={{ backgroundColor: styleTokens.adminConfig.headerBackground }}
          >
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">{selectedCategoryDef.label}</h2>
            </div>
            {categoryAction}
          </header>
          {selectedSubTabGroup && (
            <div className="border-b border-border bg-background/60 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {selectedSubTabGroup.label}
                </span>
                {selectedSubTabGroup.tabs.map((tab) => {
                  const isActive = tab.id === selectedCategory;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => navigate(`/app/settings/admin/${tab.id}`)}
                      className={cn(
                        'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-primary/40 bg-primary/15 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4" style={{ backgroundColor: styleTokens.adminConfig.contentBackground }}>
            {selectedCategory === 'upload' && (
              <div className="space-y-4">
                <div className="grid gap-2 md:grid-cols-4">
                  <div className="rounded-md border border-border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Upload policies</p>
                    <p className="text-lg font-semibold text-foreground">{uploadPolicies.length}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Boolean toggles</p>
                    <p className="text-lg font-semibold text-foreground">{uploadPolicies.filter((row) => row.value_type === 'boolean').length}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Numeric limits</p>
                    <p className="text-lg font-semibold text-foreground">{uploadPolicies.filter((row) => row.value_type === 'integer' || row.value_type === 'number').length}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Structured fields</p>
                    <p className="text-lg font-semibold text-foreground">{uploadPolicies.filter((row) => row.value_type === 'array' || row.value_type === 'object').length}</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(340px,1fr)_minmax(420px,1fr)]">
                  <article className="rounded-lg border border-border bg-background p-3">
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px]">
                      <Field.Root>
                        <Field.Input
                          className={inputClass}
                          value={uploadSearch}
                          onChange={(event) => setUploadSearch(event.currentTarget.value)}
                          placeholder="Search upload policies"
                        />
                      </Field.Root>
                      <select
                        className={inputClass}
                        value={uploadTypeFilter}
                        onChange={(event) => setUploadTypeFilter(event.currentTarget.value as PolicyValueType | 'all')}
                      >
                        <option value="all">All types</option>
                        <option value="boolean">boolean</option>
                        <option value="integer">integer</option>
                        <option value="number">number</option>
                        <option value="string">string</option>
                        <option value="array">array</option>
                        <option value="object">object</option>
                      </select>
                    </div>
                    <div className="mt-3 overflow-auto rounded-md border border-border">
                      <table className="min-w-full border-collapse text-left text-xs">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Policy</th>
                            <th className="px-3 py-2 font-medium">Type</th>
                            <th className="px-3 py-2 font-medium">Draft value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUploadPolicies.map((row) => {
                            const selected = selectedUploadPolicy?.policy_key === row.policy_key;
                            return (
                              <tr
                                key={row.policy_key}
                                className={cn(
                                  'cursor-pointer border-t border-border align-top hover:bg-accent/40',
                                  selected && 'bg-accent/55',
                                )}
                                onClick={() => setSelectedUploadPolicyKey(row.policy_key)}
                              >
                                <td className="max-w-[260px] px-3 py-2 font-medium text-foreground" title={row.policy_key}>
                                  <span className="block truncate">{row.policy_key}</span>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{row.value_type}</td>
                                <td className="max-w-[220px] px-3 py-2 text-muted-foreground" title={row.value_type === 'object' ? (jsonDrafts[row.policy_key] ?? '{}') : stringifyValue(draftValues[row.policy_key])}>
                                  <span className="block truncate">
                                    {row.value_type === 'object'
                                      ? `${(jsonDrafts[row.policy_key] ?? '{}').length} chars`
                                      : summarizePreviewValue(draftValues[row.policy_key])}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {filteredUploadPolicies.length === 0 && (
                      <p className="mt-3 text-sm text-muted-foreground">No upload policies match current filters.</p>
                    )}
                  </article>

                  <article className="rounded-lg border border-border bg-background p-4">
                    {!selectedUploadPolicy && (
                      <p className="text-sm text-muted-foreground">Select an upload policy to edit.</p>
                    )}
                    {selectedUploadPolicy && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{selectedUploadPolicy.policy_key}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {selectedUploadPolicy.description ?? 'No description'}
                            </p>
                          </div>
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {selectedUploadPolicy.value_type}
                          </span>
                        </div>

                        {selectedUploadPolicy.value_type === 'boolean' && (
                          <Switch.Root
                            checked={Boolean(draftValues[selectedUploadPolicy.policy_key])}
                            onCheckedChange={(details) => {
                              setDraftValues((prev) => ({ ...prev, [selectedUploadPolicy.policy_key]: details.checked }));
                            }}
                            className="inline-flex items-center gap-2"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control className="relative h-6 w-11 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
                              <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5" />
                            </Switch.Control>
                            <Switch.Label className="text-sm text-foreground">Enabled</Switch.Label>
                          </Switch.Root>
                        )}

                        {(selectedUploadPolicy.value_type === 'integer' || selectedUploadPolicy.value_type === 'number') && (
                          <NumberInput.Root
                            value={String(typeof draftValues[selectedUploadPolicy.policy_key] === 'number' ? draftValues[selectedUploadPolicy.policy_key] : 0)}
                            min={Number.MIN_SAFE_INTEGER}
                            max={Number.MAX_SAFE_INTEGER}
                            step={selectedUploadPolicy.value_type === 'integer' ? 1 : 0.001}
                            formatOptions={selectedUploadPolicy.value_type === 'integer'
                              ? { maximumFractionDigits: 0 }
                              : { maximumFractionDigits: 3 }}
                            onValueChange={(details) => {
                              if (Number.isFinite(details.valueAsNumber)) {
                                const next = selectedUploadPolicy.value_type === 'integer'
                                  ? Math.trunc(details.valueAsNumber)
                                  : details.valueAsNumber;
                                setDraftValues((prev) => ({ ...prev, [selectedUploadPolicy.policy_key]: next }));
                              }
                            }}
                            className="w-full"
                          >
                            <NumberInput.Control className="relative">
                              <NumberInput.Input className={`${inputClass} pr-16`} />
                              <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                                <NumberInput.DecrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                  -
                                </NumberInput.DecrementTrigger>
                                <NumberInput.IncrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                  +
                                </NumberInput.IncrementTrigger>
                              </div>
                            </NumberInput.Control>
                          </NumberInput.Root>
                        )}

                        {selectedUploadPolicy.value_type === 'string' && (
                          <Field.Root>
                            <Field.Input
                              className={inputClass}
                              value={String(draftValues[selectedUploadPolicy.policy_key] ?? '')}
                              onChange={(input) =>
                                setDraftValues((prev) => ({ ...prev, [selectedUploadPolicy.policy_key]: coerceTextInputValue(input) }))}
                            />
                          </Field.Root>
                        )}

                        {selectedUploadPolicy.value_type === 'array' && (
                          <TagsInput.Root
                            value={Array.isArray(draftValues[selectedUploadPolicy.policy_key]) ? (draftValues[selectedUploadPolicy.policy_key] as unknown[]).map((item) => String(item)) : []}
                            onValueChange={(details) => setDraftValues((prev) => ({ ...prev, [selectedUploadPolicy.policy_key]: details.value }))}
                            addOnPaste
                            blurBehavior="add"
                            className="w-full"
                          >
                            <TagsInput.Control className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-1 focus-within:ring-1 focus-within:ring-ring">
                              {(Array.isArray(draftValues[selectedUploadPolicy.policy_key]) ? (draftValues[selectedUploadPolicy.policy_key] as unknown[]).map((item) => String(item)) : []).map((item, index) => (
                                <TagsInput.Item
                                  key={`${selectedUploadPolicy.policy_key}-${index}-${item}`}
                                  index={index}
                                  value={item}
                                  className="rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                                >
                                  <TagsInput.ItemPreview className="inline-flex items-center gap-1">
                                    <TagsInput.ItemText />
                                    <TagsInput.ItemDeleteTrigger className="text-muted-foreground hover:text-foreground">
                                      x
                                    </TagsInput.ItemDeleteTrigger>
                                  </TagsInput.ItemPreview>
                                  <TagsInput.ItemInput className="rounded border border-input bg-background px-1 text-xs text-foreground focus:outline-none" />
                                </TagsInput.Item>
                              ))}
                              <TagsInput.Input
                                className="h-8 min-w-[120px] flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                placeholder="Add value and press Enter"
                              />
                            </TagsInput.Control>
                          </TagsInput.Root>
                        )}

                        {selectedUploadPolicy.value_type === 'object' && (
                          <Field.Root>
                            <Field.Textarea
                              className="min-h-36 w-full rounded-md border border-input bg-background p-3 font-mono text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={jsonDrafts[selectedUploadPolicy.policy_key] ?? '{}'}
                              onChange={(input) =>
                                setJsonDrafts((prev) => ({ ...prev, [selectedUploadPolicy.policy_key]: coerceTextInputValue(input) }))}
                            />
                          </Field.Root>
                        )}

                        <Field.Root>
                          <Field.Label className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</Field.Label>
                          <Field.Input
                            className={inputClass}
                            placeholder="Why are you changing this?"
                            value={reasons[selectedUploadPolicy.policy_key] ?? ''}
                            onChange={(input) =>
                              setReasons((prev) => ({ ...prev, [selectedUploadPolicy.policy_key]: coerceTextInputValue(input) }))}
                          />
                        </Field.Root>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(selectedUploadPolicy.updated_at)}
                          </p>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={savingKey === selectedUploadPolicy.policy_key}
                            onClick={() => savePolicy(selectedUploadPolicy)}
                          >
                            {savingKey === selectedUploadPolicy.policy_key ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </article>
                </div>
              </div>
            )}

            {selectedCategory !== 'upload' && selectedCategory !== 'audit' && selectedCategory !== 'services' && selectedCategory !== 'design' && selectedCategory !== 'design-shell' && selectedCategory !== 'design-icons' && (
              <div className={policyPanelClassName}>
                {filteredPolicies.map((row) => {
                  const numericDraft = typeof draftValues[row.policy_key] === 'number'
                    ? (draftValues[row.policy_key] as number)
                    : 0;
                  const tagDraft = Array.isArray(draftValues[row.policy_key])
                    ? (draftValues[row.policy_key] as unknown[]).map((item) => String(item))
                    : [];
                  return (
                    <article key={row.policy_key} className="rounded-lg bg-transparent p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{row.policy_key}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{row.description ?? 'No description'}</p>
                        </div>
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {row.value_type}
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {row.value_type === 'boolean' && (
                          <Switch.Root
                            checked={Boolean(draftValues[row.policy_key])}
                            onCheckedChange={(details) => {
                              setDraftValues((prev) => ({ ...prev, [row.policy_key]: details.checked }));
                            }}
                            className="inline-flex items-center gap-2"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control className="relative h-6 w-11 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
                              <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5" />
                            </Switch.Control>
                            <Switch.Label className="text-sm text-foreground">Enabled</Switch.Label>
                          </Switch.Root>
                        )}

                        {(row.value_type === 'integer' || row.value_type === 'number') && (
                          <NumberInput.Root
                            value={String(numericDraft)}
                            min={Number.MIN_SAFE_INTEGER}
                            max={Number.MAX_SAFE_INTEGER}
                            step={row.value_type === 'integer' ? 1 : 0.001}
                            formatOptions={row.value_type === 'integer'
                              ? { maximumFractionDigits: 0 }
                              : { maximumFractionDigits: 3 }}
                            onValueChange={(details) => {
                              if (Number.isFinite(details.valueAsNumber)) {
                                const next = row.value_type === 'integer'
                                  ? Math.trunc(details.valueAsNumber)
                                  : details.valueAsNumber;
                                setDraftValues((prev) => ({ ...prev, [row.policy_key]: next }));
                              }
                            }}
                            className="w-full"
                          >
                            <NumberInput.Control className="relative">
                              <NumberInput.Input className={`${inputClass} pr-16`} />
                              <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                                <NumberInput.DecrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                  -
                                </NumberInput.DecrementTrigger>
                                <NumberInput.IncrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                  +
                                </NumberInput.IncrementTrigger>
                              </div>
                            </NumberInput.Control>
                          </NumberInput.Root>
                        )}

                        {row.value_type === 'string' && (
                          <Field.Root>
                            <Field.Input
                              className={inputClass}
                              value={String(draftValues[row.policy_key] ?? '')}
                              onChange={(input) =>
                                setDraftValues((prev) => ({ ...prev, [row.policy_key]: coerceTextInputValue(input) }))}
                            />
                          </Field.Root>
                        )}

                        {row.value_type === 'array' && (
                          <TagsInput.Root
                            value={tagDraft}
                            onValueChange={(details) => setDraftValues((prev) => ({ ...prev, [row.policy_key]: details.value }))}
                            addOnPaste
                            blurBehavior="add"
                            className="w-full"
                          >
                            <TagsInput.Control className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-1 focus-within:ring-1 focus-within:ring-ring">
                              {tagDraft.map((item, index) => (
                                <TagsInput.Item
                                  key={`${row.policy_key}-${index}-${item}`}
                                  index={index}
                                  value={item}
                                  className="rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                                >
                                  <TagsInput.ItemPreview className="inline-flex items-center gap-1">
                                    <TagsInput.ItemText />
                                    <TagsInput.ItemDeleteTrigger className="text-muted-foreground hover:text-foreground">
                                      x
                                    </TagsInput.ItemDeleteTrigger>
                                  </TagsInput.ItemPreview>
                                  <TagsInput.ItemInput className="rounded border border-input bg-background px-1 text-xs text-foreground focus:outline-none" />
                                </TagsInput.Item>
                              ))}
                              <TagsInput.Input
                                className="h-8 min-w-[120px] flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                placeholder="Add value and press Enter"
                              />
                            </TagsInput.Control>
                          </TagsInput.Root>
                        )}

                        {row.value_type === 'object' && (
                          <Field.Root>
                            <Field.Textarea
                              className="min-h-36 w-full rounded-md border border-input bg-background p-3 font-mono text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={jsonDrafts[row.policy_key] ?? '{}'}
                              onChange={(input) =>
                                setJsonDrafts((prev) => ({ ...prev, [row.policy_key]: coerceTextInputValue(input) }))}
                            />
                          </Field.Root>
                        )}

                        <Field.Root>
                          <Field.Label className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</Field.Label>
                          <Field.Input
                            className={inputClass}
                            placeholder="Why are you changing this?"
                            value={reasons[row.policy_key] ?? ''}
                            onChange={(input) =>
                              setReasons((prev) => ({ ...prev, [row.policy_key]: coerceTextInputValue(input) }))}
                          />
                        </Field.Root>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(row.updated_at)}
                          </p>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={savingKey === row.policy_key}
                            onClick={() => savePolicy(row)}
                          >
                            {savingKey === row.policy_key ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {filteredPolicies.length === 0 && (
                  <p className="text-sm text-muted-foreground">No policies in this category.</p>
                )}
              </div>
            )}

            {selectedCategory === 'services' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={serviceLoading}
                    onClick={() => void loadServices()}
                  >
                    {serviceLoading ? 'Refreshing...' : 'Refresh Services'}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={serviceSavingKey === 'service:import'}
                    onClick={() => serviceImportInputRef.current?.click()}
                  >
                    {serviceSavingKey === 'service:import' ? 'Importing...' : 'Import JSON'}
                  </Button>
                  <input
                    ref={serviceImportInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      if (!file) return;
                      void file.text().then((text) => importRegistryJson(text));
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Services: <span className="font-mono">{serviceRows.length}</span> | Functions: <span className="font-mono">{serviceFunctions.length}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Import accepts object payloads with <span className="font-mono">services/functions</span> or Kestra-style <span className="font-mono">plugins</span> with <span className="font-mono">type</span>.
                </p>

                <article className="rounded-lg border border-border bg-background/60 p-4">
                  <h3 className="text-sm font-semibold text-foreground">Add Service</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <label className="text-xs text-muted-foreground">
                      Type
                      <select
                        className={`${inputClass} mt-1`}
                        value={newServiceDraft.service_type}
                        onChange={(event) => setNewServiceDraft((prev) => ({ ...prev, service_type: event.currentTarget.value }))}
                      >
                        {serviceTypes.map((row) => (
                          <option key={row.service_type} value={row.service_type}>{row.service_type}</option>
                        ))}
                        {!serviceTypes.some((row) => row.service_type === newServiceDraft.service_type) && (
                          <option value={newServiceDraft.service_type}>{newServiceDraft.service_type}</option>
                        )}
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Name
                      <input
                        className={`${inputClass} mt-1`}
                        value={newServiceDraft.service_name}
                        onChange={(event) => setNewServiceDraft((prev) => ({ ...prev, service_name: event.currentTarget.value }))}
                        placeholder="conversion-service"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Base URL
                      <input
                        className={`${inputClass} mt-1`}
                        value={newServiceDraft.base_url}
                        onChange={(event) => setNewServiceDraft((prev) => ({ ...prev, base_url: event.currentTarget.value }))}
                        placeholder="https://service.example.com"
                      />
                    </label>
                    <div className="text-xs text-muted-foreground md:col-span-3">
                      Config (JSON object)
                      <div className="mt-1 overflow-hidden rounded-md border border-input">
                        <Editor
                          height="140px"
                          language="json"
                          theme={monacoTheme}
                          value={newServiceDraft.configText}
                          onChange={(value) => setNewServiceDraft((prev) => ({ ...prev, configText: value ?? '{}' }))}
                          options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            fontSize: 12,
                            lineNumbers: 'on',
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs"
                      disabled={serviceSavingKey === 'service:create'}
                      onClick={() => void createService()}
                    >
                      {serviceSavingKey === 'service:create' ? 'Creating...' : 'Create Service'}
                    </Button>
                  </div>
                </article>

                {serviceLoading && (
                  <p className="text-sm text-muted-foreground">Loading services...</p>
                )}
                {serviceError && (
                  <ErrorAlert message={serviceError} />
                )}
                {!serviceLoading && !serviceError && serviceRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No registered services found.</p>
                )}

                {!serviceLoading && !serviceError && serviceRows.map((service) => {
                  const functionRows = serviceFunctionsByService.get(service.service_id) ?? [];
                  const serviceButtonKey = `service:${service.service_id}`;
                  const serviceSaveKey = `service:save:${service.service_id}`;
                  const serviceDeleteKey = `service:delete:${service.service_id}`;
                  const serviceDraft = serviceDrafts[service.service_id] ?? serviceToDraft(service);
                  const newFunctionDraft = newFunctionDraftsByService[service.service_id] ?? emptyFunctionDraft();
                  return (
                    <article key={service.service_id} className="rounded-lg bg-transparent p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{service.service_name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-mono">{service.service_type}</span> | <span className="font-mono">{service.base_url}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {service.health_status}
                          </span>
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {service.enabled ? 'enabled' : 'disabled'}
                          </span>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={serviceSavingKey === serviceButtonKey}
                            onClick={() => void toggleServiceEnabled(service)}
                          >
                            {serviceSavingKey === serviceButtonKey
                              ? 'Saving...'
                              : service.enabled
                                ? 'Disable'
                                : 'Enable'}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={serviceSavingKey === serviceSaveKey}
                            onClick={() => void saveServiceDetails(service.service_id)}
                          >
                            {serviceSavingKey === serviceSaveKey ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => setConfigDialogServiceId(service.service_id)}
                          >
                            Config
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={serviceSavingKey === serviceDeleteKey}
                            onClick={() => void deleteService(service.service_id, service.service_name)}
                          >
                            {serviceSavingKey === serviceDeleteKey ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        Updated {formatTimestamp(service.updated_at)}
                      </p>

                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <label className="text-xs text-muted-foreground">
                          Type
                          <select
                            className={`${inputClass} mt-1`}
                            value={serviceDraft.service_type}
                            onChange={(event) => setServiceDrafts((prev) => ({
                              ...prev,
                              [service.service_id]: { ...serviceDraft, service_type: event.currentTarget.value },
                            }))}
                          >
                            {serviceTypes.map((row) => (
                              <option key={row.service_type} value={row.service_type}>{row.service_type}</option>
                            ))}
                            {!serviceTypes.some((row) => row.service_type === serviceDraft.service_type) && (
                              <option value={serviceDraft.service_type}>{serviceDraft.service_type}</option>
                            )}
                          </select>
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Name
                          <input
                            className={`${inputClass} mt-1`}
                            value={serviceDraft.service_name}
                            onChange={(event) => setServiceDrafts((prev) => ({
                              ...prev,
                              [service.service_id]: { ...serviceDraft, service_name: event.currentTarget.value },
                            }))}
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Base URL
                          <input
                            className={`${inputClass} mt-1`}
                            value={serviceDraft.base_url}
                            onChange={(event) => setServiceDrafts((prev) => ({
                              ...prev,
                              [service.service_id]: { ...serviceDraft, base_url: event.currentTarget.value },
                            }))}
                          />
                        </label>
                      </div>

                      <div className="mt-3 overflow-auto rounded-md border border-border">
                        <table className="min-w-full border-collapse text-left text-xs">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-medium">Function</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                              <th className="px-3 py-2 font-medium">Label</th>
                              <th className="px-3 py-2 font-medium">Method</th>
                              <th className="px-3 py-2 font-medium">Entrypoint</th>
                              <th className="px-3 py-2 font-medium">Tags</th>
                              <th className="px-3 py-2 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {functionRows.map((fn) => {
                              const functionButtonKey = `function:${fn.function_id}`;
                              const functionSaveKey = `function:save:${fn.function_id}`;
                              const functionDeleteKey = `function:delete:${fn.function_id}`;
                              const functionDraft = functionDrafts[fn.function_id] ?? functionToDraft(fn);
                              return (
                                <tr key={fn.function_id} className="border-t border-border align-top">
                                  <td className="px-3 py-2 text-foreground">
                                    <input
                                      className={`${inputClass} h-8`}
                                      value={functionDraft.function_name}
                                      onChange={(event) => setFunctionDrafts((prev) => ({
                                        ...prev,
                                        [fn.function_id]: { ...functionDraft, function_name: event.currentTarget.value },
                                      }))}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    <select
                                      className={`${inputClass} h-8`}
                                      value={functionDraft.function_type}
                                      onChange={(event) => setFunctionDrafts((prev) => ({
                                        ...prev,
                                        [fn.function_id]: { ...functionDraft, function_type: event.currentTarget.value },
                                      }))}
                                    >
                                      {FUNCTION_TYPE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    <input
                                      className={`${inputClass} h-8`}
                                      value={functionDraft.label}
                                      onChange={(event) => setFunctionDrafts((prev) => ({
                                        ...prev,
                                        [fn.function_id]: { ...functionDraft, label: event.currentTarget.value },
                                      }))}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    <select
                                      className={`${inputClass} h-8`}
                                      value={functionDraft.http_method}
                                      onChange={(event) => setFunctionDrafts((prev) => ({
                                        ...prev,
                                        [fn.function_id]: { ...functionDraft, http_method: event.currentTarget.value },
                                      }))}
                                    >
                                      {HTTP_METHOD_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-muted-foreground">
                                    <input
                                      className={`${inputClass} h-8`}
                                      value={functionDraft.entrypoint}
                                      onChange={(event) => setFunctionDrafts((prev) => ({
                                        ...prev,
                                        [fn.function_id]: { ...functionDraft, entrypoint: event.currentTarget.value },
                                      }))}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    <input
                                      className={`${inputClass} h-8`}
                                      value={functionDraft.tagsText}
                                      onChange={(event) => setFunctionDrafts((prev) => ({
                                        ...prev,
                                        [fn.function_id]: { ...functionDraft, tagsText: event.currentTarget.value },
                                      }))}
                                      placeholder="tags,comma,separated"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        disabled={serviceSavingKey === functionButtonKey}
                                        onClick={() => void toggleFunctionEnabled(fn)}
                                      >
                                        {serviceSavingKey === functionButtonKey
                                          ? 'Saving...'
                                          : fn.enabled
                                            ? 'Disable'
                                            : 'Enable'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        disabled={serviceSavingKey === functionSaveKey}
                                        onClick={() => void saveFunctionDetails(fn.function_id)}
                                      >
                                        {serviceSavingKey === functionSaveKey ? 'Saving...' : 'Save'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        disabled={serviceSavingKey === functionDeleteKey}
                                        onClick={() => void deleteFunction(fn.function_id, fn.function_name)}
                                      >
                                        {serviceSavingKey === functionDeleteKey ? 'Deleting...' : 'Delete'}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-t border-border align-top">
                              <td className="px-3 py-2">
                                <input
                                  className={`${inputClass} h-8`}
                                  value={newFunctionDraft.function_name}
                                  onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                                    ...prev,
                                    [service.service_id]: { ...newFunctionDraft, function_name: event.currentTarget.value },
                                  }))}
                                  placeholder="new_function_key"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  className={`${inputClass} h-8`}
                                  value={newFunctionDraft.function_type}
                                  onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                                    ...prev,
                                    [service.service_id]: { ...newFunctionDraft, function_type: event.currentTarget.value },
                                  }))}
                                >
                                  {FUNCTION_TYPE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className={`${inputClass} h-8`}
                                  value={newFunctionDraft.label}
                                  onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                                    ...prev,
                                    [service.service_id]: { ...newFunctionDraft, label: event.currentTarget.value },
                                  }))}
                                  placeholder="Display label"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  className={`${inputClass} h-8`}
                                  value={newFunctionDraft.http_method}
                                  onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                                    ...prev,
                                    [service.service_id]: { ...newFunctionDraft, http_method: event.currentTarget.value },
                                  }))}
                                >
                                  {HTTP_METHOD_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className={`${inputClass} h-8`}
                                  value={newFunctionDraft.entrypoint}
                                  onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                                    ...prev,
                                    [service.service_id]: { ...newFunctionDraft, entrypoint: event.currentTarget.value },
                                  }))}
                                  placeholder="/functions/v1/example"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className={`${inputClass} h-8`}
                                  value={newFunctionDraft.tagsText}
                                  onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                                    ...prev,
                                    [service.service_id]: { ...newFunctionDraft, tagsText: event.currentTarget.value },
                                  }))}
                                  placeholder="tags,comma,separated"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={serviceSavingKey === `function:create:${service.service_id}`}
                                  onClick={() => void createFunction(service.service_id)}
                                >
                                  {serviceSavingKey === `function:create:${service.service_id}` ? 'Creating...' : 'Add'}
                                </Button>
                              </td>
                            </tr>
                            {functionRows.length === 0 && (
                              <tr className="border-t border-border">
                                <td className="px-3 py-2 text-muted-foreground" colSpan={7}>
                                  No functions registered for this service.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  );
                })}

                <DialogRoot
                  open={!!configDialogServiceId}
                  onOpenChange={(details) => {
                    if (!details.open) setConfigDialogServiceId(null);
                  }}
                >
                  <DialogContent className="w-[960px] max-w-[calc(100vw-2rem)]">
                    <DialogCloseTrigger />
                    <DialogTitle>{`Service Config: ${activeConfigServiceName}`}</DialogTitle>
                    <DialogDescription>Edit service-level JSON config.</DialogDescription>
                    <DialogBody>
                      <div className="overflow-hidden rounded-md border border-input">
                        <Editor
                          height="320px"
                          language="json"
                          theme={monacoTheme}
                          value={activeConfigServiceDraft?.configText ?? '{}'}
                          onChange={(value) => {
                            if (!configDialogServiceId) return;
                            setServiceDrafts((prev) => {
                              const current = prev[configDialogServiceId];
                              if (!current) return prev;
                              return {
                                ...prev,
                                [configDialogServiceId]: {
                                  ...current,
                                  configText: value ?? '{}',
                                },
                              };
                            });
                          }}
                          options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            fontSize: 12,
                            lineNumbers: 'on',
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    </DialogBody>
                    <DialogFooter>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => setConfigDialogServiceId(null)}
                      >
                        Close
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={!configDialogServiceId || serviceSavingKey === `service:save:${configDialogServiceId}`}
                        onClick={() => {
                          if (!configDialogServiceId) return;
                          void saveServiceDetails(configDialogServiceId);
                        }}
                      >
                        {configDialogServiceId && serviceSavingKey === `service:save:${configDialogServiceId}` ? 'Saving...' : 'Save Config'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </DialogRoot>
              </div>
            )}
            {selectedCategory === 'design' && (
              <div className="space-y-8">
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Icons</h2>
                  <IconStandardsPreview />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Typography</h2>
                  <FontStandardsPreview />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Color Contract (Day / Night)</h2>
                  <ColorContractPreview />
                </div>
              </div>
            )}

            {selectedCategory === 'design-shell' && (
              <AppShellSpecsPreview />
            )}

            {selectedCategory === 'design-icons' && (
              <div className="space-y-3">
                <div>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={refreshingInventory}
                    onClick={refreshComponentInventory}
                  >
                    {refreshingInventory ? 'Refreshing...' : 'Refresh Icon Inventory'}
                  </Button>
                </div>
                {inventoryReport && (
                  <p className="text-xs text-muted-foreground">
                    Scope: <span className="font-mono">{inventoryReport.scope}</span> | Icons: <span className="font-mono">{totalTrackedIcons}</span> | Total refs: <span className="font-mono">{inventoryReport.categoryTotals['tabler-icons'] ?? 0}</span>
                  </p>
                )}

                <article className="rounded-lg bg-transparent p-4">
                  {inventoryLoading && (
                    <p className="text-sm text-muted-foreground">Loading icon inventory...</p>
                  )}
                  {inventoryError && (
                    <ErrorAlert message={inventoryError} />
                  )}
                  {!inventoryLoading && !inventoryError && iconInventoryRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">No icons found in auth pages.</p>
                  )}
                  {!inventoryLoading && !inventoryError && iconInventoryRows.length > 0 && (
                    <div className="overflow-auto rounded-md border border-border">
                      <table className="min-w-full border-collapse text-left text-xs">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Preview</th>
                            <th className="px-3 py-2 font-medium">Icon</th>
                            <th className="px-3 py-2 font-medium">Count</th>
                            <th className="px-3 py-2 font-medium">Hugeicons Link</th>
                            <th className="px-3 py-2 font-medium">Used In</th>
                          </tr>
                        </thead>
                        <tbody>
                          {iconInventoryRows.map((row) => {
                            const IconPreview = resolveIconComponent(row.icon);
                            return (
                              <tr key={row.icon} className="border-t border-border align-top">
                                <td className="px-3 py-2">
                                  {IconPreview ? (
                                    <AppIcon icon={IconPreview} context="content" tone="muted" />
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono text-foreground">{row.icon}</td>
                                <td className="px-3 py-2 text-foreground">{row.usageCount}</td>
                                <td className="px-3 py-2">
                                  <a
                                    href={hugeiconsSearchHref(row.icon)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary underline-offset-2 hover:underline"
                                  >
                                    Search
                                  </a>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {row.pages.join(', ')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              </div>
            )}
            {selectedCategory === 'audit' && (
              <div className="space-y-4">
                <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_220px_130px_auto]">
                  <Field.Root>
                    <Field.Input
                      className={inputClass}
                      value={auditSearch}
                      onChange={(event) => setAuditSearch(event.currentTarget.value)}
                      placeholder="Search policy, actor, reason, change"
                    />
                  </Field.Root>
                  <select
                    className={inputClass}
                    value={auditActorFilter}
                    onChange={(event) => setAuditActorFilter(event.currentTarget.value)}
                  >
                    {auditActorOptions.map((actor) => (
                      <option key={actor} value={actor}>
                        {actor === 'all' ? 'All actors' : actor}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    value={auditRangeFilter}
                    onChange={(event) => setAuditRangeFilter(event.currentTarget.value as AuditTimeRange)}
                  >
                    <option value="24h">Last 24h</option>
                    <option value="7d">Last 7d</option>
                    <option value="30d">Last 30d</option>
                    <option value="all">All time</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAuditSearch('');
                      setAuditActorFilter('all');
                      setAuditRangeFilter('7d');
                    }}
                  >
                    Reset filters
                  </Button>
                </div>

                <div className="overflow-auto rounded-md border border-border">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">When</th>
                        <th className="px-3 py-2 font-medium">Policy</th>
                        <th className="px-3 py-2 font-medium">Actor</th>
                        <th className="px-3 py-2 font-medium">Reason</th>
                        <th className="px-3 py-2 font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditRows.map((row) => {
                        const selected = selectedAuditRow?.audit_id === row.audit_id;
                        return (
                          <tr
                            key={row.audit_id}
                            className={cn(
                              'cursor-pointer border-t border-border align-top hover:bg-accent/40',
                              selected && 'bg-accent/55',
                            )}
                            onClick={() => setSelectedAuditId(row.audit_id)}
                          >
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {formatTimestamp(row.changed_at)}
                            </td>
                            <td className="px-3 py-2 font-medium text-foreground">{row.policy_key}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.changed_by ?? 'system'}</td>
                            <td className="max-w-[320px] truncate px-3 py-2 text-muted-foreground" title={row.reason ?? ''}>
                              {row.reason?.trim() || '-'}
                            </td>
                            <td className="max-w-[420px] truncate px-3 py-2 text-foreground" title={summarizeAuditChange(row)}>
                              {summarizeAuditChange(row)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredAuditRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No audit entries match current filters.</p>
                )}

                {selectedAuditRow && (
                  <article className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{selectedAuditRow.policy_key}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTimestamp(selectedAuditRow.changed_at)}
                          {' · '}
                          {selectedAuditRow.changed_by ?? 'system'}
                          {' · '}
                          audit_id={selectedAuditRow.audit_id}
                        </p>
                      </div>
                      <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground">
                        {summarizeAuditChange(selectedAuditRow)}
                      </span>
                    </div>

                    {selectedAuditRow.reason?.trim() && (
                      <p className="mt-3 text-sm text-foreground">{selectedAuditRow.reason}</p>
                    )}

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Old</p>
                        <textarea
                          readOnly
                          rows={14}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                          value={stringifyValue(selectedAuditRow.old_value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">New</p>
                        <textarea
                          readOnly
                          rows={14}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                          value={stringifyValue(selectedAuditRow.new_value)}
                        />
                      </div>
                    </div>
                  </article>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}


