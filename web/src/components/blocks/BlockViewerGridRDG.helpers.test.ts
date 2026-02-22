import { describe, expect, it } from 'vitest';
import { parseEditedValue } from './BlockViewerGridRDG.helpers';

describe('parseEditedValue', () => {
  it('parses numeric schema edits into numbers', () => {
    expect(parseEditedValue('42', { key: 'amount', type: 'number' })).toBe(42);
    expect(parseEditedValue('bad', { key: 'amount', type: 'number' })).toBeNull();
  });

  it('parses boolean schema edits', () => {
    expect(parseEditedValue('true', { key: 'active', type: 'boolean' })).toBe(true);
    expect(parseEditedValue('false', { key: 'active', type: 'boolean' })).toBe(false);
    expect(parseEditedValue('maybe', { key: 'active', type: 'boolean' })).toBeNull();
  });

  it('parses JSON-like values for object and array schema fields', () => {
    expect(parseEditedValue('{"x":1}', { key: 'meta', type: 'object' })).toEqual({ x: 1 });
    expect(parseEditedValue('[1,2,3]', { key: 'tags', type: 'array' })).toEqual([1, 2, 3]);
  });
});
