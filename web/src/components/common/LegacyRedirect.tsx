import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

/**
 * Redirects old flat routes to their project-scoped equivalents.
 * Looks up the entity's project_id, then navigates to the correct URL.
 */

export function LegacyDocumentRedirect() {
  const { sourceUid } = useParams<{ sourceUid: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceUid) return;
    supabase
      .from(TABLES.documents)
      .select('project_id')
      .eq('source_uid', sourceUid)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.project_id) {
          navigate(`/app/projects/${data.project_id}/documents/${sourceUid}`, { replace: true });
        } else {
          setError('Document not found');
        }
      });
  }, [sourceUid, navigate]);

  if (error) return <div className="mt-5 flex items-center justify-center"><span className="text-sm text-destructive">{error}</span></div>;
  return <div className="mt-5 flex items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>;
}

export function LegacyRunRedirect() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    supabase
      .from(TABLES.runs)
      .select('conv_uid')
      .eq('run_id', runId)
      .maybeSingle()
      .then(async ({ data: run }) => {
        if (!run?.conv_uid) { setError('Run not found'); return; }
        const { data: doc } = await supabase
          .from(TABLES.documents)
          .select('project_id')
          .eq('conv_uid', run.conv_uid)
          .maybeSingle();
        if (doc?.project_id) {
          navigate(`/app/projects/${doc.project_id}/runs/${runId}`, { replace: true });
        } else {
          setError('Run not found');
        }
      });
  }, [runId, navigate]);

  if (error) return <div className="mt-5 flex items-center justify-center"><span className="text-sm text-destructive">{error}</span></div>;
  return <div className="mt-5 flex items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>;
}
