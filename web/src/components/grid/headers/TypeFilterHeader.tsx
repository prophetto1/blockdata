import { ActionIcon, Menu, Text } from '@mantine/core';
import { IconCheck, IconFilter } from '@tabler/icons-react';
import type { HeaderContext } from '@tanstack/react-table';

export type TypeFilterMeta = {
  blockTypes: string[];
  typeFilter: string[];
  onToggleType: (type: string) => void;
  onClearTypes: () => void;
};

export function TypeFilterHeader<T>({ column, table }: HeaderContext<T, unknown>) {
  const meta = table.options.meta as (TypeFilterMeta & Record<string, unknown>) | undefined;
  const blockTypes = meta?.blockTypes ?? [];
  const typeFilter = meta?.typeFilter ?? [];
  const selectedCount = typeFilter.length;
  const sorted = column.getIsSorted();

  return (
    <div className="dt-type-header">
      <span
        className="dt-header-label dt-header-sortable"
        onClick={(e) => { e.stopPropagation(); column.getToggleSortingHandler()?.(e); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          e.stopPropagation();
          column.getToggleSortingHandler()?.(e);
        }}
        aria-label="Sort by type"
      >
        Type
        {sorted && (
          <span className="dt-sort-indicator">
            {sorted === 'asc' ? ' \u25B2' : ' \u25BC'}
          </span>
        )}
      </span>
      {blockTypes.length > 1 && (
        <div onClick={(e) => e.stopPropagation()}>
        <Menu shadow="md" width={200} position="bottom-start" withinPortal closeOnItemClick={false}>
          <Menu.Target>
            <ActionIcon
              variant={selectedCount > 0 ? 'light' : 'subtle'}
              size="xs"
              aria-label="Filter block types"
            >
              <IconFilter size={12} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {blockTypes.map((type) => (
              <Menu.Item
                key={type}
                leftSection={
                  typeFilter.includes(type)
                    ? <IconCheck size={14} />
                    : <span style={{ width: 14, display: 'inline-block' }} />
                }
                onClick={() => meta?.onToggleType(type)}
              >
                <Text size="xs">{type}</Text>
              </Menu.Item>
            ))}
            {selectedCount > 0 && (
              <>
                <Menu.Divider />
                <Menu.Item c="dimmed" onClick={() => meta?.onClearTypes()}>
                  <Text size="xs">Clear all</Text>
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
        </div>
      )}
    </div>
  );
}
