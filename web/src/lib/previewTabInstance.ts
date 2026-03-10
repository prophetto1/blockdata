import { allTabIds, FALLBACK_TAB, hasTab } from '@/lib/tabRegistry';
import type { Pane } from '@/components/workbench/workbenchState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PREVIEW_INSTANCE_TAB_PREFIX = 'preview:';
export const MAX_CONCURRENT_PREVIEW_TABS = 8;

export const NEW_PANE_TAB_PRIORITY: string[] = [
  'parse',
  'load',
  'pull:github',
  'pull:stripe',
  'pull:sql_database',
  'preview',
  'canvas',
];

// ---------------------------------------------------------------------------
// Preview instance tab helpers
// ---------------------------------------------------------------------------

export function isPreviewInstanceTab(tabId: string): boolean {
  return tabId.startsWith(PREVIEW_INSTANCE_TAB_PREFIX);
}

export function createPreviewInstanceTabId(sourceUid: string, sequence: number): string {
  return `${PREVIEW_INSTANCE_TAB_PREFIX}${sourceUid}:${sequence}`;
}

export function getPreviewSourceUidFromTabId(tabId: string): string | null {
  if (!isPreviewInstanceTab(tabId)) return null;
  const value = tabId.slice(PREVIEW_INSTANCE_TAB_PREFIX.length);
  const separator = value.lastIndexOf(':');
  if (separator <= 0) return null;
  return value.slice(0, separator);
}

export function getPreviewTabSequence(tabId: string): number {
  const sourceUid = getPreviewSourceUidFromTabId(tabId);
  if (!sourceUid) return Number.MAX_SAFE_INTEGER;
  const suffix = tabId.slice((`${PREVIEW_INSTANCE_TAB_PREFIX}${sourceUid}:`).length);
  const sequence = Number.parseInt(suffix, 10);
  return Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER;
}

export function isKnownTab(tabId: string): boolean {
  return hasTab(tabId) || isPreviewInstanceTab(tabId);
}

export function enforcePreviewTabCap(input: Pane[], maxConcurrent: number): Pane[] {
  if (maxConcurrent <= 0) return input;

  const previewInstances = input.flatMap((pane) => pane.tabs)
    .filter((tabId) => isPreviewInstanceTab(tabId));
  if (previewInstances.length <= maxConcurrent) return input;

  const removeSet = new Set(
    [...previewInstances]
      .sort((a, b) => getPreviewTabSequence(a) - getPreviewTabSequence(b))
      .slice(0, previewInstances.length - maxConcurrent),
  );

  return input.map((pane) => {
    const tabs = pane.tabs.filter((tabId) => !removeSet.has(tabId));
    return {
      ...pane,
      tabs,
      activeTab: tabs.includes(pane.activeTab) ? pane.activeTab : (tabs[0] ?? FALLBACK_TAB),
    };
  });
}

export function pickNewPaneTab(input: Pane[], sourceActiveTab: string): string {
  const openTabs = new Set(input.flatMap((pane) => pane.tabs));

  for (const candidate of NEW_PANE_TAB_PRIORITY) {
    if (hasTab(candidate) && !openTabs.has(candidate)) return candidate;
  }

  const nextRegistryTab = allTabIds().find((tabId) => tabId !== 'assets' && !openTabs.has(tabId));
  if (nextRegistryTab) return nextRegistryTab;

  if (sourceActiveTab !== 'assets' && hasTab(sourceActiveTab)) return sourceActiveTab;
  if (hasTab('parse')) return 'parse';
  return FALLBACK_TAB;
}
