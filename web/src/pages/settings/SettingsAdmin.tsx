import { Field } from '@ark-ui/react/field';
import { NumberInput } from '@ark-ui/react/number-input';
import { Switch } from '@ark-ui/react/switch';
import { TagsInput } from '@ark-ui/react/tags-input';
import * as TablerIcons from '@tabler/icons-react';
import { IconAlertTriangle, IconDatabase, IconSparkles } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/ui/app-icon';
import { ErrorAlert } from '@/components/common/ErrorAlert';
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

type AdminServicesResponse = {
  superuser: { user_id: string; email: string };
  services: ServiceRow[];
  functions: ServiceFunctionRow[];
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

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const SIZE_ORDER: IconSizeToken[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
const STROKE_ORDER: IconStrokeToken[] = ['light', 'regular', 'strong'];
const TONE_ORDER: IconToneToken[] = ['default', 'muted', 'accent', 'success', 'warning', 'danger'];
const CONTEXT_ORDER: IconContextToken[] = ['inline', 'content', 'nav', 'hero'];

const FAMILY_ORDER: FontFamilyToken[] = ['sans', 'mono'];
const FONT_SIZE_ORDER: FontSizeToken[] = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
const WEIGHT_ORDER: FontWeightToken[] = ['normal', 'medium', 'semibold', 'bold'];

function useLiveCssVar(cssVar: string): string {
  const [value, setValue] = useState('');
  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    setValue(raw || '—');
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
                  {size.rem} ({size.px}px) — {size.note}
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
                  {weight.value} — {weight.note}
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
          {' · '}Default size: <span className="font-medium text-foreground">{ICON_STANDARD.defaultSize}</span>
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
                    → {resolvedSize} ({ICON_SIZES[resolvedSize]}px)
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [refreshingInventory, setRefreshingInventory] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryReport, setInventoryReport] = useState<ComponentInventoryReport | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [serviceFunctions, setServiceFunctions] = useState<ServiceFunctionRow[]>([]);
  const [serviceSavingKey, setServiceSavingKey] = useState<string | null>(null);

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
      setServiceRows(Array.isArray(data.services) ? data.services : []);
      setServiceFunctions(Array.isArray(data.functions) ? data.functions : []);
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
          <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4" style={{ backgroundColor: styleTokens.adminConfig.contentBackground }}>
            {selectedCategory !== 'audit' && selectedCategory !== 'services' && selectedCategory !== 'design' && selectedCategory !== 'design-shell' && selectedCategory !== 'design-icons' && (
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
                <div>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={serviceLoading}
                    onClick={() => void loadServices()}
                  >
                    {serviceLoading ? 'Refreshing...' : 'Refresh Services'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Services: <span className="font-mono">{serviceRows.length}</span> · Functions: <span className="font-mono">{serviceFunctions.length}</span>
                </p>

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
                  return (
                    <article key={service.service_id} className="rounded-lg bg-transparent p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{service.service_name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-mono">{service.service_type}</span> · <span className="font-mono">{service.base_url}</span>
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
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        Updated {formatTimestamp(service.updated_at)}
                      </p>

                      <div className="mt-3 overflow-auto rounded-md border border-border">
                        <table className="min-w-full border-collapse text-left text-xs">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-medium">Function</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                              <th className="px-3 py-2 font-medium">Method</th>
                              <th className="px-3 py-2 font-medium">Entrypoint</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {functionRows.map((fn) => {
                              const functionButtonKey = `function:${fn.function_id}`;
                              return (
                                <tr key={fn.function_id} className="border-t border-border align-top">
                                  <td className="px-3 py-2 text-foreground">{fn.function_name}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{fn.function_type}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{fn.http_method}</td>
                                  <td className="px-3 py-2 font-mono text-muted-foreground">{fn.entrypoint}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{fn.enabled ? 'enabled' : 'disabled'}</td>
                                  <td className="px-3 py-2">
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
                                  </td>
                                </tr>
                              );
                            })}
                            {functionRows.length === 0 && (
                              <tr className="border-t border-border">
                                <td className="px-3 py-2 text-muted-foreground" colSpan={6}>
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
                    Scope: <span className="font-mono">{inventoryReport.scope}</span> · Icons: <span className="font-mono">{totalTrackedIcons}</span> · Total refs: <span className="font-mono">{inventoryReport.categoryTotals['tabler-icons'] ?? 0}</span>
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
              <div className="space-y-3">
                {auditRows.map((row) => (
                  <article key={row.audit_id} className="rounded-lg bg-transparent p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{row.policy_key}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTimestamp(row.changed_at)}
                          {row.changed_by ? ` - ${row.changed_by}` : ''}
                        </p>
                        {row.reason && (
                          <p className="mt-2 text-sm text-foreground">{row.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Old</p>
                        <textarea
                          readOnly
                          rows={3}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                          value={stringifyValue(row.old_value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">New</p>
                        <textarea
                          readOnly
                          rows={3}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                          value={stringifyValue(row.new_value)}
                        />
                      </div>
                    </div>
                  </article>
                ))}
                {auditRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No audit entries yet.</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

