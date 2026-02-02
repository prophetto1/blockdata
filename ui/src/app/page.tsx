"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Layers, Play, Plus, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StatCard } from "@/components/stat-card";
import { DocumentRow } from "@/components/document-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type DocRow = {
  source_uid: string;
  doc_title: string;
  status: "pending" | "processing" | "complete" | "failed";
  uploaded_at: string;
};

// Map backend status to UI status
function mapStatus(status: string): "pending" | "processing" | "complete" | "failed" {
  switch (status) {
    case "ingested":
      return "complete";
    case "converting":
      return "processing";
    case "conversion_failed":
    case "ingest_failed":
      return "failed";
    default:
      return "pending";
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

export default function DashboardPage() {
  const [stats, setStats] = useState({ documents: 0, runs: 0, schemas: 0 });
  const [recentDocuments, setRecentDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        // Fetch document count and recent documents
        const { data: docs, count: docCount } = await supabase
          .from("documents")
          .select("source_uid, doc_title, status, uploaded_at", { count: "exact" })
          .order("uploaded_at", { ascending: false })
          .limit(5);

        // Fetch runs count
        const { count: runCount } = await supabase
          .from("annotation_runs")
          .select("*", { count: "exact", head: true });

        // Fetch schemas count
        const { count: schemaCount } = await supabase
          .from("schemas")
          .select("*", { count: "exact", head: true });

        if (cancelled) return;

        setStats({
          documents: docCount || 0,
          runs: runCount || 0,
          schemas: schemaCount || 0,
        });

        setRecentDocuments(
          (docs || []).map((d) => ({
            source_uid: d.source_uid,
            doc_title: d.doc_title,
            status: mapStatus(d.status),
            uploaded_at: d.uploaded_at,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your document annotation workspace
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Documents"
          value={stats.documents}
          description="Total documents ingested"
          icon={FileText}
        />
        <StatCard
          title="Annotation Runs"
          value={stats.runs}
          description="Total annotation runs"
          icon={Play}
        />
        <StatCard
          title="Schemas"
          value={stats.schemas}
          description="Active annotation schemas"
          icon={Layers}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/documents">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </Link>
        <Link href="/runs">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Annotation Run
          </Button>
        </Link>
      </div>

      {/* Recent Documents */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Documents</h2>
          <Link href="/documents">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card/50">
          {/* Table header - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
            <div className="w-9" />
            <div className="flex-1">Document</div>
            <div className="w-24 text-right">Updated</div>
            <div className="w-20">Status</div>
          </div>

          <div className="divide-y divide-border">
            {recentDocuments.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No documents yet. Upload your first document to get started.
              </div>
            ) : (
              recentDocuments.map((doc) => (
                <DocumentRow
                  key={doc.source_uid}
                  sourceUid={doc.source_uid}
                  title={doc.doc_title}
                  status={doc.status}
                  blockCount={0}
                  updatedAt={timeAgo(doc.uploaded_at)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
