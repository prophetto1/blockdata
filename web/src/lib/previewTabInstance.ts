import { FALLBACK_TAB } from '@/lib/tabRegistry';
import type { Pane } from '@/components/workbench/workbenchState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PREVIEW_INSTANCE_TAB_PREFIX = 'preview:';
export const MAX_CONCURRENT_PREVIEW_TABS = 8;

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
