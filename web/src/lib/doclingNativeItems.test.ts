import { describe, expect, it } from 'vitest';

import { extractDoclingNativeItemsFromDict } from './doclingNativeItems';

describe('extractDoclingNativeItemsFromDict', () => {
  it('preserves native docling labels and reading order', () => {
    const result = extractDoclingNativeItemsFromDict({
      body: {
        children: [
          { $ref: '#/texts/0' },
          { $ref: '#/tables/0' },
          { $ref: '#/groups/0' },
        ],
      },
      furniture: { children: [] },
      groups: [
        {
          self_ref: '#/groups/0',
          label: 'inline',
          children: [{ $ref: '#/texts/1' }],
        },
      ],
      texts: [
        {
          self_ref: '#/texts/0',
          label: 'section_header',
          text: 'Introduction',
          prov: [{ page_no: 2 }],
        },
        {
          self_ref: '#/texts/1',
          label: 'paragraph',
          text: 'Inline child paragraph',
          prov: [{ page_no: 2 }],
        },
      ],
      tables: [
        {
          self_ref: '#/tables/0',
          label: 'table',
          prov: [{ page_no: 3 }],
          data: {
            num_rows: 1,
            num_cols: 2,
            table_cells: [
              { text: 'A', start_row_offset_idx: 0, start_col_offset_idx: 0 },
              { text: 'B', start_row_offset_idx: 0, start_col_offset_idx: 1 },
            ],
          },
        },
      ],
      pictures: [],
      key_value_items: [],
      form_items: [],
    });

    expect(result.items.map((item) => item.pointer)).toEqual([
      '#/texts/0',
      '#/tables/0',
      '#/groups/0',
      '#/texts/1',
    ]);
    expect(result.items.map((item) => item.native_label)).toEqual([
      'section_header',
      'table',
      'inline',
      'paragraph',
    ]);
    expect(result.items[0]?.content).toBe('Introduction');
    expect(result.items[1]?.content).toBe('A | B');
    expect(result.items[2]?.kind).toBe('group');
    expect(result.items[3]?.page_no).toBe(2);
  });
});
