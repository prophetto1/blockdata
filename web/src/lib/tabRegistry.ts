import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Tab Registry — single source of truth for all workbench tabs.
//
// Fixed view tabs (assets, preview, canvas) and dynamic action tabs
// (parse:easy, pull:github, load:duckdb, …) all register here.
// The registry is a plain Map today; it can be hydrated from
// service_functions_view later without changing call sites.
// ---------------------------------------------------------------------------

export type TabGroup = 'view' | 'parse' | 'extract' | 'pull' | 'load' | 'transform';

export type TabRenderProps = {
  projectId: string | null;
};

export type TabEntry = {
  id: string;
  label: string;
  group: TabGroup;
  render: (props: TabRenderProps) => ReactNode;
};

const TAB_REGISTRY = new Map<string, TabEntry>();

// ---- mutation ----------------------------------------------------------

export function registerTab(entry: TabEntry): void {
  TAB_REGISTRY.set(entry.id, entry);
}

export function registerTabs(
  group: TabGroup,
  items: Array<{ suffix: string; label: string; render: TabEntry['render'] }>,
): void {
  for (const item of items) {
    registerTab({ id: `${group}:${item.suffix}`, label: item.label, group, render: item.render });
  }
}

// ---- queries -----------------------------------------------------------

export function getTab(tabId: string): TabEntry | undefined {
  return TAB_REGISTRY.get(tabId);
}

export function getTabLabel(tabId: string): string {
  return TAB_REGISTRY.get(tabId)?.label ?? tabId;
}

export function getTabsByGroup(group: TabGroup): TabEntry[] {
  return Array.from(TAB_REGISTRY.values()).filter((entry) => entry.group === group);
}

export function hasTab(tabId: string): boolean {
  return TAB_REGISTRY.has(tabId);
}

export function allTabIds(): string[] {
  return Array.from(TAB_REGISTRY.keys());
}

export const FALLBACK_TAB = 'preview';
