import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type PostSortRowsParams,
  type ValueFormatterParams,
} from 'ag-grid-community';
import { createAppGridTheme } from '@/lib/agGridTheme';
import { useIsDark } from '@/lib/useIsDark';

ModuleRegistry.registerModules([AllCommunityModule]);

export type GcpCostInventoryRow = {
  billing_account_id: string;
  service_category: string;
  service: string;
  sku: string;
  project_id: string | null;
  project_name: string | null;
  resource_name: string | null;
  resource_global_name: string | null;
  location: string | null;
  usage_amount: number | null;
  usage_unit: string | null;
  cost: number;
  currency: string | null;
  last_usage_at: string | null;
};

export type GcpCostInventoryDisplayRow = GcpCostInventoryRow & {
  kind: 'group' | 'item';
  row_id: string;
  item_count: number | null;
};

type GcpCostInventoryGridProps = {
  rows: GcpCostInventoryRow[];
  loading: boolean;
  truncated: boolean;
  errorMessage?: string | null;
  emptyMessage?: string;
};

function pluralizeItems(itemCount: number) {
  return itemCount === 1 ? '1 item' : `${itemCount.toLocaleString()} items`;
}

export function buildGroupedGcpCostInventoryRows(
  rows: GcpCostInventoryRow[],
): GcpCostInventoryDisplayRow[] {
  const groups = new Map<
    string,
    {
      rows: GcpCostInventoryRow[];
      totalCost: number;
      currency: string | null;
    }
  >();

  for (const row of rows) {
    const serviceCategory = row.service_category || 'Other';
    const current = groups.get(serviceCategory) ?? {
      rows: [],
      totalCost: 0,
      currency: row.currency,
    };
    current.rows.push(row);
    current.totalCost += row.cost;
    if (!current.currency && row.currency) {
      current.currency = row.currency;
    }
    groups.set(serviceCategory, current);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([serviceCategory, group]) => {
      const groupRow: GcpCostInventoryDisplayRow = {
        kind: 'group',
        row_id: `group:${serviceCategory}`,
        item_count: group.rows.length,
        billing_account_id: '',
        service_category: serviceCategory,
        service: pluralizeItems(group.rows.length),
        sku: '',
        project_id: null,
        project_name: null,
        resource_name: null,
        resource_global_name: null,
        location: null,
        usage_amount: null,
        usage_unit: null,
        cost: group.totalCost,
        currency: group.currency ?? 'USD',
        last_usage_at: null,
      };

      const itemRows = group.rows.map((row, index) => ({
        ...row,
        kind: 'item' as const,
        row_id: `item:${serviceCategory}:${index}`,
        item_count: null,
      }));

      return [groupRow, ...itemRows];
    });
}

export function regroupSortedDisplayRows(
  rows: GcpCostInventoryDisplayRow[],
): GcpCostInventoryDisplayRow[] {
  const categoryOrder: string[] = [];
  const seenCategories = new Set<string>();
  const groupRows = new Map<string, GcpCostInventoryDisplayRow>();
  const itemRows = new Map<string, GcpCostInventoryDisplayRow[]>();

  for (const row of rows) {
    const serviceCategory = row.service_category || 'Other';
    if (!seenCategories.has(serviceCategory)) {
      seenCategories.add(serviceCategory);
      categoryOrder.push(serviceCategory);
    }

    if (row.kind === 'group') {
      groupRows.set(serviceCategory, row);
      continue;
    }

    const current = itemRows.get(serviceCategory) ?? [];
    current.push(row);
    itemRows.set(serviceCategory, current);
  }

  return categoryOrder.flatMap((serviceCategory) => {
    const grouped = groupRows.get(serviceCategory);
    const items = itemRows.get(serviceCategory) ?? [];
    return grouped ? [grouped, ...items] : items;
  });
}

