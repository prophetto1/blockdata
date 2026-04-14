import { startTransition, useEffect, useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  GcpCostInventoryGrid,
  type GcpCostInventoryRow,
} from '@/components/superuser/GcpCostInventoryGrid';
import { platformApiFetch } from '@/lib/platformApi';
import { SettingsPageFrame } from '@/pages/settings/SettingsPageHeader';

type BillingAccountOption = {
  id: string;
  label: string;
};

type GcpCostInventorySummary = {
  provider: 'gcp';
  configured: boolean;
  source_table_fqn: string | null;
  invoice_month: string;
  currency: string | null;
  total_cost: number;
  row_count: number;
  truncated: boolean;
  available_filters: {
    billing_accounts: BillingAccountOption[];
    service_categories: string[];
    services: string[];
  };
  generated_at: string;
  error?: string;
};

type GcpCostInventoryItemsResponse = {
  provider: 'gcp';
  invoice_month: string;
  truncated: boolean;
  row_count: number;
  rows: GcpCostInventoryRow[];
  generated_at: string;
};

type FilterState = {
  invoiceMonth: string;
  billingAccountId: string;
  serviceCategory: string;
  service: string;
  projectId: string;
  search: string;
};

const EMPTY_FILTERS: FilterState = {
  invoiceMonth: '',
  billingAccountId: '',
  serviceCategory: '',
  service: '',
  projectId: '',
  search: '',
};

const selectClassName =
  'flex h-10 min-w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function buildQueryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    searchParams.set(key, value);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function readPlatformApiJson<T>(path: string): Promise<T> {
  const response = await platformApiFetch(path);
  const body = (await response.json().catch(() => null)) as
    | (T & { detail?: string })
    | null;

  if (!response.ok) {
    if (
      response.status === 404 &&
      path.startsWith('/admin/cloud-costs/gcp/') &&
      body &&
      typeof body === 'object' &&
      body.detail === 'Not Found'
    ) {
      throw new Error(
        'The running platform-api process does not have the GCP cost inventory routes loaded yet. Recover or restart platform-api, then reload this page.',
      );
    }

    throw new Error(
      body && typeof body === 'object' && typeof body.detail === 'string'
        ? body.detail
        : `Request failed: ${response.status}`,
    );
  }

  return body as T;
}

function formatInvoiceMonth(invoiceMonth: string) {
  if (!/^\d{6}$/.test(invoiceMonth)) return invoiceMonth || 'Unresolved';
  return `${invoiceMonth.slice(0, 4)}-${invoiceMonth.slice(4, 6)}`;
}

function formatTotalCost(totalCost: number, currency: string | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalCost);
}

function formatConfigMissingMessage(error?: string) {
  const trimmed = error?.trim();
  if (!trimmed || trimmed.startsWith('GCP billing export is not configured.')) {
    return 'Enable Cloud Billing export to BigQuery in Google Cloud Console, then set GCP_BILLING_BIGQUERY_PROJECT_ID, GCP_BILLING_BIGQUERY_DATASET, and GCP_BILLING_BIGQUERY_TABLE in `.env` and restart platform-api.';
  }
  return trimmed;
}

