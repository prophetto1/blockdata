import { describe, expect, it } from 'vitest';
import { AGCHAIN_NAV_SECTIONS, buildAgchainNavSections } from './AgchainLeftNav';

describe('AGCHAIN_NAV_SECTIONS', () => {
  it('defines the new overview/eval/monitor/harness/settings rail grouping and prefixed paths', () => {
    const sections = buildAgchainNavSections();

    expect(sections.map((section) => section.label)).toEqual([
      '',
      'Eval',
      'Monitor',
      'Harness',
      'Settings',
    ]);

    expect(sections[0]?.items.map((item) => item.label)).toEqual([
      'Overview',
      'Playground',
      'Sandbox',
      'Eval Designer',
      'Harness Designer',
    ]);

    expect(sections[1]?.items.map((item) => item.label)).toEqual([
      'Datasets',
      'Tasks',
      'Scorers',
      'Models',
      'Runs',
    ]);

    expect(sections[2]?.items.map((item) => item.label)).toEqual([
      'Metrics',
      'Logs',
      'Trace',
    ]);

    expect(sections[3]?.items.map((item) => item.label)).toEqual([
      'Prompts',
      'Instructions',
      'Skills',
      'MCP',
      'Storage',
      'Memory',
      'Hooks',
    ]);

    expect(sections[4]?.items.map((item) => item.label)).toEqual([
      'Settings',
    ]);

    expect(sections[0]?.items.map((item) => item.path)).toEqual([
      '/app/agchain/overview',
      '/app/agchain/playground',
      '/app/agchain/sandbox',
      '/app/agchain/eval-designer',
      '/app/agchain/harness-designer',
    ]);

    expect(sections[1]?.items.map((item) => item.path)).toEqual([
      '/app/agchain/eval/datasets',
      '/app/agchain/eval/tasks',
      '/app/agchain/eval/scorers',
      '/app/agchain/eval/models',
      '/app/agchain/eval/runs',
    ]);

    expect(sections[2]?.items.map((item) => item.path)).toEqual([
      '/app/agchain/monitor/metrics',
      '/app/agchain/monitor/logs',
      '/app/agchain/monitor/trace',
    ]);

    expect(sections[3]?.items.map((item) => item.path)).toEqual([
      '/app/agchain/harness/prompts',
      '/app/agchain/harness/instructions',
      '/app/agchain/harness/skills',
      '/app/agchain/harness/mcp',
      '/app/agchain/harness/storage',
      '/app/agchain/harness/memory',
      '/app/agchain/harness/hooks',
    ]);

    expect(sections[4]?.items.map((item) => item.path)).toEqual([
      '/app/agchain/settings',
    ]);
  });

  it('leaves the first overview section unlabeled so the focused project selector carries that context', () => {
    expect(AGCHAIN_NAV_SECTIONS[0]?.label).toBe('');
  });
});
