"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/app/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type RunRow = {
  run_id: string;
  doc_uid: string;
  status: string;
  total_blocks: number;
  completed_blocks: number;
  failed_blocks: number;
  started_at: string;
  schemas: { schema_ref: string }[] | null;
  documents: { doc_title: string }[] | null;
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-rose-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-zinc-500" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "running":
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function RunsPage() {
  const { sessionReady, signedIn } = useAuth();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setRuns([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRuns() {
      try {
        const { data, error: selErr } = await supabase
          .from("annotation_runs")
          .select(`
            run_id,
            doc_uid,
            status,
            total_blocks,
            completed_blocks,
            failed_blocks,
            started_at,
            schemas(schema_ref),
            documents(doc_title)
          `)
          .order("started_at", { ascending: false })
          .limit(50);

        if (cancelled) return;

        if (selErr) {
          setError(selErr.message);
          setLoading(false);
          return;
        }

        setRuns((data || []) as unknown as RunRow[]);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRuns();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!sessionReady) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Annotation Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your annotation runs
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You need to be signed in to view annotation runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/documents">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Annotation Runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage your annotation runs
        </p>
      </div>

      {/* Runs list */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error loading runs</CardTitle>
            <CardDescription className="text-destructive/80">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : runs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              No annotation runs yet
            </CardTitle>
            <CardDescription>
              Create an annotation run from a document detail page to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/documents">Go to Documents</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border bg-card/50">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-12 items-center gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Document</div>
            <div className="col-span-2">Schema</div>
            <div className="col-span-2 text-center">Progress</div>
            <div className="col-span-2 text-right">Created</div>
            <div className="col-span-2">Status</div>
          </div>

          <div className="divide-y divide-border">
            {runs.map((run) => (
              <Link
                key={run.run_id}
                href={`/runs/${run.run_id}`}
                className="group flex sm:grid sm:grid-cols-12 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                {/* Document */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <StatusIcon status={run.status} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {run.documents?.[0]?.doc_title || "Unknown document"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {run.run_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Schema */}
                <div className="col-span-2 hidden sm:block">
                  <span className="text-sm text-muted-foreground">
                    {run.schemas?.[0]?.schema_ref || "N/A"}
                  </span>
                </div>

                {/* Progress */}
                <div className="col-span-2 hidden sm:flex flex-col items-center gap-1">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{
                        width: `${run.total_blocks > 0 ? (run.completed_blocks / run.total_blocks) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {run.completed_blocks}/{run.total_blocks}
                  </span>
                </div>

                {/* Created */}
            <div className="col-span-2 hidden sm:block text-right">
                  <span className="text-sm text-muted-foreground">
                    {timeAgo(run.started_at)}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2 ml-auto sm:ml-0">
                  <StatusBadge status={run.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