export function Component() {
  useShellHeaderTitle({
    title: 'GCP Cost Inventory',
    breadcrumbs: ['Superuser', 'GCP Cost Inventory'],
  });

  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [summary, setSummary] = useState<GcpCostInventorySummary | null>(null);
  const [items, setItems] = useState<GcpCostInventoryItemsResponse | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoadingSummary(true);
      setSummaryError(null);
      setItemsError(null);
      try {
        const nextSummary = await readPlatformApiJson<GcpCostInventorySummary>(
          `/admin/cloud-costs/gcp/summary${buildQueryString({
            invoice_month: appliedFilters.invoiceMonth.trim() || undefined,
            billing_account_id: appliedFilters.billingAccountId || undefined,
          })}`,
        );
        if (cancelled) return;
        setSummary(nextSummary);
        if (!nextSummary.configured) {
          setItems(null);
        }
      } catch (error) {
        if (cancelled) return;
        setSummary(null);
        setItems(null);
        setSummaryError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [appliedFilters.billingAccountId, appliedFilters.invoiceMonth]);

  useEffect(() => {
    if (!summary?.configured) {
      setLoadingItems(false);
      return;
    }

    const activeInvoiceMonth = summary.invoice_month;
    let cancelled = false;

    async function loadItems() {
      setLoadingItems(true);
      setItemsError(null);
      try {
        const nextItems = await readPlatformApiJson<GcpCostInventoryItemsResponse>(
          `/admin/cloud-costs/gcp/items${buildQueryString({
            invoice_month: activeInvoiceMonth,
            billing_account_id: appliedFilters.billingAccountId || undefined,
            service_category: appliedFilters.serviceCategory || undefined,
            service: appliedFilters.service || undefined,
            project_id: appliedFilters.projectId.trim() || undefined,
            search: appliedFilters.search.trim() || undefined,
          })}`,
        );
        if (cancelled) return;
        setItems(nextItems);
      } catch (error) {
        if (cancelled) return;
        setItems(null);
        setItemsError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) {
          setLoadingItems(false);
        }
      }
    }

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [
    appliedFilters.billingAccountId,
    appliedFilters.projectId,
    appliedFilters.search,
    appliedFilters.service,
    appliedFilters.serviceCategory,
    summary?.configured,
    summary?.invoice_month,
  ]);

  const canRenderGrid = !!summary?.configured && !summaryError;
  const summaryCards = useMemo(
    () =>
      summary?.configured
        ? [
            { label: 'Invoice Month', value: formatInvoiceMonth(summary.invoice_month) },
            { label: 'Total Cost', value: formatTotalCost(summary.total_cost, summary.currency) },
            { label: 'Rows', value: summary.row_count.toLocaleString() },
            { label: 'Source Table', value: summary.source_table_fqn ?? 'Unavailable' },
          ]
        : [],
    [summary],
  );

  return (
    <SettingsPageFrame
      title="GCP Cost Inventory"
      description="Read the normalized BigQuery billing export through platform-api and inspect one invoice-month slice in a single operator table."
      headerVariant="admin"
      toolbar={(
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-muted-foreground">
            Invoice Month
            <Input
              value={draftFilters.invoiceMonth}
              onChange={(event) => {
                const invoiceMonth = event.currentTarget.value;
                setDraftFilters((current) => ({
                  ...current,
                  invoiceMonth,
                }));
              }}
              placeholder="YYYYMM"
            />
          </label>

          <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium text-muted-foreground">
            Billing Account
            <select
              className={selectClassName}
              value={draftFilters.billingAccountId}
              onChange={(event) => {
                const billingAccountId = event.currentTarget.value;
                setDraftFilters((current) => ({
                  ...current,
                  billingAccountId,
                }));
              }}
              disabled={!summary?.available_filters.billing_accounts.length}
            >
              <option value="">All billing accounts</option>
              {summary?.available_filters.billing_accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium text-muted-foreground">
            Service Category
            <select
              className={selectClassName}
              value={draftFilters.serviceCategory}
              onChange={(event) => {
                const serviceCategory = event.currentTarget.value;
                setDraftFilters((current) => ({
                  ...current,
                  serviceCategory,
                }));
              }}
              disabled={!summary?.configured}
            >
              <option value="">All categories</option>
              {summary?.available_filters.service_categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[220px] flex-col gap-1 text-xs font-medium text-muted-foreground">
            Service
            <select
              className={selectClassName}
              value={draftFilters.service}
              onChange={(event) => {
                const service = event.currentTarget.value;
                setDraftFilters((current) => ({
                  ...current,
                  service,
                }));
              }}
              disabled={!summary?.configured}
            >
              <option value="">All services</option>
              {summary?.available_filters.services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium text-muted-foreground">
            Project ID
            <Input
              value={draftFilters.projectId}
              onChange={(event) => {
                const projectId = event.currentTarget.value;
                setDraftFilters((current) => ({
                  ...current,
                  projectId,
                }));
              }}
              placeholder="project-id"
            />
          </label>

          <label className="flex min-w-[220px] flex-col gap-1 text-xs font-medium text-muted-foreground">
            Search
            <Input
              value={draftFilters.search}
              onChange={(event) => {
                const search = event.currentTarget.value;
                setDraftFilters((current) => ({
                  ...current,
                  search,
                }));
              }}
              placeholder="service, SKU, project, resource..."
            />
          </label>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setAppliedFilters({ ...draftFilters });
                });
              }}
            >
              Apply Filters
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDraftFilters(EMPTY_FILTERS);
                startTransition(() => {
                  setAppliedFilters(EMPTY_FILTERS);
                });
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        {summaryError && <ErrorAlert message={summaryError} />}
        {itemsError && <ErrorAlert message={itemsError} />}

        {loadingSummary && (
          <div className="rounded-md border border-border px-4 py-6 text-sm text-muted-foreground">
            Loading GCP billing summary...
          </div>
        )}

        {!loadingSummary && summary?.configured === false && (
          <div
            data-testid="gcp-cost-config-missing"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-foreground"
          >
            <p className="font-medium">
              Cloud Billing export is not connected for this local platform-api environment.
            </p>
            <p className="mt-1 text-muted-foreground">
              {formatConfigMissingMessage(summary.error)}
            </p>
          </div>
        )}

        {!loadingSummary && summaryCards.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-md border border-border bg-card px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {card.label}
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {canRenderGrid && (
          <GcpCostInventoryGrid
            rows={items?.rows ?? []}
            loading={loadingItems}
            truncated={items?.truncated ?? false}
            errorMessage={itemsError}
          />
        )}
      </div>
    </SettingsPageFrame>
  );
}
