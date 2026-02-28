import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { IconTrash, IconPlayerStop } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { downloadFromEdge } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { RunRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';

const STATUS_VARIANT: Record<string, 'blue' | 'green' | 'red' | 'gray'> = {
  running: 'blue',
  complete: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export default function RunDetail() {
  const { runId, projectId } = useParams<{ runId: string; projectId: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<RunRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [deleteOpened, setDeleteOpened] = useState(false);
  const openDelete = () => setDeleteOpened(true);
  const closeDelete = () => setDeleteOpened(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    if (!runId) return;
    setLoading(true);
    supabase
      .from(TABLES.runs)
      .select('run_id, conv_uid, schema_id, status, started_at, completed_at, total_blocks, completed_blocks, failed_blocks, owner_id, model_config')
      .eq('run_id', runId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        if (!data) { setError('Run not found'); setLoading(false); return; }
        const r = data as RunRow;
        if (projectId && r.conv_uid) {
          supabase
            .from(TABLES.documents)
            .select('project_id')
            .eq('conv_uid', r.conv_uid)
            .maybeSingle()
            .then(({ data: docData }) => {
              if (docData && (docData as { project_id: string }).project_id !== projectId) {
                navigate(`/app/elt/${(docData as { project_id: string }).project_id}/runs/${runId}`, { replace: true });
                return;
              }
              setRow(r);
              setLoading(false);
            });
        } else {
          setRow(r);
          setLoading(false);
        }
      });
  };

  useEffect(load, [runId, projectId, navigate]);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from(TABLES.projects)
      .select('project_name')
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProjectName((data as { project_name: string }).project_name);
      });
  }, [projectId]);

  const exportJsonl = async () => {
    if (!runId) return;
    try {
      await downloadFromEdge(`export-jsonl?run_id=${encodeURIComponent(runId)}`, `export-${runId}.jsonl`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleCancel = async () => {
    if (!runId) return;
    setCancelling(true);
    try {
      const { error: err } = await supabase.rpc('cancel_run', { p_run_id: runId });
      if (err) throw new Error(err.message);
      toast.warning('Run has been cancelled');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!runId) return;
    setDeleting(true);
    try {
      const { error: err } = await supabase.rpc('delete_run', { p_run_id: runId });
      if (err) throw new Error(err.message);
      toast.success('Run and all overlays removed');
      navigate(`/app/elt/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
      closeDelete();
    }
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <AppBreadcrumbs items={[
        { label: 'ELT', href: '/app/elt' },
        { label: projectName || 'Project', href: `/app/elt/${projectId}` },
        { label: `Run ${row?.run_id?.slice(0, 8) ?? ''}...` },
      ]} />
      <PageHeader title="Run" subtitle={row?.run_id}>
        <button
          type="button"
          className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
          onClick={load}
        >
          Refresh
        </button>
        {row?.status === 'running' && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-800 hover:bg-yellow-200 disabled:opacity-50 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconPlayerStop size={14} />}
            Cancel
          </button>
        )}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
          onClick={openDelete}
        >
          <IconTrash size={14} />
          Delete
        </button>
      </PageHeader>
      {error && <ErrorAlert message={error} />}
      {row && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md border p-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="mt-1">
                <Badge variant={STATUS_VARIANT[row.status] ?? 'gray'}>{row.status}</Badge>
              </div>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-xs text-muted-foreground">Total blocks</span>
              <span className="mt-1 block font-semibold">{row.total_blocks}</span>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-xs text-muted-foreground">Completed</span>
              <span className="mt-1 block font-semibold">
                {row.completed_blocks}{' '}
                <span className="text-sm text-muted-foreground">(+{row.failed_blocks} failed)</span>
              </span>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={exportJsonl}
            >
              Export JSONL
            </button>
          </div>
        </>
      )}

      <DialogRoot open={deleteOpened} onOpenChange={(e) => { if (!e.open) closeDelete(); }}>
        <DialogContent>
          <DialogCloseTrigger />
          <DialogTitle>Delete run</DialogTitle>
          <DialogBody>
            <span className="text-sm">
              This will permanently delete this run and all its block overlays. This cannot be undone.
            </span>
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              onClick={closeDelete}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <div className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
