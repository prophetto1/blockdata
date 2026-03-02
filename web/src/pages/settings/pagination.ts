export type PageSlice<T> = {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  rows: T[];
};

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 1000] as const;
export const DEFAULT_PAGE_SIZE = 250;

export function paginateRows<T>(rows: T[], page: number, pageSize: number): PageSlice<T> {
  const safePageSize = Math.max(1, Math.trunc(pageSize) || 1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const startIndex = (safePage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, total);
  const pageRows = rows.slice(startIndex, endIndex);

  return {
    page: safePage,
    totalPages,
    start: total === 0 ? 0 : startIndex + 1,
    end: endIndex,
    rows: pageRows,
  };
}
