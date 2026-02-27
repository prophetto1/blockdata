import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

type QueryError = {
  message: string;
};

type QueryResult<T> = {
  data: T[] | null;
  error: QueryError | null;
};

type QueryChain<T> = {
  select: (columns: string) => QueryChain<T>;
  eq: (column: string, value: string) => QueryChain<T>;
  order: (column: string, options: { ascending: boolean }) => QueryChain<T>;
  range: (from: number, to: number) => Promise<QueryResult<T>>;
};

type SupabaseLike = {
  from: (table: string) => QueryChain<unknown>;
};

type FetchAllProjectDocumentsArgs = {
  projectId: string;
  select: string;
  pageSize?: number;
  client?: SupabaseLike;
};

export async function fetchAllProjectDocuments<T extends Record<string, unknown>>(
  args: FetchAllProjectDocumentsArgs,
): Promise<T[]> {
  const { projectId, select, pageSize = 500, client = supabase as unknown as SupabaseLike } = args;

  if (!projectId) return [];

  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from(TABLES.documents)
      .select(select)
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })
      .range(from, to) as QueryResult<T>;

    if (error) {
      throw new Error(error.message);
    }

    const chunk = (data ?? []) as T[];
    rows.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}
