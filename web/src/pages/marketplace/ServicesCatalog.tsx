import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import MarketplaceGrid from '@/components/marketplace/MarketplaceGrid';
import type { CategoryOption, MarketplaceService, ServiceFunction } from '@/components/marketplace/types';
import { supabase } from '@/lib/supabase';
import { getServiceTypeLabel } from '@/pages/settings/services-panel.types';

function buildCategories(items: MarketplaceService[]): CategoryOption[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const s of items) {
    const existing = counts.get(s.service_type);
    if (existing) {
      existing.count++;
    } else {
      counts.set(s.service_type, { label: s.service_type_label, count: 1 });
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([value, { label, count }]) => ({ value, label, count }));
}

function iconColor(name: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EB5E41',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#EF4444',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length]!;
}

const HEALTH_COLORS: Record<string, string> = {
  online: '#10B981',
  healthy: '#10B981',
  degraded: '#F59E0B',
  offline: '#EF4444',
  unknown: '#6B7280',
};

function ServiceCard({ service }: { service: MarketplaceService }) {
  const fnTypes = [...new Set(service.functions.map((f) => f.function_type))];
  const healthColor = HEALTH_COLORS[service.health_status] ?? HEALTH_COLORS.unknown;
  const normalizedHealth = service.health_status.trim().toLowerCase();

  return (
    <Link
      to={`/app/marketplace/services/${service.service_id}`}
      className="flex flex-col gap-3 p-4 bg-card border border-border rounded-xl no-underline text-inherit transition-all hover:border-primary hover:ring-1 hover:ring-primary"
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: iconColor(service.service_name) }}
        >
          {service.service_name.charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[0.9375rem] text-foreground leading-tight flex items-center gap-1.5">
            {service.service_name}
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: healthColor }}
              title={service.health_status}
            />
          </span>
          <span className="text-xs text-muted-foreground">
            {service.functions.length} function{service.functions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[0.6875rem] font-medium">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: healthColor }}
            aria-hidden
          />
          {`Health: ${normalizedHealth}`}
        </span>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-primary">
          {service.service_type_label}
        </span>
        {service.primary_stage && (
          <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-700 dark:text-violet-300">
            {service.primary_stage}
          </span>
        )}
      </div>

      <p className="text-[0.8125rem] text-muted-foreground leading-relaxed m-0 line-clamp-2">
        {service.description
          ? service.description.length > 100
            ? service.description.slice(0, 100) + '...'
            : service.description
          : `${service.service_type_label} service`}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex flex-wrap gap-1">
        {fnTypes.slice(0, 2).map((ft) => (
          <span
            key={ft}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-muted text-muted-foreground"
          >
            {ft}
          </span>
        ))}
        </div>
        <span className="text-xs font-medium text-primary">
          View details
        </span>
      </div>
    </Link>
  );
}

async function fetchServices(): Promise<MarketplaceService[]> {
  // Fetch services with their type labels
  const { data: servicesData, error: svcErr } = await supabase
    .from('service_registry')
    .select('service_id, service_type, service_name, description, docs_url, health_status, primary_stage')
    .eq('enabled', true)
    .order('service_name');

  if (svcErr || !servicesData) return [];

  // Fetch all functions for enabled services
  const serviceIds = servicesData.map((s) => s.service_id);
  const { data: fnData, error: fnErr } = await supabase
    .from('service_functions')
    .select('function_id, service_id, function_name, function_type, label, description, tags, beta, deprecated')
    .in('service_id', serviceIds)
    .eq('enabled', true)
    .order('label');

  if (fnErr) return [];

  // Group functions by service_id
  const fnByService = new Map<string, ServiceFunction[]>();
  for (const fn of fnData ?? []) {
    const list = fnByService.get(fn.service_id) ?? [];
    list.push({
      function_id: fn.function_id,
      function_name: fn.function_name,
      function_type: fn.function_type,
      label: fn.label,
      description: fn.description,
      tags: (fn.tags as string[]) ?? [],
      beta: fn.beta,
      deprecated: fn.deprecated,
    });
    fnByService.set(fn.service_id, list);
  }

  return servicesData.map((s) => ({
    service_id: s.service_id,
    service_type: s.service_type,
    service_type_label: getServiceTypeLabel(s.service_type),
    service_name: s.service_name,
    description: s.description,
    docs_url: s.docs_url,
    health_status: s.health_status,
    primary_stage: s.primary_stage ?? null,
    functions: fnByService.get(s.service_id) ?? [],
  }));
}

export default function ServicesCatalog() {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices().then((data) => {
      setServices(data);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => buildCategories(services), [services]);

  const searchFields = useCallback(
    (s: MarketplaceService) =>
      [
        s.service_name,
        s.service_type_label,
        s.description ?? '',
        ...s.functions.map((f) => `${f.label} ${f.description ?? ''}`),
        ...s.functions.flatMap((f) => f.tags),
      ].join(' '),
    [],
  );

  const matchesCategory = useCallback(
    (s: MarketplaceService, cat: string) => s.service_type === cat,
    [],
  );

  const renderCard = useCallback(
    (s: MarketplaceService) => <ServiceCard key={s.service_id} service={s} />,
    [],
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Services" subtitle="Registered platform services" />
        <div className="min-h-0 flex-1 px-4 pb-4">
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Services" subtitle="Registered platform services" />
        <div className="min-h-0 flex-1 px-4 pb-4">
          <p className="text-muted-foreground italic">
            No services registered yet. Services will appear here once they are deployed and enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Services" subtitle="Registered platform services — APIs, converters, pipelines, and more" />
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-2 pb-4">
        <MarketplaceGrid
          items={services}
          categories={categories}
          searchFields={searchFields}
          matchesCategory={matchesCategory}
          renderCard={renderCard}
          emptyMessage="No services match your search."
        />
      </div>
    </div>
  );
}
