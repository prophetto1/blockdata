import { useMemo } from 'react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DataGrid, type Column } from 'react-data-grid';
import { SettingsPageFrame } from './SettingsPageHeader';

type GridRow = {
  rowId: number;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
  col6: string;
  col7: string;
  col8: string;
  col9: string;
  col10: string;
};

const COLUMNS: readonly Column<GridRow>[] = [
  { key: 'col1', name: 'Column 1', width: 130, resizable: true, sortable: true },
  { key: 'col2', name: 'Column 2', width: 130, resizable: true, sortable: true },
  { key: 'col3', name: 'Column 3', width: 130, resizable: true, sortable: true },
  { key: 'col4', name: 'Column 4', width: 130, resizable: true, sortable: true },
  { key: 'col5', name: 'Column 5', width: 130, resizable: true, sortable: true },
  { key: 'col6', name: 'Column 6', width: 130, resizable: true, sortable: true },
  { key: 'col7', name: 'Column 7', width: 130, resizable: true, sortable: true },
  { key: 'col8', name: 'Column 8', width: 130, resizable: true, sortable: true },
  { key: 'col9', name: 'Column 9', width: 130, resizable: true, sortable: true },
  { key: 'col10', name: 'Column 10', width: 130, resizable: true, sortable: true },
];

function buildRows(): GridRow[] {
  return Array.from({ length: 20 }, (_, rowIndex) => {
    const rowNumber = rowIndex + 1;
    return {
      rowId: rowNumber,
      col1: `R${rowNumber}C1`,
      col2: `R${rowNumber}C2`,
      col3: `R${rowNumber}C3`,
      col4: `R${rowNumber}C4`,
      col5: `R${rowNumber}C5`,
      col6: `R${rowNumber}C6`,
      col7: `R${rowNumber}C7`,
      col8: `R${rowNumber}C8`,
      col9: `R${rowNumber}C9`,
      col10: `R${rowNumber}C10`,
    };
  });
}

export default function SettingsGridSample() {
  useShellHeaderTitle({ title: 'Grid Sample', breadcrumbs: ['Settings', 'Grid Sample'] });
  const rows = useMemo(() => buildRows(), []);

  return (
    <SettingsPageFrame
      title="React Data Grid Sample"
      description="Standalone sample page with local mock data only (20 rows x 10 columns)."
      bodyClassName="min-h-0 overflow-hidden p-0"
    >
      <div className="h-full min-h-[560px]">
        <DataGrid<GridRow>
          columns={COLUMNS}
          rows={rows}
          rowKeyGetter={(row) => row.rowId}
          className="h-full"
          defaultColumnOptions={{ resizable: true, sortable: true }}
          aria-label="Settings grid sample"
        />
      </div>
    </SettingsPageFrame>
  );
}
