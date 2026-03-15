import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeSchemaUid } from '@/lib/extractionSchemaHelpers';
import type { ExtractionSchemaRow } from '@/lib/types';

export function useExtractionSchemas(projectId: string | null) {
  const [schemas, setSchemas] = useState<ExtractionSchemaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemas = useCallback(async () => {
    if (!projectId) { setSchemas([]); setLoading(false); setError(null); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('extraction_schemas')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });
    if (err) setError(err.message);
    else setSchemas(data ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`extraction_schemas:${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'extraction_schemas',
        filter: `project_id=eq.${projectId}`,
      }, () => fetchSchemas())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [projectId, fetchSchemas]);

  const createSchema = useCallback(async (
    schemaName: string,
    schemaBody: Record<string, unknown>,
    extractionTarget: 'page' | 'document' = 'document',
  ) => {
    if (!projectId) throw new Error('No project selected');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const bodyHash = await computeSchemaUid(schemaBody);
    const { data, error: err } = await supabase
      .from('extraction_schemas')
      .insert({
        owner_id: user.id,
        project_id: projectId,
        schema_name: schemaName,
        schema_body: schemaBody,
        schema_body_hash: bodyHash,
        extraction_target: extractionTarget,
      })
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data as ExtractionSchemaRow;
  }, [projectId]);

  const updateSchema = useCallback(async (
    schemaId: string,
    updates: Partial<Pick<ExtractionSchemaRow, 'schema_name' | 'schema_body' | 'extraction_target'>>,
  ) => {
    const patch: Record<string, unknown> = { ...updates };
    if (updates.schema_body) {
      patch.schema_body_hash = await computeSchemaUid(updates.schema_body);
    }
    const { error: err } = await supabase
      .from('extraction_schemas')
      .update(patch)
      .eq('schema_id', schemaId);
    if (err) throw new Error(err.message);
  }, []);

  const deleteSchema = useCallback(async (schemaId: string) => {
    // Attempt delete directly — the FK on extraction_jobs.schema_id is the
    // real safety net. If jobs reference this schema, Postgres returns a
    // foreign_key_violation which we translate to a friendly message.
    const { error: err } = await supabase
      .from('extraction_schemas')
      .delete()
      .eq('schema_id', schemaId);
    if (err) {
      if (err.code === '23503') {
        throw new Error('Cannot delete schema: extraction jobs reference it');
      }
      throw new Error(err.message);
    }
  }, []);

  return { schemas, loading, error, createSchema, updateSchema, deleteSchema, refetch: fetchSchemas };
}
