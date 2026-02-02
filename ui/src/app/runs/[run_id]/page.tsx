"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Play, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { downloadExportJsonl } from "@/lib/functions";
import { PageTemplate, useAuth } from "@/components/app/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RunRow = {
  run_id: string;
  doc_uid: string;
  status: string;
  total_blocks: number;
  completed_blocks: number;
  failed_blocks: number;
  started_at: string;
  schemas?: { schema_ref: string; schema_uid: string } | null;
};

function truncateHash(s: string, n = 12) {
  return s.length <= n ? s : `${s.slice(0, n)}...`;
}

function RunStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </Badge>
      );
    case "running":
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Running
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function RunPage() {
  const params = useParams<{ run_id: string }>();
  const run_id = params.run_id;
  const { sessionReady, signedIn } = useAuth();

  const [run, setRun] = useState<RunRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      const { data, error: selErr } = await supabase
        .from("annotation_runs")
        .select(
          "run_id, doc_uid, status, total_blocks, completed_blocks, failed_blocks, started_at, schemas(schema_ref, schema_uid)"
        )
        .eq("run_id", run_id)
        .maybeSingle();
      if (cancelled) return;
      if (selErr) {
        setError(selErr.message);
        return;
      }
      // Supabase returns schemas as array when joining, extract first element
      if (data) {
        const normalized = {
          ...data,
          schemas: Array.isArray(data.schemas) ? data.schemas[0] : data.schemas,
        };
        setRun(normalized as RunRow);
      } else {
        setRun(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, run_id]);

  const handleExport = async () => {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      await downloadExportJsonl({ run_id: run.run_id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const progressPercent = run ? Math.round((run.completed_blocks / Math.max(run.total_blocks, 1)) * 100) : 0;

  return (
    <PageTemplate
      title={run?.schemas?.schema_ref || "Annotation Run"}
      description={run ? `Started ${new Date(run.started_at).toLocaleString()}` : undefined}
      breadcrumbs={[
        { label: truncateHash(run?.doc_uid || ""), href: run ? `/documents/${run.doc_uid}` : undefined },
        { label: `Run ${truncateHash(run_id)}` },
      ]}
      requireAuth={true}
      loading={!sessionReady || (signedIn && !run && !error)}
      loadingMessage="Loading run..."
      error={!run && error ? error : null}
    >
      {run && (
        <div className="space-y-6">
          {/* Run info card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  {run.schemas?.schema_ref || "Annotation Run"}
                </CardTitle>
                <RunStatusBadge status={run.status} />
              </div>
              <CardDescription className="font-mono text-xs space-y-1">
                <div>run_id: {truncateHash(run.run_id, 32)}</div>
                <div>doc_uid: {truncateHash(run.doc_uid, 32)}</div>
                <div>schema_uid: {run.schemas?.schema_uid ? truncateHash(run.schemas.schema_uid, 32) : "unknown"}</div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-mono">
                    {run.completed_blocks}/{run.total_blocks} blocks ({progressPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {run.failed_blocks > 0 && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {run.failed_blocks} blocks failed
                  </p>
                )}
              </div>

              {/* Export button */}
              <Button variant="outline" onClick={handleExport} disabled={busy}>
                <Download className="mr-2 h-4 w-4" />
                {busy ? "Exporting..." : "Export overlay JSONL"}
              </Button>

              {/* Back to document link */}
              <div className="pt-2">
                <Link
                  href={`/documents/${run.doc_uid}`}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Back to document
                </Link>
              </div>

              {/* Dev note */}
              <p className="text-xs text-muted-foreground border-t pt-4">
                This page will show live progress once the worker protocol is wired (claim &rarr; model &rarr; complete).
              </p>

              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageTemplate>
  );
}
