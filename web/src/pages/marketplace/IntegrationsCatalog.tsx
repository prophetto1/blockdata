import { useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import MarketplaceGrid from '@/components/marketplace/MarketplaceGrid';
import type { CategoryOption, IntegrationProvider } from '@/components/marketplace/types';

// Static JSON — regenerated via `npx tsx scripts/dump-marketplace-data.ts`
let providers: IntegrationProvider[] = [];
try {
  providers = (await import('@/data/integrations.json')).default as IntegrationProvider[];
} catch {
  // data file not yet generated
}

function displayName(provider: IntegrationProvider): string {
  if (provider.provider_name !== provider.plugin_group) return provider.provider_name;
  const parts = provider.plugin_group.split('.');
  const last = parts[parts.length - 1] ?? provider.plugin_group;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function buildCategories(items: IntegrationProvider[]): CategoryOption[] {
  const counts = new Map<string, number>();
  for (const p of items) {
    const seen = new Set<string>();
    for (const t of p.tasks) {
      for (const c of t.categories) {
        if (!seen.has(c)) {
          seen.add(c);
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}

function iconColor(name: string): string {
  const colors = [
    '#EB5E41', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#EF4444',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length]!;
}

function IntegrationCard({ provider }: { provider: IntegrationProvider }) {
  const name = displayName(provider);
  const allCats = [...new Set(provider.tasks.flatMap((t) => t.categories))];
  const desc =
    provider.tasks[0]?.task_description?.slice(0, 100) ??
    `${provider.tasks.length} integration tasks`;

  return (
    <a
      key={provider.plugin_group}
      href={provider.provider_docs_url ?? undefined}
      target={provider.provider_docs_url ? '_blank' : undefined}
      rel={provider.provider_docs_url ? 'noopener noreferrer' : undefined}
      className="flex flex-col gap-2 p-4 bg-card border border-border rounded-xl no-underline text-inherit transition-all hover:border-primary hover:ring-1 hover:ring-primary"
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: iconColor(name) }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[0.9375rem] text-foreground leading-tight">
            {name}
          </span>
          <span className="text-xs text-muted-foreground">
            {provider.tasks.length} task{provider.tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <p className="text-[0.8125rem] text-muted-foreground leading-relaxed m-0 line-clamp-2">
        {desc.length < 100 ? desc : desc + '...'}
      </p>

      <div className="flex flex-wrap gap-1 mt-auto">
        {allCats.slice(0, 3).map((c) => (
          <span
            key={c}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-primary/10 text-primary"
          >
            {c}
          </span>
        ))}
        {provider.auth_type && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-muted text-muted-foreground">
            {provider.auth_type}
          </span>
        )}
      </div>
    </a>
  );
}

export default function IntegrationsCatalog() {
  const categories = useMemo(() => buildCategories(providers), []);

  const searchFields = useCallback(
    (p: IntegrationProvider) =>
      [
        displayName(p),
        p.plugin_group,
        ...p.tasks.map((t) => `${t.task_title ?? ''} ${t.task_description ?? ''}`),
        ...p.tasks.flatMap((t) => t.categories),
      ].join(' '),
    [],
  );

  const matchesCategory = useCallback(
    (p: IntegrationProvider, cat: string) =>
      p.tasks.some((t) => t.categories.includes(cat)),
    [],
  );

  const renderCard = useCallback(
    (p: IntegrationProvider) => <IntegrationCard key={p.plugin_group} provider={p} />,
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Integrations" subtitle="Browse available integration plugins" />
      <div className="min-h-0 flex-1 px-4 pb-4">
        {providers.length === 0 ? (
          <p className="text-muted-foreground italic">
            No integrations loaded. Run <code>npx tsx scripts/dump-marketplace-data.ts</code> to generate data.
          </p>
        ) : (
          <MarketplaceGrid
            items={providers}
            categories={categories}
            searchFields={searchFields}
            matchesCategory={matchesCategory}
            renderCard={renderCard}
            emptyMessage="No integrations match your search."
          />
        )}
      </div>
    </div>
  );
}