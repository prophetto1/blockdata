export const DEFAULT_FLOW_TIME_RANGE = 'PT24H';

type TimeRangeTab = 'overview' | 'executions';

function hasTabValue<T extends string>(tab: string | undefined, tabValues: readonly T[]): tab is T {
  return Boolean(tab) && tabValues.some((value) => value === tab);
}

export function getPreferredFlowTab<T extends string>(
  routeTab: string | undefined,
  storedTab: string | null,
  tabValues: readonly T[],
  fallbackTab: T = tabValues[0] as T,
): T {
  if (hasTabValue(routeTab, tabValues)) return routeTab;
  if (storedTab && hasTabValue(storedTab, tabValues)) return storedTab;
  return fallbackTab;
}

function isTimeRangeTab(tab: string): tab is TimeRangeTab {
  return tab === 'overview' || tab === 'executions';
}

const TIME_PARAM_KEY_PARTS = ['startDate', 'endDate', 'timeRange'];

export function shouldApplyDefaultTimeRange(tab: string, searchParams: URLSearchParams): boolean {
  if (!isTimeRangeTab(tab)) return false;

  const hasTimeParam = Array.from(searchParams.keys()).some((key) =>
    TIME_PARAM_KEY_PARTS.some((part) => key.includes(part)),
  );
  return !hasTimeParam;
}
