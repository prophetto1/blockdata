import { describe, expect, it } from 'vitest';

import {
  buildGroupedGcpCostInventoryRows,
  regroupSortedDisplayRows,
  type GcpCostInventoryRow,
} from './GcpCostInventoryGrid';

const FIXTURE_ROWS: GcpCostInventoryRow[] = [
  {
    billing_account_id: 'ABC-123',
    service_category: 'Storage',
    service: 'Cloud Storage',
    sku: 'Standard Storage',
    project_id: 'storage-project',
    project_name: 'Storage Project',
    resource_name: 'bucket-a',
    resource_global_name: '//storage.googleapis.com/projects/_/buckets/bucket-a',
    location: 'us-central1',
    usage_amount: 14,
    usage_unit: 'GiBy.mo',
    cost: 2.75,
    currency: 'USD',
    last_usage_at: '2026-04-10T11:00:00Z',
  },
  {
    billing_account_id: 'ABC-123',
    service_category: 'Compute',
    service: 'Compute Engine',
    sku: 'N2 Core',
    project_id: 'compute-project',
    project_name: 'Compute Project',
    resource_name: 'vm-1',
    resource_global_name: '//compute.googleapis.com/projects/compute-project/zones/us-central1-a/instances/vm-1',
    location: 'us-central1-a',
    usage_amount: 10,
    usage_unit: 'h',
    cost: 9.5,
    currency: 'USD',
    last_usage_at: '2026-04-11T09:00:00Z',
  },
  {
    billing_account_id: 'ABC-123',
    service_category: 'Compute',
    service: 'Compute Engine',
    sku: 'N2 RAM',
    project_id: 'compute-project',
    project_name: 'Compute Project',
    resource_name: 'vm-1',
    resource_global_name: '//compute.googleapis.com/projects/compute-project/zones/us-central1-a/instances/vm-1',
    location: 'us-central1-a',
    usage_amount: 10,
    usage_unit: 'GiBy.h',
    cost: 4.25,
    currency: 'USD',
    last_usage_at: '2026-04-11T09:00:00Z',
  },
];

describe('GcpCostInventoryGrid grouping helpers', () => {
  it('builds service-category group rows with totals and item counts', () => {
    const groupedRows = buildGroupedGcpCostInventoryRows(FIXTURE_ROWS);

    expect(groupedRows).toHaveLength(5);
    expect(groupedRows[0]).toMatchObject({
      kind: 'group',
      service_category: 'Compute',
      item_count: 2,
      cost: 13.75,
      service: '2 items',
    });
    expect(groupedRows[1]).toMatchObject({
      kind: 'item',
      service_category: 'Compute',
      sku: 'N2 Core',
    });
    expect(groupedRows[3]).toMatchObject({
      kind: 'group',
      service_category: 'Storage',
      item_count: 1,
      cost: 2.75,
      service: '1 item',
    });
  });

  it('keeps each group header ahead of its category rows after sorting', () => {
    const groupedRows = buildGroupedGcpCostInventoryRows(FIXTURE_ROWS);
    const scrambledRows = [
      groupedRows[2],
      groupedRows[4],
      groupedRows[0],
      groupedRows[1],
      groupedRows[3],
    ];

    const regroupedRows = regroupSortedDisplayRows(scrambledRows);

    expect(
      regroupedRows.map((row) => ({
        kind: row.kind,
        service_category: row.service_category,
        service: row.service,
      })),
    ).toEqual([
      { kind: 'group', service_category: 'Compute', service: '2 items' },
      { kind: 'item', service_category: 'Compute', service: 'Compute Engine' },
      { kind: 'item', service_category: 'Compute', service: 'Compute Engine' },
      { kind: 'group', service_category: 'Storage', service: '1 item' },
      { kind: 'item', service_category: 'Storage', service: 'Cloud Storage' },
    ]);
  });
});
