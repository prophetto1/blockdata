export type Pane = {
  id: string;
  tabs: string[];
  activeTab: string;
  width: number;
};

function withResolvedActiveTab(pane: Pane): Pane {
  if (pane.tabs.length === 0) return pane;
  if (pane.tabs.includes(pane.activeTab)) return pane;
  return {
    ...pane,
    activeTab: pane.tabs[0],
  };
}

export function normalizePaneWidths(input: Pane[]): Pane[] {
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

function keepAtLeastOnePane(input: Pane[], fallbackTab: string): Pane[] {
  if (input.length > 0) return input;
  return [{
    id: 'pane-1',
    tabs: [fallbackTab],
    activeTab: fallbackTab,
    width: 100,
  }];
}

function finalizeStructure(before: Pane[], after: Pane[], fallbackTab: string): Pane[] {
  const cleaned = keepAtLeastOnePane(
    after
      .filter((pane) => pane.tabs.length > 0)
      .map(withResolvedActiveTab),
    fallbackTab,
  );

  return cleaned.length === before.length
    ? cleaned
    : normalizePaneWidths(cleaned);
}

export function activateTabInPane(input: Pane[], paneId: string, tabId: string, fallbackTab: string): Pane[] {
  const targetPane = input.find((pane) => pane.id === paneId);
  if (!targetPane) return input;

  const stripped = input.map((pane) => {
    if (!pane.tabs.includes(tabId)) return pane;
    const nextTabs = pane.tabs.filter((tab) => tab !== tabId);
    const nextActive = nextTabs.includes(pane.activeTab)
      ? pane.activeTab
      : (nextTabs[0] ?? fallbackTab);
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

  return finalizeStructure(input, next, fallbackTab);
}

export function setActiveTabInPane(input: Pane[], paneId: string, tabId: string): Pane[] {
  return input.map((pane) => {
    if (pane.id !== paneId) return pane;
    if (!pane.tabs.includes(tabId)) return pane;
    return {
      ...pane,
      activeTab: tabId,
    };
  });
}

export function removeTabFromAll(input: Pane[], tabId: string, fallbackTab: string): Pane[] {
  const next = input.map((pane) => {
    if (!pane.tabs.includes(tabId)) return pane;
    const nextTabs = pane.tabs.filter((tab) => tab !== tabId);
    const nextActive = nextTabs.includes(pane.activeTab)
      ? pane.activeTab
      : (nextTabs[0] ?? fallbackTab);
    return { ...pane, tabs: nextTabs, activeTab: nextActive };
  });
  return finalizeStructure(input, next, fallbackTab);
}

export function closeTabInPane(input: Pane[], paneId: string, tabId: string, fallbackTab: string): Pane[] {
  const next = input.map((pane) => {
    if (pane.id !== paneId) return pane;
    const nextTabs = pane.tabs.filter((tab) => tab !== tabId);
    const nextActive = nextTabs.includes(pane.activeTab)
      ? pane.activeTab
      : (nextTabs[0] ?? fallbackTab);
    return {
      ...pane,
      tabs: nextTabs,
      activeTab: nextActive,
    };
  });

  return finalizeStructure(input, next, fallbackTab);
}
