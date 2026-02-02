"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ingestDocument } from "@/lib/functions";
import { useAuth } from "@/components/app/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type DocRow = {
  source_uid: string;
  doc_uid: string | null;
  doc_title: string;
  status: string;
  uploaded_at: string;
  source_type: string;
};

function truncateHash(s: string, n = 8) {
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

function SignInCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your Supabase email and password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && password && handleSignIn()}
          />
        </div>
        <Button className="w-full" onClick={handleSignIn} disabled={!email || !password || busy}>
          {busy ? "Signing in..." : "Sign in"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          This is a private dev UI. It will evolve quickly.
        </p>
      </CardContent>
    </Card>
  );
}

function UploadCard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [immutableSchemaRef, setImmutableSchemaRef] = useState("md_prose_v1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = useMemo(
    () => Boolean(file && immutableSchemaRef && docTitle),
    [file, immutableSchemaRef, docTitle]
  );

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const r = await ingestDocument({
        file,
        immutable_schema_ref: immutableSchemaRef,
        doc_title: docTitle,
      });
      router.push(`/documents/${r.source_uid}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload and ingest
        </CardTitle>
        <CardDescription>
          Produces deterministic blocks and enables JSONL export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">File</Label>
          <Input
            id="file"
            type="file"
            accept=".md,.markdown,.docx,.pdf,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !docTitle) {
                const name = f.name.replace(/\.[^.]+$/, "");
                setDocTitle(name);
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="doc-title">Document title</Label>
          <Input
            id="doc-title"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="schema">Immutable schema</Label>
          <Select value={immutableSchemaRef} onValueChange={setImmutableSchemaRef}>
            <SelectTrigger id="schema">
              <SelectValue placeholder="Select schema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="md_prose_v1">md_prose_v1</SelectItem>
              <SelectItem value="law_case_v1">law_case_v1</SelectItem>
              <SelectItem value="kb_chunk_v1">kb_chunk_v1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" disabled={!canUpload || busy} onClick={handleUpload}>
          {busy ? "Uploading..." : "Upload and ingest"}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function RecentDocumentsCard({ signedIn }: { signedIn: boolean }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setDocs([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: selErr } = await supabase
        .from("documents")
        .select("source_uid, doc_uid, doc_title, status, uploaded_at, source_type")
        .order("uploaded_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (selErr) {
        setError(selErr.message);
        setLoading(false);
        return;
      }
      setDocs((data || []) as DocRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent documents
        </CardTitle>
        <CardDescription>Click to view status, blocks, and export.</CardDescription>
      </CardHeader>
      <CardContent>
        {!signedIn ? (
          <p className="text-sm text-muted-foreground">Sign in to see your documents.</p>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Link
                key={d.source_uid}
                href={`/documents/${d.source_uid}`}
                className="flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate">{d.doc_title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <code>{d.source_type}</code>
                    <span>-</span>
                    <code>{truncateHash(d.source_uid)}</code>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={d.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const { sessionReady, signedIn } = useAuth();

  if (!sessionReady) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Upload documents and manage your block inventory.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Upload documents and manage your block inventory.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {signedIn ? <UploadCard /> : <SignInCard />}
        <RecentDocumentsCard signedIn={signedIn} />
      </div>
    </div>
  );
}
