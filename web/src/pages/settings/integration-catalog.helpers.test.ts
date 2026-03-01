import { describe, expect, it } from 'vitest';
import {
  compactListPreview,
  extractTaskSchemaSummary,
  buildTaskDetailSourceUrl,
  markdownPreview,
  showMappingColumnsForSource,
  showMetadataColumnsForSource,
  taskClassHoverText,
} from './integration-catalog.helpers';

describe('taskClassHoverText', () => {
  it('prefers task description when available', () => {
    expect(taskClassHoverText('  This is a description  ', 'Task title', 'io.kestra.plugin.core.log.Log'))
      .toBe('This is a description');
  });

  it('falls back to task title when description is missing', () => {
    expect(taskClassHoverText(null, 'Task title', 'io.kestra.plugin.core.log.Log'))
      .toBe('Task title');
  });

  it('falls back to task class when both description and title are missing', () => {
    expect(taskClassHoverText('', null, 'io.kestra.plugin.core.log.Log'))
      .toBe('io.kestra.plugin.core.log.Log');
  });
});

describe('showMappingColumnsForSource', () => {
  it('returns false for temp source', () => {
    expect(showMappingColumnsForSource('temp')).toBe(false);
  });

  it('returns true for primary source', () => {
    expect(showMappingColumnsForSource('primary')).toBe(true);
  });
});

describe('showMetadataColumnsForSource', () => {
  it('returns false for temp source', () => {
    expect(showMetadataColumnsForSource('temp')).toBe(false);
  });

  it('returns true for primary source', () => {
    expect(showMetadataColumnsForSource('primary')).toBe(true);
  });
});

describe('extractTaskSchemaSummary', () => {
  it('extracts schema keys for properties, required, outputs, and definitions', () => {
    const summary = extractTaskSchemaSummary({
      properties: {
        baseUrl: { type: 'string' },
        apiKey: { type: 'string' },
      },
      required: ['baseUrl'],
      outputs: {
        response: { type: 'string' },
      },
      definitions: {
        auth: { type: 'object' },
      },
      $defs: {
        retry: { type: 'number' },
      },
    });

    expect(summary.propertyKeys).toEqual(['baseUrl', 'apiKey']);
    expect(summary.requiredKeys).toEqual(['baseUrl']);
    expect(summary.outputKeys).toEqual(['response']);
    expect(summary.definitionKeys).toEqual(['auth', 'retry']);
  });

  it('extracts output names from output array payloads', () => {
    const summary = extractTaskSchemaSummary({
      outputs: [
        'text',
        { name: 'json' },
        { key: 'status' },
        { id: 'meta' },
      ],
    });

    expect(summary.outputKeys).toEqual(['text', 'json', 'status', 'meta']);
  });
});

describe('markdownPreview', () => {
  it('returns empty string for null markdown', () => {
    expect(markdownPreview(null)).toBe('');
  });

  it('normalizes whitespace and truncates long markdown', () => {
    const preview = markdownPreview('Hello   world\n\nwith  extra spacing', 14);
    expect(preview).toBe('Hello world...');
  });
});

describe('buildTaskDetailSourceUrl', () => {
  it('builds task detail URL from base source URL and task class', () => {
    expect(buildTaskDetailSourceUrl('http://localhost:8080/api/v1/plugins', 'io.kestra.plugin.ai.agent.A2AClient'))
      .toBe('http://localhost:8080/api/v1/plugins/io.kestra.plugin.ai.agent.A2AClient');
  });

  it('trims and encodes task class safely', () => {
    expect(buildTaskDetailSourceUrl('http://localhost:8080/api/v1/plugins/', ' io.kestra.plugin.core.log.Log '))
      .toBe('http://localhost:8080/api/v1/plugins/io.kestra.plugin.core.log.Log');
  });

  it('returns undefined when base source URL is empty', () => {
    expect(buildTaskDetailSourceUrl('  ', 'io.kestra.plugin.ai.agent.A2AClient')).toBeUndefined();
  });
});

describe('compactListPreview', () => {
  it('returns none for empty values', () => {
    expect(compactListPreview([])).toBe('none');
  });

  it('returns full text when under limit', () => {
    expect(compactListPreview(['a', 'b'], 2)).toBe('a, b');
  });

  it('returns compact text with remaining count', () => {
    expect(compactListPreview(['a', 'b', 'c', 'd'], 2)).toBe('a, b +2');
  });
});
