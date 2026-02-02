"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, Play, FileText, Layers, Hash, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createRun, downloadExportJsonl } from "@/lib/functions";
import { PageTemplate, useAuth } from "@/components/app/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DocumentRow = {
  source_uid: string;
  doc_uid: string | null;
  md_uid: string | null;
  source_type: string;
  source_locator: string;
  md_locator: string | null;
  doc_title: string;
  uploaded_at: string;
  immutable_schema_ref: string;
  status: string;
  error: string | null;
};

type BlockRow = {
  block_uid: string;
  block_index: number;
  block_type: string;
  section_path: string[];
  content_original: string;
};

type SchemaRow = {
  schema_id: string;
  schema_ref: string;
  schema_uid: string;
};

type RunRow = {
  run_id: string;
  status: string;
  started_at: string;
  schemas?: { schema_ref: string; schema_uid: string } | null;
};

function truncateHash(s: string, n = 12) {
  return s.length <= n ? s : `${s.slice(0, n)}...`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ingested":
      return <Badge variant="default">Ingested</Badge>;
    case "converting":
      return <Badge variant="secondary">Converting</Badge>;
    case "conversion_failed":
    case "ingest_failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function BlockTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "heading":
      return <Hash className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
}

export default function DocumentPage() {
  const params = useParams<{ source_uid: string }>();
  const router = useRouter();
  const source_uid = params.source_uid;
  const { sessionReady, signedIn } = useAuth();

  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksPage, setBlocksPage] = useState(0);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [schemaId, setSchemaId] = useState<string>("");
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch document
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const fetchDoc = async () => {
      const { data, error: selErr } = await supabase
        .from("documents")
        .select(
          "source_uid, doc_uid, md_uid, source_type, source_locator, md_locator, doc_title, uploaded_at, immutable_schema_ref, status, error"
        )
        .eq("source_uid", source_uid)
        .maybeSingle();
      if (cancelled) return;
      if (selErr) {
        setError(selErr.message);
        return;
      }
      setDoc((data as DocumentRow) || null);
    };

    fetchDoc();
    const t = setInterval(fetchDoc, 2500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [signedIn, source_uid]);

  const doc_uid = doc?.doc_uid || null;
  const canLoadBlocks = useMemo(() => Boolean(doc_uid && doc?.status === "ingested"), [doc_uid, doc?.status]);

  // Fetch schemas
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("schemas")
        .select("schema_id, schema_ref, schema_uid")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setSchemas((data || []) as SchemaRow[]);
      if (!schemaId && data && data.length > 0) setSchemaId((data[0] as SchemaRow).schema_id);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, schemaId]);

  // Fetch runs
  useEffect(() => {
    if (!signedIn || !doc_uid) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("annotation_runs")
        .select("run_id, status, started_at, schemas(schema_ref, schema_uid)")
        .eq("doc_uid", doc_uid)
        .order("started_at", { ascending: false });
      if (cancelled) return;
      // Supabase returns schemas as array when joining, extract first element
      const normalized = (data || []).map((r: any) => ({
        ...r,
        schemas: Array.isArray(r.schemas) ? r.schemas[0] : r.schemas,
      }));
      setRuns(normalized as RunRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, doc_uid]);

  // Fetch blocks
  useEffect(() => {
    if (!canLoadBlocks) {
      setBlocks([]);
      setBlocksPage(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setBlocksLoading(true);
      const { data, error: selErr } = await supabase
        .from("blocks")
        .select("block_uid, block_index, block_type, section_path, content_original")
        .eq("doc_uid", doc_uid)
        .order("block_index", { ascending: true })
        .range(0, 99);
      if (cancelled) return;
      if (selErr) {
        setError(selErr.message);
        setBlocksLoading(false);
        return;
      }
      setBlocks((data || []) as BlockRow[]);
      setBlocksPage(1);
      setBlocksLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadBlocks, doc_uid]);

  const loadMoreBlocks = async () => {
    if (!doc_uid) return;
    setBlocksLoading(true);
    const from = blocksPage * 100;
    const { data, error: selErr } = await supabase
      .from("blocks")
      .select("block_uid, block_index, block_type, section_path, content_original")
      .eq("doc_uid", doc_uid)
      .order("block_index", { ascending: true })
      .range(from, from + 99);
    if (selErr) {
      setError(selErr.message);
      setBlocksLoading(false);
      return;
    }
    setBlocks((prev) => [...prev, ...((data || []) as BlockRow[])]);
    setBlocksPage((p) => p + 1);
    setBlocksLoading(false);
  };

  const handleExport = async () => {
    if (!doc?.doc_uid) return;
    setBusy("Exporting...");
    setError(null);
    try {
      await downloadExportJsonl({ doc_uid: doc.doc_uid });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleCreateRun = async () => {
    if (!doc_uid) return;
    setBusy("Creating run...");
    setError(null);
    try {
      const r = await createRun({ doc_uid, schema_id: schemaId });
      router.push(`/runs/${r.run_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageTemplate
      title={doc?.doc_title || "Document"}
      description={doc ? `${doc.source_type} document uploaded ${new Date(doc.uploaded_at).toLocaleString()}` : undefined}
      breadcrumbs={[{ label: truncateHash(source_uid) }]}
      requireAuth={true}
      loading={!sessionReady || (signedIn && !doc && !error)}
      loadingMessage="Loading document..."
      error={!doc && error ? error : null}
    >
      {doc && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content - left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document info card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {doc.doc_title}
                  </CardTitle>
                  <StatusBadge status={doc.status} />
                </div>
                <CardDescription className="font-mono text-xs space-y-1">
                  <div>source_uid: {truncateHash(doc.source_uid, 24)}</div>
                  <div>doc_uid: {doc.doc_uid ? truncateHash(doc.doc_uid, 24) : "pending"}</div>
                  <div>md_uid: {doc.md_uid ? truncateHash(doc.md_uid, 24) : "pending"}</div>
                  <div>schema: {doc.immutable_schema_ref}</div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={!doc.doc_uid || doc.status !== "ingested" || Boolean(busy)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {busy === "Exporting..." ? busy : "Export JSONL"}
                </Button>
              </CardContent>
              {doc.error && (
                <CardContent className="pt-0">
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    {doc.error}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Blocks card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Blocks
                </CardTitle>
                <CardDescription>
                  Immutable inventory in reading order. {blocks.length > 0 && `Showing ${blocks.length} blocks.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!canLoadBlocks ? (
                  <p className="text-sm text-muted-foreground">
                    Blocks appear when the document reaches <Badge variant="outline">ingested</Badge> status.
                  </p>
                ) : blocks.length === 0 && blocksLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blocks.map((b) => (
                      <div key={b.block_uid} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="font-mono">
                              #{b.block_index}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <BlockTypeIcon type={b.block_type} />
                              {b.block_type}
                            </Badge>
                          </div>
                          {b.section_path.length > 0 && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {b.section_path.join(" > ")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm line-clamp-3">{b.content_original}</p>
                      </div>
                    ))}
                    <Button variant="outline" onClick={loadMoreBlocks} disabled={blocksLoading}>
                      {blocksLoading ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - right column */}
          <div className="space-y-6">
            {/* Overlays card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Annotation Runs
                </CardTitle>
                <CardDescription>Create runs to apply schemas and export overlay JSONL.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Schema</label>
                  {schemas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No schemas yet.{" "}
                      <Link className="text-primary underline" href="/schemas">
                        Upload one
                      </Link>
                      .
                    </p>
                  ) : (
                    <Select value={schemaId} onValueChange={setSchemaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schema" />
                      </SelectTrigger>
                      <SelectContent>
                        {schemas.map((s) => (
                          <SelectItem key={s.schema_id} value={s.schema_id}>
                            {s.schema_ref}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button
                  className="w-full"
                  disabled={!doc_uid || doc.status !== "ingested" || !schemaId || Boolean(busy)}
                  onClick={handleCreateRun}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {busy === "Creating run..." ? busy : "Create run"}
                </Button>

                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {runs.slice(0, 10).map((r) => (
                      <Link
                        key={r.run_id}
                        href={`/runs/${r.run_id}`}
                        className="block rounded-lg border p-3 transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{r.schemas?.schema_ref || "schema"}</span>
                          <Badge variant="outline">{r.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground font-mono">
                          {truncateHash(r.run_id, 18)}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error card */}
            {error && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Error
                  </CardTitle>
                  <CardDescription className="text-destructive/80">{error}</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
