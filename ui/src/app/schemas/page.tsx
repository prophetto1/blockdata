"use client";

import { useEffect, useState } from "react";
import { Upload, FileJson, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadSchema } from "@/lib/functions";
import { PageTemplate, useAuth } from "@/components/app/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type SchemaRow = {
  schema_id: string;
  schema_ref: string;
  schema_uid: string;
  created_at: string;
};

function truncateHash(s: string, n = 12) {
  return s.length <= n ? s : `${s.slice(0, n)}...`;
}

export default function SchemasPage() {
  const { sessionReady, signedIn } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const { data, error: selErr } = await supabase
      .from("schemas")
      .select("schema_id, schema_ref, schema_uid, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (selErr) {
      setError(selErr.message);
      setLoading(false);
      return;
    }
    setSchemas((data || []) as SchemaRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!signedIn) {
      setSchemas([]);
      setLoading(false);
      return;
    }
    reload();
  }, [signedIn]);

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await uploadSchema({ schemaFile: file });
      setFile(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageTemplate
      title="Schemas"
      description="Upload and manage annotation schemas for document runs."
      breadcrumbs={[{ label: "Schemas" }]}
      requireAuth={true}
      loading={!sessionReady}
      loadingMessage="Initializing..."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload schema
            </CardTitle>
            <CardDescription>Stores a reusable annotation schema for runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schema-file">Schema JSON file</Label>
              <Input
                id="schema-file"
                type="file"
                accept="application/json,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button className="w-full" disabled={!file || busy} onClick={handleUpload}>
              <Upload className="mr-2 h-4 w-4" />
              {busy ? "Uploading..." : "Upload schema"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Try <code>json-schemas/user-defined/prose-optimizer-v1.schema.json</code>
            </p>
          </CardContent>
        </Card>

        {/* Schemas list card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Your schemas
            </CardTitle>
            <CardDescription>Use these when creating annotation runs.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : schemas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schemas yet.</p>
            ) : (
              <div className="space-y-2">
                {schemas.map((s) => (
                  <div key={s.schema_id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{s.schema_ref}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground font-mono">
                      id: {truncateHash(s.schema_id, 18)} | uid: {truncateHash(s.schema_uid, 18)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
