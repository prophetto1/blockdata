import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';

export function useDocument(sourceUid: string | undefined) {
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceUid) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from(TABLES.documents)
      .select('*')
      .eq('source_uid', sourceUid)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (!data) setError('Document not found');
        else setDoc(data as DocumentRow);
        setLoading(false);
      });
  }, [sourceUid]);

  return { doc, loading, error };
}
