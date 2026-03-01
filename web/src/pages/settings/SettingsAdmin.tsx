import { Field } from '@ark-ui/react/field';
import * as TablerIcons from '@tabler/icons-react';
import { IconAlertTriangle, IconDatabase, IconSparkles } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/ui/app-icon';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  ScrollAreaContent,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@/components/ui/scroll-area';
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
import { styleTokens } from '@/lib/styleTokens';
import { cn } from '@/lib/utils';
import { edgeFetch } from '@/lib/edge';
import { InstanceConfigPanel } from './InstanceConfigPanel';
import { IntegrationCatalogPanel } from './IntegrationCatalogPanel';
import { IntegrationCatalogPanelTemp } from './IntegrationCatalogPanelTemp';
import { PlatformConfigPanel } from './PlatformConfigPanel';
import { ServicesPanel } from './ServicesPanel';
import { CATEGORY_IDS, type CategoryId } from './settings-tabs';

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
  audit: AuditRow[];
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

type PageLayoutRule = {
  rule: string;
  detail: string;
};

const PAGE_LAYOUT_RULES: PageLayoutRule[] = [
  {
    rule: 'Header title only',
    detail: 'Each admin page frame shows the page title in the header bar. No group label pills, no sub-tab buttons, no separator below the header.',
  },
  {
    rule: 'Sidebar owns navigation',
    detail: 'The settings second rail (left nav) is the sole navigation surface. Peer pages within a group are listed there — never duplicated inside the content area.',
  },
  {
    rule: 'No redundant context badges',
    detail: 'Group names (Runtime, Operations, Design) appear only in the sidebar group headers, not repeated as pills or breadcrumbs inside the page.',
  },
  {
    rule: 'Full-bleed content',
    detail: 'After the header, the content area fills all remaining vertical space with standard padding (p-3 md:p-4). No intermediate chrome between header and content.',
  },
];

type Category = {
  id: CategoryId;
  label: string;
};

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

const CATEGORIES: Category[] = [
  { id: 'services', label: 'Services' },
  { id: 'platform-config', label: 'Platform' },
  { id: 'integration-catalog-temp', label: 'Integration Catalog' },
  { id: 'design', label: 'Design Standards' },
  { id: 'design-shell', label: 'App Shell Specs' },
  { id: 'design-icons', label: 'Icon Inventory' },
  { id: 'audit', label: 'Audit History' },
  { id: 'instance-config', label: 'Instance Config' },
];

function toCategoryId(value: string | undefined): CategoryId | null {
  if (!value) return null;
  return CATEGORY_IDS.includes(value as CategoryId) ? (value as CategoryId) : null;
}

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
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

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

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

function PageLayoutStandardPreview() {
  return (
    <div className="space-y-4">
      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Admin Page Frame Standard</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Every admin settings page follows a single layout contract. The sidebar nav is the sole navigation surface;
          the page frame shows only a header title and content. No group pills, sub-tab bars, or extra separators.
        </p>
      </article>

      <div className="overflow-auto rounded-md border border-border">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Rule</th>
              <th className="px-3 py-2 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {PAGE_LAYOUT_RULES.map((r) => (
              <tr key={r.rule} className="border-t border-border align-top">
                <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{r.rule}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <article className="rounded-lg bg-transparent p-4">
        <h3 className="text-sm font-semibold text-foreground">Frame Anatomy</h3>
        <pre className="mt-2 rounded-md border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground leading-relaxed">{
`┌─────────────────────────────────────┐
│  Header: page title  │  action btn  │  ← border-b only
├─────────────────────────────────────┤
│                                     │
│  Content area (p-3 md:p-4)          │
│  Full remaining height              │
│                                     │
└─────────────────────────────────────┘`
        }</pre>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('all');
  const [auditRangeFilter, setAuditRangeFilter] = useState<AuditTimeRange>('7d');
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [refreshingInventory, setRefreshingInventory] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryReport, setInventoryReport] = useState<ComponentInventoryReport | null>(null);

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
      setAuditRows(data.audit);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedCategory = useMemo(() => toCategoryId(category), [category]);

  const selectedCategoryDef = useMemo(() => {
    if (!selectedCategory) return null;
    return CATEGORIES.find((c) => c.id === selectedCategory) ?? null;
  }, [selectedCategory]);

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
    return <Navigate to="/app/settings/admin/services" replace />;
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
        <p className="text-sm text-muted-foreground">Loading admin configuration...</p>
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
          {selectedCategory === 'services'
            || selectedCategory === 'integration-catalog'
            || selectedCategory === 'integration-catalog-temp'
            || selectedCategory === 'design' ? (
            <ScrollAreaRoot className="min-h-0 flex-1">
              <ScrollAreaViewport
                className="h-full p-3 md:p-4"
                style={{ backgroundColor: styleTokens.adminConfig.contentBackground }}
              >
                <ScrollAreaContent>
                  {selectedCategory === 'services' && (
                    <ServicesPanel />
                  )}
                  {selectedCategory === 'integration-catalog' && (
                    <IntegrationCatalogPanel />
                  )}
                  {selectedCategory === 'integration-catalog-temp' && (
                    <IntegrationCatalogPanelTemp />
                  )}
                  {selectedCategory === 'design' && (
                    <div className="space-y-8">
                      <div>
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Page Layout</h2>
                        <PageLayoutStandardPreview />
                      </div>
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
                </ScrollAreaContent>
              </ScrollAreaViewport>
              <ScrollAreaScrollbar orientation="vertical">
                <ScrollAreaThumb />
              </ScrollAreaScrollbar>
            </ScrollAreaRoot>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4" style={{ backgroundColor: styleTokens.adminConfig.contentBackground }}>
            {selectedCategory === 'platform-config' && (
              <PlatformConfigPanel />
            )}
            {selectedCategory === 'integration-catalog' && (
              <IntegrationCatalogPanel />
            )}
            {selectedCategory === 'integration-catalog-temp' && (
              <IntegrationCatalogPanelTemp />
            )}
            {selectedCategory === 'instance-config' && (
              <InstanceConfigPanel />
            )}
            {selectedCategory === 'design' && (
              <div className="space-y-8">
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Page Layout</h2>
                  <PageLayoutStandardPreview />
                </div>
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
          )}
        </section>
      )}
    </div>
  );
}
