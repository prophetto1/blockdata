import { useMemo, useState } from "react";

// This is a UI-only mockup that matches the current backend direction:
// - Blocks are immutable rows (documents + blocks)
// - A "run" is an overlay (annotation_runs + block_annotations)
// - Without a worker connected, runs are "prepared" and do not advance

const DOC = {
  source_uid: "6485538b57c3…",
  doc_uid: "2293b6d1e755…",
  title: "Marbury v. Madison (1803)",
  status: "ingested",
  blocks_count: 156,
  uploaded_at: "2026-01-15",
};

const BLOCKS = [
  { index: 0, type: "heading", section_path: ["Opinion"], content: "SUPREME COURT OF THE UNITED STATES" },
  { index: 1, type: "paragraph", section_path: ["Opinion"], content: "Chief Justice Marshall delivered the opinion of the Court." },
  { index: 2, type: "heading", section_path: ["Opinion", "Question I"], content: "Question I" },
  { index: 3, type: "paragraph", section_path: ["Opinion", "Question I"], content: "In the order in which the Court has viewed this subject…" },
  { index: 4, type: "paragraph", section_path: ["Opinion", "Question I", "Right"], content: "1st. Has the applicant a right to the commission he demands?" },
  { index: 5, type: "paragraph", section_path: ["Opinion", "Question I", "Remedy"], content: "2dly. If he has a right, and that right has been violated…" },
  { index: 6, type: "blockquote", section_path: ["Opinion"], content: "It is emphatically the province and duty of the judicial department…" },
];

const RUNS = [
  // Prepared run (exists in DB; no worker connected yet)
  {
    run_id: "b7a5d0d2-…",
    schema_ref: "prose_optimizer_v1",
    status: "prepared",
    progress: { complete: 0, failed: 0, total: 156 },
    created_at: "2026-02-02",
  },
];

const OUTLINE = [
  { label: "Opinion", children: [{ label: "Question I", children: [{ label: "Right" }, { label: "Remedy" }] }, { label: "Question II", children: [{ label: "Mandamus" }] }] },
  { label: "Conclusion" },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function StatusDot({ status }) {
  const color =
    status === "ingested"
      ? "bg-emerald-500"
      : status === "converting"
      ? "bg-amber-500"
      : status === "conversion_failed" || status === "ingest_failed"
      ? "bg-rose-500"
      : "bg-zinc-500";
  return <span className={cx("inline-block w-2 h-2 rounded-full", color)} />;
}

function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : tone === "warn"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : tone === "bad"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : "bg-zinc-500/10 text-zinc-300 border-zinc-600/30";
  return <span className={cx("text-[11px] px-2 py-0.5 rounded-full border", cls)}>{children}</span>;
}

function Btn({ children, variant = "primary", ...props }) {
  const cls =
    variant === "primary"
      ? "bg-sky-500 hover:bg-sky-400 text-zinc-950"
      : variant === "ghost"
      ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700"
      : "bg-zinc-900 text-zinc-200 border border-zinc-700";
  return (
    <button
      {...props}
      className={cx("px-3 py-2 rounded-lg text-sm font-semibold transition-colors", cls)}
    >
      {children}
    </button>
  );
}