function formatCost(params: ValueFormatterParams<GcpCostInventoryDisplayRow, number>) {
  const value = params.value;
  if (typeof value !== 'number') return '';
  const currency = params.data?.currency ?? 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsage(params: ValueFormatterParams<GcpCostInventoryDisplayRow, number | null>) {
  const amount = params.value;
  const unit = params.data?.usage_unit;
  if (amount == null) return '';
  return unit ? `${amount.toLocaleString()} ${unit}` : amount.toLocaleString();
}

function renderServiceCategory(value: unknown, row: GcpCostInventoryDisplayRow | undefined) {
  if (!row) return String(value ?? '');
  if (row.kind === 'group') {
    return `${row.service_category} (${pluralizeItems(row.item_count ?? 0)})`;
  }
  return row.service_category;
}

function regroupSortedNodes(params: PostSortRowsParams<GcpCostInventoryDisplayRow>) {
  const displayRows = params.nodes
    .map((node) => node.data)
    .filter((row): row is GcpCostInventoryDisplayRow => !!row);
  const regrouped = regroupSortedDisplayRows(displayRows);
  const rowOrder = new Map(regrouped.map((row, index) => [row.row_id, index]));
  params.nodes.sort((left, right) => {
    const leftIndex = rowOrder.get(left.data?.row_id ?? '') ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = rowOrder.get(right.data?.row_id ?? '') ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

export function GcpCostInventoryGrid({
  rows,
  loading,
  truncated,
  errorMessage,
  emptyMessage = 'No GCP cost items matched the current filters.',
}: GcpCostInventoryGridProps) {
  const isDark = useIsDark();
  const gridTheme = useMemo(
    () => createAppGridTheme(isDark).withParams({ rowVerticalPaddingScale: 0.55 }),
    [isDark],
  );
  const displayRows = useMemo(() => buildGroupedGcpCostInventoryRows(rows), [rows]);

  const columnDefs = useMemo<ColDef<GcpCostInventoryDisplayRow>[]>(
    () => [
      {
        field: 'service_category',
        headerName: 'Service Category',
        minWidth: 180,
        pinned: 'left',
        sort: 'asc',
        cellRenderer: (params: { data?: GcpCostInventoryDisplayRow; value?: unknown }) =>
          renderServiceCategory(params.value, params.data),
      },
      {
        field: 'service',
        headerName: 'Service',
        minWidth: 180,
        pinned: 'left',
      },
      {
        field: 'sku',
        headerName: 'SKU',
        minWidth: 220,
      },
      {
        field: 'project_name',
        headerName: 'Project Name',
        minWidth: 180,
      },
      {
        field: 'project_id',
        headerName: 'Project ID',
        minWidth: 170,
      },
      {
        field: 'resource_name',
        headerName: 'Resource Name',
        minWidth: 220,
      },
      {
        field: 'resource_global_name',
        headerName: 'Resource Global Name',
        minWidth: 280,
      },
      {
        field: 'location',
        headerName: 'Location',
        minWidth: 140,
      },
      {
        field: 'usage_amount',
        headerName: 'Usage',
        minWidth: 140,
        valueFormatter: formatUsage,
      },
      {
        field: 'last_usage_at',
        headerName: 'Last Usage',
        minWidth: 180,
      },
      {
        field: 'billing_account_id',
        headerName: 'Billing Account',
        minWidth: 170,
      },
      {
        field: 'cost',
        headerName: 'Cost',
        minWidth: 130,
        pinned: 'right',
        sort: 'desc',
        valueFormatter: formatCost,
      },
    ],
    [],
  );

  if (errorMessage) {
    return (
      <div
        data-testid="gcp-cost-grid-error"
        className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {truncated && (
        <div
          data-testid="gcp-cost-truncated-banner"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          The backend response was truncated to keep the initial superuser view bounded. Narrow the filters to inspect a smaller slice.
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div
          data-testid="gcp-cost-empty-state"
          className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground"
        >
          {emptyMessage}
        </div>
      )}

      <div
        data-testid="gcp-cost-grid"
        className="gcp-cost-grid min-h-0 overflow-hidden rounded-md border border-border"
        style={{ height: 560 }}
      >
        <AgGridReact
          theme={gridTheme}
          rowData={displayRows}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: 120,
            flex: 1,
            cellStyle: (params) =>
              params.data?.kind === 'group'
                ? { fontWeight: 600 }
                : undefined,
          }}
          animateRows
          loading={loading}
          getRowId={(params) => params.data.row_id}
          postSortRows={regroupSortedNodes}
          overlayNoRowsTemplate={`<span class="ag-overlay-no-rows-center">${emptyMessage}</span>`}
        />
      </div>
    </div>
  );
}
