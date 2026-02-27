export type PaneTabId =
  | 'flowCode'
  | 'documentation'
  | 'nocode'
  | 'topology'
  | 'files'
  | 'blueprints';

export type Pane = {
  id: string;
  tabs: PaneTabId[];
  activeTab: PaneTabId;
  width: number;
};

export const FLOW_WORKBENCH_TABS: Array<{ id: PaneTabId; label: string }> = [
  { id: 'flowCode', label: 'Flow Code' },
  { id: 'nocode', label: 'No-code' },
  { id: 'topology', label: 'Topology' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'files', label: 'Files' },
  { id: 'blueprints', label: 'Blueprints' },
];

const FALLBACK_TAB: PaneTabId = 'flowCode';

function withResolvedActiveTab(pane: Pane): Pane {
  if (pane.tabs.length === 0) return pane;
  if (pane.tabs.includes(pane.activeTab)) return pane;
  return {
    ...pane,
    activeTab: pane.tabs[0],
  };
}

function normalizePaneWidths(input: Pane[]): Pane[] {
  if (input.length === 0) return input;
  const total = input.reduce((sum, pane) => sum + pane.width, 0);
  if (total <= 0) {
    const equal = 100 / input.length;
    return input.map((pane) => ({ ...pane, width: equal }));
  }

  return input.map((pane) => ({
    ...pane,
    width: (pane.width / total) * 100,
  }));
}

function keepAtLeastOnePane(input: Pane[]): Pane[] {
  if (input.length > 0) return input;
  return [{
    id: 'pane-1',
    tabs: [FALLBACK_TAB],
    activeTab: FALLBACK_TAB,
    width: 100,
  }];
}

function finalizeStructure(before: Pane[], after: Pane[]): Pane[] {
  const cleaned = keepAtLeastOnePane(
    after
      .filter((pane) => pane.tabs.length > 0)
      .map(withResolvedActiveTab),
  );

  return cleaned.length === before.length
    ? cleaned
    : normalizePaneWidths(cleaned);
}

export function createInitialPanes(): Pane[] {
  return normalizePaneWidths([
    {
      id: 'pane-1',
      tabs: ['flowCode'],
      activeTab: 'flowCode',
      width: 50,
    },
    {
      id: 'pane-2',
      tabs: ['topology'],
      activeTab: 'topology',
      width: 50,
    },
  ]);
}

export function activateTabInPane(input: Pane[], paneId: string, tabId: PaneTabId): Pane[] {
  const targetPane = input.find((pane) => pane.id === paneId);
  if (!targetPane) return input;

  const stripped = input.map((pane) => {
    if (!pane.tabs.includes(tabId)) return pane;
    const nextTabs = pane.tabs.filter((tab) => tab !== tabId);
    const nextActive = nextTabs.includes(pane.activeTab)
      ? pane.activeTab
      : (nextTabs[0] ?? FALLBACK_TAB);
    return {
      ...pane,
      tabs: nextTabs,
      activeTab: nextActive,
    };
  });

  const next = stripped.map((pane) => {
    if (pane.id !== paneId) return pane;
    if (pane.tabs.includes(tabId)) {
      return { ...pane, activeTab: tabId };
    }
    return {
      ...pane,
      tabs: [...pane.tabs, tabId],
      activeTab: tabId,
    };
  });

  return finalizeStructure(input, next);
}

export function setActiveTabInPane(input: Pane[], paneId: string, tabId: PaneTabId): Pane[] {
  return input.map((pane) => {
    if (pane.id !== paneId) return pane;
    if (!pane.tabs.includes(tabId)) return pane;
    return {
      ...pane,
      activeTab: tabId,
    };
  });
}

export function closeTabInPane(input: Pane[], paneId: string, tabId: PaneTabId): Pane[] {
  const next = input.map((pane) => {
    if (pane.id !== paneId) return pane;
    const nextTabs = pane.tabs.filter((tab) => tab !== tabId);
    const nextActive = nextTabs.includes(pane.activeTab)
      ? pane.activeTab
      : (nextTabs[0] ?? FALLBACK_TAB);
    return {
      ...pane,
      tabs: nextTabs,
      activeTab: nextActive,
    };
  });

  return finalizeStructure(input, next);
}