function OutlineTree({ nodes, depth = 0 }) {
  return (
    <div className="space-y-1">
      {nodes.map((n) => (
        <div key={n.label}>
          <div className={cx("text-sm text-zinc-200", depth ? "pl-3" : "")}>
            <span className="text-zinc-500 mr-2">{depth ? "└" : "•"}</span>
            {n.label}
          </div>
          {n.children ? (
            <div className="pl-4 mt-1">
              <OutlineTree nodes={n.children} depth={depth + 1} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BlockRow({ b, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full text-left px-3 py-2 rounded-lg border transition-colors",
        active ? "bg-zinc-800/60 border-zinc-700" : "bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/60"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">#{String(b.index).padStart(3, "0")}</span>
          <Pill>{b.type}</Pill>
        </div>
        <span className="text-xs text-zinc-500">{b.section_path?.slice(-1)?.[0] || ""}</span>
      </div>
      <div className="mt-1 text-sm text-zinc-200 line-clamp-2">{b.content}</div>
    </button>
  );
}

function RunRow({ run, onExport }) {
  const tone = run.status === "failed" ? "bad" : "neutral";
  const label = run.status === "prepared" ? "Prepared" : run.status === "failed" ? "Failed" : run.status;

  const done = run.progress.complete + run.progress.failed;
  const pct = Math.max(0, Math.min(100, Math.round((done / Math.max(1, run.progress.total)) * 100)));

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Pill tone={tone}>{label}</Pill>
            <span className="text-sm text-zinc-200 font-semibold">{run.schema_ref}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500 font-mono truncate">{run.run_id}</div>
          <div className="mt-1 text-xs text-zinc-500">{run.created_at}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-zinc-200">
            {done}/{run.progress.total}
          </div>
          <div className="text-xs text-zinc-500">{pct}%</div>
        </div>
      </div>

      {run.status === "prepared" ? (
        <div className="mt-3 text-xs text-zinc-500">
          Run exists and exports by <span className="font-mono">run_id</span>. No worker is connected yet.
        </div>
      ) : null}

      <div className="mt-3 flex gap-2 justify-end">
        <Btn variant="ghost" onClick={onExport}>
          Export overlay JSONL
        </Btn>
      </div>
    </div>
  );
}

export default function MdAnnotateMockupV2() {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const selected = useMemo(() => BLOCKS.find((b) => b.index === selectedBlockIndex) || BLOCKS[0], [selectedBlockIndex]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button className="text-sm text-zinc-400 hover:text-zinc-200">← Dashboard</button>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="text-xs text-zinc-500 font-mono">/documents/{DOC.source_uid}</div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-zinc-100 truncate">{DOC.title}</h1>
                <div className="flex items-center gap-2">
                  <StatusDot status={DOC.status} />
                  <span className="text-sm text-zinc-300 capitalize">{DOC.status}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{DOC.blocks_count} blocks</span>
                <span>•</span>
                <span>{DOC.uploaded_at}</span>
                <span>•</span>
                <span className="font-mono">doc_uid: {DOC.doc_uid}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Btn variant="ghost">Export blocks JSONL</Btn>
              <Btn>Prepare overlay →</Btn>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-4">
          <div className="col-span-3 bg-zinc-900/20 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-zinc-200">Outline</h2>
              <Pill>from headings</Pill>
            </div>
            <OutlineTree nodes={OUTLINE} />
          </div>

          <div className="col-span-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-zinc-200">Blocks</h2>
              <div className="text-xs text-zinc-500">immutable inventory</div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {BLOCKS.map((b) => (
                <BlockRow
                  key={b.index}
                  b={b}
                  active={b.index === selectedBlockIndex}
                  onClick={() => setSelectedBlockIndex(b.index)}
                />
              ))}
              <div className="text-xs text-zinc-600 pt-2">…</div>
            </div>

            <div className="mt-4 bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono">#{String(selected.index).padStart(3, "0")}</span>
                  <Pill>{selected.type}</Pill>
                </div>
                <div className="text-xs text-zinc-500">{(selected.section_path || []).join(" / ")}</div>
              </div>
              <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap">{selected.content}</div>
            </div>
          </div>

          <div className="col-span-3 bg-zinc-900/20 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-zinc-200">Overlays</h2>
              <Pill>prepared</Pill>
            </div>

            <div className="space-y-3">
              {RUNS.map((r) => (
                <RunRow key={r.run_id} run={r} onExport={() => {}} />
              ))}
            </div>

            <div className="mt-4">
              <Btn variant="ghost" className="w-full">
                + New overlay
              </Btn>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-600">
          This layout stays accurate now: the right column is an overlay surface. It shows what can be exported by{" "}
          <span className="font-mono">run_id</span>; it does not imply any model is running inside the web app.
        </div>
      </div>
    </div>
  );
}
