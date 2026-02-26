import { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { Badge } from '@/components/ui/badge';
import { useIsDark } from '@/lib/useIsDark';
import { createAppGridTheme } from '@/lib/agGridTheme';

ModuleRegistry.registerModules([AllCommunityModule]);

const BLOCK_TYPE_VARIANT: Record<string, 'blue' | 'gray' | 'green' | 'default'> = {
  heading: 'blue',
  paragraph: 'gray',
  list_item: 'green',
  code_block: 'default',
};

type MarketingGridRow = {
  block_index: number;
  block_type: string;
  block_content: string;
  block_uid: string;
  status: string;
  field_classification: string | null;
  field_is_binding: boolean | null;
};

const MOCK_ROWS: MarketingGridRow[] = [
  {
    block_index: 1,
    block_type: 'heading',
    block_content: 'Service Agreement',
    block_uid: 'b7c3e9a1',
    status: 'confirmed',
    field_classification: 'contract_title',
    field_is_binding: true,
  },
  {
    block_index: 2,
    block_type: 'paragraph',
    block_content: 'This Agreement is made on March 15, 2026, between Alpha Corp ("Provider") and Beta Inc ("Client").',
    block_uid: 'f2d4a1c5',
    status: 'confirmed',
    field_classification: 'party_definitions',
    field_is_binding: true,
  },
  {
    block_index: 3,
    block_type: 'heading',
    block_content: '1. Services',
    block_uid: 'e8b2c4d6',
    status: 'confirmed',
    field_classification: 'section_header',
    field_is_binding: false,
  },
  {
    block_index: 4,
    block_type: 'paragraph',
    block_content: 'Provider agrees to deliver the software modules described in Exhibit A within 90 days.',
    block_uid: 'a9c5b2e1',
    status: 'ai_complete',
    field_classification: 'performance_obligation',
    field_is_binding: true,
  },
  {
    block_index: 5,
    block_type: 'list_item',
    block_content: '• Module 1: Authentication Service',
    block_uid: 'c3d4e5f6',
    status: 'ai_complete',
    field_classification: 'deliverable',
    field_is_binding: true,
  },
  {
    block_index: 6,
    block_type: 'list_item',
    block_content: '• Module 2: User Dashboard',
    block_uid: 'd4e5f6a7',
    status: 'ai_complete',
    field_classification: 'deliverable',
    field_is_binding: true,
  },
  {
    block_index: 7,
    block_type: 'paragraph',
    block_content: 'Client shall pay an upfront fee of $50,000 upon execution of this Agreement.',
    block_uid: 'g7h8i9j0',
    status: 'pending',
    field_classification: null,
    field_is_binding: null,
  },
];

function StatusRenderer(params: ICellRendererParams<MarketingGridRow, string>) {
  const status = params.value ?? 'pending';
  const variant = status === 'confirmed' ? 'green' : status === 'ai_complete' ? 'yellow' : 'gray';
  return <Badge size="xs" variant={variant}>{status}</Badge>;
}

function TypeRenderer(params: ICellRendererParams<MarketingGridRow, string>) {
  const value = params.value ?? 'unknown';
  return <Badge size="xs" variant={BLOCK_TYPE_VARIANT[value] ?? 'gray'}>{value}</Badge>;
}

export function MarketingGrid() {
  const [rowData] = useState(MOCK_ROWS);
  const isDark = useIsDark();
  const gridTheme = useMemo(
    () => createAppGridTheme(isDark).withParams({ rowVerticalPaddingScale: 0.5 }),
    [isDark],
  );

  const colDefs = useMemo<ColDef<MarketingGridRow>[]>(() => [
    { field: 'block_index', headerName: '#', width: 50, pinned: 'left' },
    { field: 'block_type', headerName: 'Type', width: 100, pinned: 'left', cellRenderer: TypeRenderer },
    { field: 'block_content', headerName: 'Content', flex: 1, minWidth: 300 },
    { field: 'status', headerName: 'Status', width: 100, cellRenderer: StatusRenderer },
    {
      headerName: 'Schema Extraction (v1)',
      marryChildren: true,
      children: [
        { field: 'field_classification', headerName: 'classification', width: 160 },
        { field: 'field_is_binding', headerName: 'is_binding', width: 100 },
      ],
    },
  ], []);

  return (
    <div className="flex flex-col overflow-hidden rounded-md border" style={{ height: 400 }}>
      <div className="border-b bg-background px-3 py-2">
        <span className="text-xs font-bold text-muted-foreground">PREVIEW: LEGAL_AGREEMENT_V1.PDF</span>
      </div>
      <div className="block-viewer-grid grid-font-medium grid-font-family-sans grid-valign-center flex-1 w-full">
        <AgGridReact
          theme={gridTheme}
          rowData={rowData}
          columnDefs={colDefs}
          domLayout="autoHeight"
        />
      </div>
    </div>
  );
}
