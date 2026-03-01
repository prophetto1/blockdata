import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, paginateRows } from './pagination';

describe('paginateRows', () => {
  it('uses 250 as the default page size option', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(250);
    expect(PAGE_SIZE_OPTIONS).toContain(250);
  });

  it('returns first page slice with correct bounds', () => {
    const rows = Array.from({ length: 95 }, (_, idx) => idx + 1);
    const result = paginateRows(rows, 1, 25);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(4);
    expect(result.start).toBe(1);
    expect(result.end).toBe(25);
    expect(result.rows).toHaveLength(25);
    expect(result.rows[0]).toBe(1);
    expect(result.rows[24]).toBe(25);
  });

  it('clamps page beyond range to the last page', () => {
    const rows = Array.from({ length: 95 }, (_, idx) => idx + 1);
    const result = paginateRows(rows, 99, 25);
    expect(result.page).toBe(4);
    expect(result.totalPages).toBe(4);
    expect(result.start).toBe(76);
    expect(result.end).toBe(95);
    expect(result.rows).toHaveLength(20);
    expect(result.rows[0]).toBe(76);
    expect(result.rows[19]).toBe(95);
  });

  it('returns a stable empty page for empty datasets', () => {
    const result = paginateRows<number>([], 3, 25);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
    expect(result.rows).toEqual([]);
  });
});
