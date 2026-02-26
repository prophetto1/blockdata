import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FLOW_TIME_RANGE,
  getPreferredFlowTab,
  shouldApplyDefaultTimeRange,
} from './flowRouteState';

const FLOW_TAB_VALUES = [
  'overview',
  'topology',
  'executions',
  'edit',
  'revisions',
  'triggers',
  'logs',
  'metrics',
  'dependencies',
  'concurrency',
  'auditlogs',
] as const;

describe('flowRouteState', () => {
  it('prefers the route tab when it is valid', () => {
    const result = getPreferredFlowTab('edit', 'overview', FLOW_TAB_VALUES);
    expect(result).toBe('edit');
  });

  it('falls back to stored default tab when route tab is missing', () => {
    const result = getPreferredFlowTab(undefined, 'executions', FLOW_TAB_VALUES);
    expect(result).toBe('executions');
  });

  it('falls back to overview when neither route nor stored tab is valid', () => {
    const result = getPreferredFlowTab('unknown-tab', 'also-unknown', FLOW_TAB_VALUES);
    expect(result).toBe('overview');
  });

  it('requires default time range on overview when time params are missing', () => {
    const result = shouldApplyDefaultTimeRange('overview', new URLSearchParams());
    expect(result).toBe(true);
  });

  it('requires default time range on executions when time params are missing', () => {
    const result = shouldApplyDefaultTimeRange('executions', new URLSearchParams('foo=bar'));
    expect(result).toBe(true);
  });

  it('skips default time range when any time-related key is already present', () => {
    const result = shouldApplyDefaultTimeRange(
      'overview',
      new URLSearchParams(`filters[timeRange][EQUALS]=${DEFAULT_FLOW_TIME_RANGE}`),
    );
    expect(result).toBe(false);
  });

  it('never injects default time range for non time-based tabs', () => {
    const result = shouldApplyDefaultTimeRange('edit', new URLSearchParams());
    expect(result).toBe(false);
  });
});
