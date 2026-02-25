import { describe, expect, it } from 'vitest';

import {
  activateTabInPane,
  closeTabInPane,
  createInitialPanes,
  type Pane,
} from '@/components/flows/flowWorkbenchState';

describe('flowWorkbenchState', () => {
  it('starts with two columns: Flow Code (left) and Documentation (right)', () => {
    const panes = createInitialPanes();

    expect(panes).toHaveLength(2);
    expect(panes[0]).toMatchObject({
      tabs: ['flowCode'],
      activeTab: 'flowCode',
    });
    expect(panes[1]).toMatchObject({
      tabs: ['documentation'],
      activeTab: 'documentation',
    });
  });

  it('combines columns by activating Documentation in the first pane', () => {
    const panes = createInitialPanes();
    const next = activateTabInPane(panes, panes[0].id, 'documentation');

    expect(next).toHaveLength(1);
    expect(next[0].tabs).toEqual(['flowCode', 'documentation']);
    expect(next[0].activeTab).toBe('documentation');
    expect(next[0].width).toBeCloseTo(100);
  });

  it('keeps at least one pane when closing the last tab', () => {
    const singlePane: Pane[] = [
      { id: 'pane-a', tabs: ['flowCode'], activeTab: 'flowCode', width: 100 },
    ];

    const next = closeTabInPane(singlePane, 'pane-a', 'flowCode');

    expect(next).toHaveLength(1);
    expect(next[0].tabs).toEqual(['flowCode']);
    expect(next[0].activeTab).toBe('flowCode');
    expect(next[0].width).toBeCloseTo(100);
  });
});
