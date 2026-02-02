import { useState } from "react";

// --- Mock Data ---
const DOCS = [
  { source_uid: "a1b2c3", title: "Marbury v. Madison (1803)", status: "ingested", blocks: 47, created: "2026-01-28" },
  { source_uid: "d4e5f6", title: "Brown v. Board of Education (1954)", status: "converting", blocks: null, created: "2026-01-30" },
  { source_uid: "g7h8i9", title: "Roe v. Wade (1973)", status: "conversion_failed", blocks: null, created: "2026-01-31" },
  { source_uid: "j0k1l2", title: "Miranda v. Arizona (1966)", status: "ingested", blocks: 63, created: "2026-02-01" },
  { source_uid: "m3n4o5", title: "Gideon v. Wainwright (1963)", status: "uploaded", blocks: null, created: "2026-02-02" },
];

const BLOCKS = [
  { index: 0, type: "heading", content: "# Marbury v. Madison, 5 U.S. 137 (1803)" },
  { index: 1, type: "paragraph", content: "Chief Justice Marshall delivered the opinion of the Court." },
  { index: 2, type: "heading", content: "## Opinion of the Court" },
  { index: 3, type: "paragraph", content: "In the order in which the Court has viewed this subject, the following questions have been considered and decided..." },
  { index: 4, type: "paragraph", content: "1st. Has the applicant a right to the commission he demands?" },
  { index: 5, type: "paragraph", content: "2dly. If he has a right, and that right has been violated, do the laws of his country afford him a remedy?" },
  { index: 6, type: "blockquote", content: "> It is emphatically the province and duty of the judicial department to say what the law is." },
  { index: 7, type: "paragraph", content: "Those who apply the rule to particular cases, must of necessity expound and interpret that rule." },
];

const RUNS = [
  { run_id: "r-001", doc_title: "Marbury v. Madison", schema: "strunk-18-v1", status: "complete", progress: { pending: 0, claimed: 0, complete: 47, failed: 0 }, created: "2026-01-29" },
  { run_id: "r-002", doc_title: "Miranda v. Arizona", schema: "strunk-18-v1", status: "running", progress: { pending: 28, claimed: 3, complete: 30, failed: 2 }, created: "2026-02-01" },
  { run_id: "r-003", doc_title: "Marbury v. Madison", schema: "citation-integrity-v2", status: "failed", progress: { pending: 0, claimed: 0, complete: 12, failed: 35 }, created: "2026-02-02" },
];

const ANNOTATIONS = [
  { block_index: 0, type: "heading", status: "complete", preview: '{"clarity": 0.95, "structure": "title"}' },
  { block_index: 1, type: "paragraph", status: "complete", preview: '{"clarity": 0.88, "voice": "passive"}' },
  { block_index: 2, type: "heading", status: "complete", preview: '{"clarity": 0.92, "structure": "section_header"}' },
  { block_index: 3, type: "paragraph", status: "claimed", preview: null },
  { block_index: 4, type: "paragraph", status: "pending", preview: null },
  { block_index: 5, type: "paragraph", status: "pending", preview: null },
  { block_index: 6, type: "blockquote", status: "failed", preview: '{"error": "context_window_exceeded"}' },
  { block_index: 7, type: "paragraph", status: "pending", preview: null },
];

const MY_SCHEMAS = [
  { name: "strunk-18-v1", version: "1.0.0", runs: 3, created: "2026-01-15", visibility: "private", fields: 4, author: "You" },
  { name: "citation-integrity-v2", version: "2.1.0", runs: 1, created: "2026-01-20", visibility: "private", fields: 6, author: "You" },
  { name: "legal-reasoning-v1", version: "1.0.0", runs: 0, created: "2026-02-01", visibility: "private", fields: 8, author: "You" },
];

const GALLERY_SCHEMAS = [
  { name: "bluebook-citation-v3", version: "3.0.0", runs: 142, created: "2025-11-05", visibility: "public", fields: 12, author: "LegalAI Lab", stars: 47, description: "Validates Bluebook citation format compliance across all 21 rule categories" },
  { name: "plain-language-audit-v2", version: "2.0.0", runs: 89, created: "2025-12-01", visibility: "public", fields: 7, author: "ClearLaw Project", stars: 31, description: "Scores readability and flags jargon, passive voice, and sentence complexity" },
  { name: "holdings-extraction-v1", version: "1.2.0", runs: 64, created: "2026-01-10", visibility: "public", fields: 5, author: "SCOTUS Mapper", stars: 23, description: "Extracts holdings, dicta, and procedural posture from judicial opinions" },
  { name: "irac-structure-v1", version: "1.0.0", runs: 38, created: "2026-01-18", visibility: "public", fields: 4, author: "1L Tools", stars: 15, description: "Labels blocks as Issue, Rule, Application, or Conclusion" },
];

// --- Shared Components ---
const StatusBadge = ({ status }) => {
  const colors = {
    ingested: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    complete: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    converting: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    running: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    claimed: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    pending: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    uploaded: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    conversion_failed: "bg-red-500/15 text-red-400 border-red-500/30",
    ingest_failed: "bg-red-500/15 text-red-400 border-red-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    private: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    public: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    org: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-zinc-700 text-zinc-300"}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const Breadcrumb = ({ items }) => (
  <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-4">
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1.5">
        {i > 0 && <span className="text-zinc-600">/</span>}
        {item.onClick ? (
          <button onClick={item.onClick} className="text-sky-400 hover:text-sky-300 transition-colors">{item.label}</button>
        ) : (
          <span className="text-zinc-300">{item.label}</span>
        )}
      </span>
    ))}
  </div>
);

const PrimaryBtn = ({ children, onClick, disabled, size = "md" }) => (
  <button onClick={onClick} disabled={disabled}
    className={`rounded-lg font-medium transition-all ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"} ${disabled ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20"}`}>
    {children}
  </button>
);

const GhostBtn = ({ children, onClick, variant = "default", size = "md" }) => {
  const styles = { default: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800", danger: "text-red-400 hover:text-red-300 hover:bg-red-500/10", success: "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" };
  return <button onClick={onClick} className={`rounded-lg font-medium transition-all ${size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${styles[variant]}`}>{children}</button>;
};

const FilterChips = ({ options, active, onChange }) => (
  <div className="flex gap-1.5 flex-wrap">
    <button onClick={() => onChange(null)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${!active ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"}`}>All</button>
    {options.map((opt) => (
      <button key={opt} onClick={() => onChange(opt)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${active === opt ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"}`}>{opt.replace("_", " ")}</button>
    ))}
  </div>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div className="flex gap-0.5 bg-zinc-800/50 rounded-lg p-0.5 mb-5">
    {tabs.map((tab) => (
      <button key={tab.id} onClick={() => onChange(tab.id)}
        className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${active === tab.id ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
        {tab.label}{tab.count != null && <span className="ml-1.5 text-xs text-zinc-500">({tab.count})</span>}
      </button>
    ))}
  </div>
);

const ProgressBar = ({ progress }) => {
  const total = progress.pending + progress.claimed + progress.complete + progress.failed;
  if (total === 0) return null;
  const pct = (n) => `${(n / total) * 100}%`;
  return (
    <div className="w-full">
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
        <div style={{ width: pct(progress.complete) }} className="bg-emerald-500 transition-all duration-500" />
        <div style={{ width: pct(progress.claimed) }} className="bg-sky-500 transition-all duration-500" />
        <div style={{ width: pct(progress.failed) }} className="bg-red-500 transition-all duration-500" />
        <div style={{ width: pct(progress.pending) }} className="bg-zinc-700 transition-all duration-500" />
      </div>
      <div className="flex justify-between mt-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{progress.complete} complete</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />{progress.claimed} claimed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{progress.failed} failed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />{progress.pending} pending</span>
      </div>
    </div>
  );
};

// --- Upload Modal ---
const UploadModal = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-zinc-100">Upload Document</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">&times;</button>
        </div>
        <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center mb-4 hover:border-zinc-500 transition-colors cursor-pointer">
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm text-zinc-400">Drop file here or <span className="text-sky-400">browse</span></p>
          <p className="text-xs text-zinc-600 mt-1">PDF, DOCX, MD, HTML</p>
        </div>
        <div className="space-y-3 mb-5">
          <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Document Title</label><input type="text" placeholder="e.g. Marbury v. Madison (1803)" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" /></div>
          <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Schema Reference</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>immutable-base-v1</option><option>strunk-18-v1</option></select></div>
        </div>
        <div className="flex gap-2 justify-end"><GhostBtn onClick={onClose}>Cancel</GhostBtn><PrimaryBtn onClick={onClose}>Upload &amp; Ingest</PrimaryBtn></div>
      </div>
    </div>
  );
};

// --- Run Config Drawer ---
const RunConfigDrawer = ({ open, onClose, docTitle }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border-l border-zinc-700 w-full max-w-sm p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Start Annotation Run</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">&times;</button>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 mb-5"><p className="text-xs text-zinc-500">Document</p><p className="text-sm text-zinc-200 font-medium">{docTitle}</p></div>
        <div className="space-y-4 mb-6">
          <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Run Name</label><input type="text" placeholder="e.g. Strunk analysis" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500" /></div>
          <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Annotation Schema</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>strunk-18-v1</option><option>citation-integrity-v2</option></select></div>
          <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>claude-sonnet-4-20250514</option><option>gpt-4o</option></select></div>
        </div>
        <PrimaryBtn onClick={onClose}>Create Run →</PrimaryBtn>
      </div>
    </div>
  );
};

// --- Documents Page ---
const DocumentsPage = ({ onNavigate }) => {
  const [filter, setFilter] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const filtered = filter ? DOCS.filter((d) => d.status === filter) : DOCS;
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-xl font-bold text-zinc-100">Documents</h1><p className="text-sm text-zinc-500 mt-0.5">{DOCS.length} documents · {DOCS.filter(d => d.status === "ingested").length} ready</p></div>
        <PrimaryBtn onClick={() => setUploadOpen(true)}>+ Upload</PrimaryBtn>
      </div>
      <div className="mb-4"><FilterChips options={["uploaded", "converting", "ingested", "conversion_failed"]} active={filter} onChange={setFilter} /></div>
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider"><th className="text-left px-4 py-3 font-medium">Title</th><th className="text-left px-4 py-3 font-medium">Status</th><th className="text-left px-4 py-3 font-medium">Blocks</th><th className="text-left px-4 py-3 font-medium">Created</th><th className="text-right px-4 py-3 font-medium">Actions</th></tr></thead>
        <tbody>{filtered.map((doc) => (
          <tr key={doc.source_uid} onClick={() => onNavigate("doc-detail", doc)} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors">
            <td className="px-4 py-3"><p className="text-sm font-medium text-zinc-200">{doc.title}</p><p className="text-xs text-zinc-600 font-mono mt-0.5">{doc.source_uid}</p></td>
            <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
            <td className="px-4 py-3 text-sm text-zinc-400">{doc.blocks ?? "—"}</td>
            <td className="px-4 py-3 text-sm text-zinc-500">{doc.created}</td>
            <td className="px-4 py-3 text-right">{doc.status === "ingested" && <GhostBtn variant="success" onClick={(e) => e.stopPropagation()}>Export ↓</GhostBtn>}</td>
          </tr>
        ))}</tbody></table>
      </div>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
};

// --- Document Detail ---
const DocumentDetailPage = ({ doc, onBack }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isFailed = doc.status === "conversion_failed" || doc.status === "ingest_failed";
  const isConverting = doc.status === "converting";
  const isReady = doc.status === "ingested";
  return (
    <div>
      <Breadcrumb items={[{ label: "Documents", onClick: onBack }, { label: doc.title }]} />
      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between">
          <div><div className="flex items-center gap-3 mb-1"><h1 className="text-lg font-bold text-zinc-100">{doc.title}</h1><StatusBadge status={doc.status} /></div><div className="flex gap-4 mt-2 text-xs text-zinc-500 font-mono"><span>source_uid: {doc.source_uid}</span><span>created: {doc.created}</span>{doc.blocks && <span>{doc.blocks} blocks</span>}</div></div>
          <div className="flex gap-2">{isReady && <GhostBtn variant="success">Export Blocks ↓</GhostBtn>}{isReady && <PrimaryBtn onClick={() => setDrawerOpen(true)}>Start Run →</PrimaryBtn>}{isFailed && <PrimaryBtn>Retry Ingest</PrimaryBtn>}</div>
        </div>
      </div>
      {isConverting && <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-8 text-center"><div className="inline-flex items-center gap-3"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /><span className="text-amber-400 font-medium">Converting document…</span></div></div>}
      {isFailed && <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6"><p className="text-red-400 font-medium mb-1">Conversion Failed</p><p className="text-sm text-zinc-400">Check the source file format and try again.</p></div>}
      {isReady && <div><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-zinc-300">Block Inventory</h2><span className="text-xs text-zinc-500">{BLOCKS.length} of {doc.blocks} blocks</span></div>
        <div className="border border-zinc-800 rounded-xl overflow-hidden">{BLOCKS.map((block) => (
          <div key={block.index} className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
            <div className="flex-shrink-0 w-8 text-right"><span className="text-xs text-zinc-600 font-mono">{block.index}</span></div>
            <div className="flex-shrink-0"><span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${block.type === "heading" ? "bg-violet-500/15 text-violet-400" : block.type === "blockquote" ? "bg-amber-500/15 text-amber-400" : "bg-zinc-700/50 text-zinc-400"}`}>{block.type}</span></div>
            <p className="text-sm text-zinc-300 leading-relaxed flex-1 truncate">{block.content}</p>
          </div>
        ))}</div></div>}
      <RunConfigDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} docTitle={doc.title} />
    </div>
  );
};

// --- Runs Page ---
const RunsPage = ({ onNavigate }) => {
  const [filter, setFilter] = useState(null);
  const filtered = filter ? RUNS.filter((r) => r.status === filter) : RUNS;
  return (
    <div>
      <div className="flex items-center justify-between mb-5"><div><h1 className="text-xl font-bold text-zinc-100">Annotation Runs</h1><p className="text-sm text-zinc-500 mt-0.5">{RUNS.length} runs · {RUNS.filter(r => r.status === "running").length} active</p></div></div>
      <div className="mb-4"><FilterChips options={["running", "complete", "failed", "cancelled"]} active={filter} onChange={setFilter} /></div>
      <div className="space-y-3">{filtered.map((run) => {
        const total = run.progress.pending + run.progress.claimed + run.progress.complete + run.progress.failed;
        const pct = total > 0 ? Math.round((run.progress.complete / total) * 100) : 0;
        return (
          <div key={run.run_id} onClick={() => onNavigate("run-detail", run)} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 cursor-pointer transition-all">
            <div className="flex items-start justify-between mb-3"><div><div className="flex items-center gap-2.5"><p className="text-sm font-semibold text-zinc-200">{run.run_id}</p><StatusBadge status={run.status} /></div><p className="text-xs text-zinc-500 mt-1">{run.doc_title} · schema: {run.schema} · {run.created}</p></div><span className="text-lg font-bold text-zinc-300">{pct}%</span></div>
            <ProgressBar progress={run.progress} />
          </div>
        );
      })}</div>
    </div>
  );
};

// --- Run Detail ---
const RunDetailPage = ({ run, onBack }) => {
  const isRunning = run.status === "running";
  const isComplete = run.status === "complete";
  const isFailed = run.status === "failed";
  const total = run.progress.pending + run.progress.claimed + run.progress.complete + run.progress.failed;
  return (
    <div>
      <Breadcrumb items={[{ label: "Runs", onClick: onBack }, { label: run.run_id }]} />
      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div><div className="flex items-center gap-3 mb-1"><h1 className="text-lg font-bold text-zinc-100">{run.run_id}</h1><StatusBadge status={run.status} />{isRunning && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}</div><div className="flex gap-4 mt-2 text-xs text-zinc-500"><span>doc: {run.doc_title}</span><span>schema: {run.schema}</span><span>{total} blocks</span></div></div>
          <div className="flex gap-2">{isRunning && <GhostBtn variant="danger">Cancel</GhostBtn>}{isFailed && <PrimaryBtn>Retry Failed ({run.progress.failed})</PrimaryBtn>}{(isComplete || isFailed) && <GhostBtn variant="success">Export JSONL ↓</GhostBtn>}</div>
        </div>
        <ProgressBar progress={run.progress} />
      </div>
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">Block Annotations</h2>
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider"><th className="text-left px-4 py-2.5 font-medium w-16">#</th><th className="text-left px-4 py-2.5 font-medium">Type</th><th className="text-left px-4 py-2.5 font-medium">Status</th><th className="text-left px-4 py-2.5 font-medium">Annotation Preview</th></tr></thead>
        <tbody>{ANNOTATIONS.map((ann) => (
          <tr key={ann.block_index} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
            <td className="px-4 py-2.5 text-xs text-zinc-500 font-mono">{ann.block_index}</td>
            <td className="px-4 py-2.5"><span className="text-xs font-mono text-zinc-400">{ann.type}</span></td>
            <td className="px-4 py-2.5"><StatusBadge status={ann.status} /></td>
            <td className="px-4 py-2.5">{ann.preview ? <code className="text-xs text-zinc-500 font-mono">{ann.preview}</code> : <span className="text-xs text-zinc-600 italic">—</span>}</td>
          </tr>
        ))}</tbody></table>
      </div>
    </div>
  );
};

// --- Schemas Page (Tier 2: Gallery + Builder) ---
const SchemasPage = ({ onNavigate }) => {
  const [tab, setTab] = useState("mine");
  const [builderOpen, setBuilderOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-5"><div><h1 className="text-xl font-bold text-zinc-100">Schemas</h1><p className="text-sm text-zinc-500 mt-0.5">Define annotation contracts for your documents</p></div><PrimaryBtn onClick={() => setBuilderOpen(true)}>+ New Schema</PrimaryBtn></div>
      <TabBar tabs={[{ id: "mine", label: "My Schemas", count: MY_SCHEMAS.length }, { id: "gallery", label: "Gallery", count: GALLERY_SCHEMAS.length }]} active={tab} onChange={setTab} />

      {tab === "mine" && <div className="border border-zinc-800 rounded-xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider"><th className="text-left px-4 py-3 font-medium">Name</th><th className="text-left px-4 py-3 font-medium">Version</th><th className="text-left px-4 py-3 font-medium">Fields</th><th className="text-left px-4 py-3 font-medium">Runs</th><th className="text-left px-4 py-3 font-medium">Visibility</th><th className="text-right px-4 py-3 font-medium">Actions</th></tr></thead>
        <tbody>{MY_SCHEMAS.map((s) => (
          <tr key={s.name} onClick={() => onNavigate("schema-detail", s)} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors cursor-pointer">
            <td className="px-4 py-3"><p className="text-sm font-medium text-zinc-200 font-mono">{s.name}</p></td>
            <td className="px-4 py-3 text-sm text-zinc-400">{s.version}</td>
            <td className="px-4 py-3 text-sm text-zinc-400">{s.fields} fields</td>
            <td className="px-4 py-3 text-sm text-zinc-400">{s.runs}</td>
            <td className="px-4 py-3"><StatusBadge status={s.visibility} /></td>
            <td className="px-4 py-3 text-right"><GhostBtn size="sm" onClick={(e) => e.stopPropagation()}>Edit</GhostBtn></td>
          </tr>
        ))}</tbody></table></div>}

      {tab === "gallery" && <div className="grid grid-cols-1 gap-3">{GALLERY_SCHEMAS.map((s) => (
        <div key={s.name} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 cursor-pointer transition-all">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-1"><p className="text-sm font-semibold text-zinc-200 font-mono">{s.name}</p><StatusBadge status="public" /><span className="text-xs text-zinc-500">v{s.version}</span></div>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{s.description}</p>
              <div className="flex gap-4 mt-2.5 text-xs text-zinc-500"><span>by {s.author}</span><span>{s.fields} fields</span><span>{s.runs} runs</span><span>★ {s.stars}</span></div>
            </div>
            <PrimaryBtn size="sm" onClick={(e) => e.stopPropagation()}>Use Schema</PrimaryBtn>
          </div>
        </div>
      ))}</div>}

      {/* Schema Builder Modal */}
      {builderOpen && <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBuilderOpen(false)} />
        <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-semibold text-zinc-100">Schema Builder</h2><p className="text-xs text-zinc-500 mt-0.5">Tier 2 — visual definition → produces schema_jsonb</p></div><button onClick={() => setBuilderOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">&times;</button></div>
          <div className="space-y-4 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Schema Name</label><input type="text" placeholder="e.g. argument-structure-v1" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500 font-mono" /></div>
              <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Visibility</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>Private</option><option>Public</option><option>Organization</option></select></div>
            </div>
            <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label><input type="text" placeholder="What does this schema annotate?" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500" /></div>
            <div>
              <div className="flex items-center justify-between mb-2"><label className="block text-xs font-medium text-zinc-400">Fields</label><GhostBtn size="sm">+ Add Field</GhostBtn></div>
              <div className="border border-zinc-700/50 rounded-lg p-3 mb-2 bg-zinc-800/30">
                <div className="grid grid-cols-3 gap-2 mb-2"><input type="text" defaultValue="clarity_score" className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-sky-500" /><select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>number (0-1)</option><option>text</option><option>boolean</option><option>enum</option></select><div className="flex justify-end"><button className="text-zinc-600 hover:text-red-400 text-xs">remove</button></div></div>
                <input type="text" defaultValue="Rate the clarity of this block from 0 (unclear) to 1 (crystal clear)" className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-sky-500" />
                <p className="text-[10px] text-zinc-600 mt-1">↑ Per-field instruction for annotation worker prompt</p>
              </div>
              <div className="border border-zinc-700/50 rounded-lg p-3 mb-2 bg-zinc-800/30">
                <div className="grid grid-cols-3 gap-2 mb-2"><input type="text" defaultValue="voice_type" className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-sky-500" /><select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>enum</option></select><div className="flex justify-end"><button className="text-zinc-600 hover:text-red-400 text-xs">remove</button></div></div>
                <div className="flex gap-1.5 flex-wrap mt-1">{["active", "passive", "mixed"].map((v) => <span key={v} className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-xs font-mono">{v}</span>)}</div>
              </div>
              <div className="border border-zinc-700/50 rounded-lg p-3 bg-zinc-800/30">
                <div className="grid grid-cols-3 gap-2 mb-2"><input type="text" defaultValue="issues_found" className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-sky-500" /><select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>array</option></select><div className="flex justify-end"><button className="text-zinc-600 hover:text-red-400 text-xs">remove</button></div></div>
                <input type="text" defaultValue="List specific writing issues found in this block" className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-sky-500" />
              </div>
            </div>
          </div>
          <div className="mb-5"><div className="flex items-center justify-between mb-2"><label className="text-xs font-medium text-zinc-400">Generated schema_jsonb</label><GhostBtn size="sm">Preview on Sample Block</GhostBtn></div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 font-mono overflow-x-auto leading-relaxed">{`{
  "schema_ref": "argument-structure-v1",
  "version": 1,
  "fields": {
    "clarity_score": {
      "type": "number", "min": 0, "max": 1,
      "instruction": "Rate the clarity..."
    },
    "voice_type": {
      "type": "enum",
      "values": ["active", "passive", "mixed"]
    },
    "issues_found": {
      "type": "array",
      "instruction": "List specific writing issues..."
    }
  }
}`}</pre></div>
          <div className="flex gap-2 justify-end"><GhostBtn onClick={() => setBuilderOpen(false)}>Cancel</GhostBtn><PrimaryBtn onClick={() => setBuilderOpen(false)}>Save Schema</PrimaryBtn></div>
        </div>
      </div>}
    </div>
  );
};

// --- Schema Detail ---
const SchemaDetailPage = ({ schema, onBack }) => (
  <div>
    <Breadcrumb items={[{ label: "Schemas", onClick: onBack }, { label: schema.name }]} />
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 mb-5">
      <div className="flex items-start justify-between">
        <div><div className="flex items-center gap-3 mb-1"><h1 className="text-lg font-bold text-zinc-100 font-mono">{schema.name}</h1><StatusBadge status={schema.visibility} /></div><div className="flex gap-4 mt-2 text-xs text-zinc-500"><span>v{schema.version}</span><span>{schema.fields} fields</span><span>{schema.runs} runs</span></div></div>
        <div className="flex gap-2"><GhostBtn>Edit</GhostBtn><PrimaryBtn>Use in Run</PrimaryBtn></div>
      </div>
    </div>
    <h2 className="text-sm font-semibold text-zinc-300 mb-3">Version History</h2>
    <div className="border border-zinc-800 rounded-xl overflow-hidden mb-5">
      {[{ ver: schema.version, date: schema.created, note: "Current release", current: true },
        ...(schema.name === "citation-integrity-v2" ? [{ ver: "2.0.0", date: "2026-01-12", note: "Added citation chain validation", current: false }, { ver: "1.0.0", date: "2025-12-20", note: "Basic citation format check", current: false }] : [])
      ].map((v, i) => (
        <div key={i} className={`flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 ${v.current ? "bg-zinc-800/20" : ""}`}>
          <div className="flex items-center gap-3"><span className="text-sm font-mono text-zinc-300">v{v.ver}</span>{v.current && <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-medium">current</span>}<span className="text-sm text-zinc-500">{v.note}</span></div>
          <span className="text-xs text-zinc-600">{v.date}</span>
        </div>
      ))}
    </div>
    <h2 className="text-sm font-semibold text-zinc-300 mb-3">schema_jsonb</h2>
    <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 font-mono overflow-x-auto leading-relaxed">{`{
  "schema_ref": "${schema.name}",
  "version": ${schema.version.split('.')[0]},
  "fields": {
    "clarity_score": { "type": "number", "min": 0, "max": 1 },
    "voice_type": { "type": "enum", "values": ["active", "passive", "mixed"] },
    "issues_found": { "type": "array" },
    "revised_text": { "type": "text" }
  }
}`}</pre>
  </div>
);

// --- Settings Page (Tier 3) ---
const SettingsPage = () => {
  const [tab, setTab] = useState("connectors");
  return (
    <div>
      <div className="mb-5"><h1 className="text-xl font-bold text-zinc-100">Settings</h1><p className="text-sm text-zinc-500 mt-0.5">Integration infrastructure &amp; operational config</p></div>
      <TabBar tabs={[{ id: "connectors", label: "Connectors" }, { id: "models", label: "Models" }, { id: "api-keys", label: "API Keys" }, { id: "events", label: "Events" }]} active={tab} onChange={setTab} />

      {tab === "connectors" && <div className="space-y-3">
        {[{ name: "JSONL Webhook", desc: "POST annotated JSONL on run completion", endpoint: "https://api.example.com/ingest", status: "active", branch: "JSONL file" },
          { name: "Neo4j KG Push", desc: "Push KG triples from annotation_jsonb to graph DB", endpoint: "bolt://neo4j.internal:7687", status: "active", branch: "Knowledge graph" },
          { name: "Pinecone Vectors", desc: "Embed content_original + annotation signals per block", endpoint: "https://pinecone.io/index/md-annotate", status: "inactive", branch: "Vector indexing" },
          { name: "Doc Reconstruction", desc: "Reassemble revised_text → Pandoc → .docx/.pdf", endpoint: "—", status: "inactive", branch: "Document reconstruction" },
        ].map((c) => (
          <div key={c.name} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div><div className="flex items-center gap-2.5 mb-1"><p className="text-sm font-semibold text-zinc-200">{c.name}</p><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-500 border-zinc-600"}`}>{c.status}</span></div>
                <p className="text-sm text-zinc-400">{c.desc}</p>
                <div className="flex gap-4 mt-2 text-xs text-zinc-500"><span>branch: {c.branch}</span><span className="font-mono">{c.endpoint}</span></div>
              </div>
              <GhostBtn size="sm">Configure</GhostBtn>
            </div>
          </div>
        ))}
      </div>}

      {tab === "models" && <div className="space-y-3">
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Default Model Configuration</h3>
          <p className="text-xs text-zinc-500 mb-3">Stored in annotation_runs.model_config JSONB · overridable per run</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Provider</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>Anthropic</option><option>OpenAI</option><option>Local Endpoint</option></select></div>
            <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 appearance-none"><option>claude-sonnet-4-20250514</option><option>claude-haiku-4-5-20251001</option></select></div>
            <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Temperature</label><input type="text" defaultValue="0.1" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 font-mono" /></div>
            <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Max Tokens</label><input type="text" defaultValue="2048" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500 font-mono" /></div>
          </div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-zinc-200">Local Endpoints</h3><GhostBtn size="sm">+ Add Endpoint</GhostBtn></div>
          <div className="border border-zinc-700/50 rounded-lg p-3 bg-zinc-800/30"><div className="flex items-center justify-between"><div><p className="text-sm text-zinc-300 font-mono">http://localhost:8080/v1/chat</p><p className="text-xs text-zinc-500 mt-0.5">llama-3.1-70b · last seen 2m ago</p></div><span className="w-2 h-2 rounded-full bg-emerald-500" /></div></div>
        </div>
      </div>}

      {tab === "api-keys" && <div>
        <div className="flex items-center justify-between mb-3"><p className="text-sm text-zinc-400">Programmatic access to existing Edge Functions</p><PrimaryBtn size="sm">+ Generate Key</PrimaryBtn></div>
        <div className="border border-zinc-800 rounded-xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider"><th className="text-left px-4 py-2.5 font-medium">Name</th><th className="text-left px-4 py-2.5 font-medium">Key</th><th className="text-left px-4 py-2.5 font-medium">Scopes</th><th className="text-left px-4 py-2.5 font-medium">Last Used</th></tr></thead>
        <tbody>{[{ name: "CI Pipeline", key: "mda_sk_...7f2a", scopes: "ingest, export", lastUsed: "2h ago" }, { name: "Analytics Dashboard", key: "mda_sk_...3b1c", scopes: "read-only", lastUsed: "1d ago" }].map((k) => (
          <tr key={k.key} className="border-b border-zinc-800/50"><td className="px-4 py-2.5 text-sm text-zinc-200">{k.name}</td><td className="px-4 py-2.5 text-xs text-zinc-500 font-mono">{k.key}</td><td className="px-4 py-2.5 text-xs text-zinc-400">{k.scopes}</td><td className="px-4 py-2.5 text-xs text-zinc-500">{k.lastUsed}</td></tr>
        ))}</tbody></table></div>
      </div>}

      {tab === "events" && <div className="space-y-3">
        {[{ event: "run.complete", desc: "Fires when annotation_runs.status → 'complete'", trigger: "pg_notify → Edge Function → webhook", enabled: true },
          { event: "run.failed_threshold", desc: "Alert when >10% blocks fail in a run", trigger: "Block completion check → threshold eval", enabled: true },
          { event: "document.ingested", desc: "Fires when documents.status → 'ingested'", trigger: "pg_notify on status change", enabled: false },
        ].map((ev) => (
          <div key={ev.event} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div><div className="flex items-center gap-2.5 mb-1"><p className="text-sm font-semibold text-zinc-200 font-mono">{ev.event}</p><span className={`w-2 h-2 rounded-full ${ev.enabled ? "bg-emerald-500" : "bg-zinc-600"}`} /></div><p className="text-sm text-zinc-400">{ev.desc}</p><p className="text-xs text-zinc-600 mt-1">{ev.trigger}</p></div>
              <GhostBtn size="sm">Configure</GhostBtn>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [activeTab, setActiveTab] = useState("documents");
  const [view, setView] = useState({ type: "list" });

  const navItems = [
    { id: "documents", label: "Documents", tier: 1 },
    { id: "runs", label: "Runs", tier: 1 },
    { id: "schemas", label: "Schemas", tier: 2 },
    { id: "settings", label: "Settings", tier: 3 },
  ];

  const navigate = (target, data) => {
    if (target === "doc-detail") setView({ type: "doc-detail", data });
    else if (target === "run-detail") setView({ type: "run-detail", data });
    else if (target === "schema-detail") setView({ type: "schema-detail", data });
    else setView({ type: "list" });
  };

  const getRoute = () => {
    if (view.type === "doc-detail") return `/documents/${view.data.source_uid}`;
    if (view.type === "run-detail") return `/runs/${view.data.run_id}`;
    if (view.type === "schema-detail") return `/schemas/${view.data.name}`;
    return `/${activeTab}`;
  };

  const renderPage = () => {
    if (view.type === "doc-detail" && activeTab === "documents") return <DocumentDetailPage doc={view.data} onBack={() => setView({ type: "list" })} />;
    if (view.type === "run-detail" && activeTab === "runs") return <RunDetailPage run={view.data} onBack={() => setView({ type: "list" })} />;
    if (view.type === "schema-detail" && activeTab === "schemas") return <SchemaDetailPage schema={view.data} onBack={() => setView({ type: "list" })} />;
    switch (activeTab) {
      case "documents": return <DocumentsPage onNavigate={navigate} />;
      case "runs": return <RunsPage onNavigate={navigate} />;
      case "schemas": return <SchemasPage onNavigate={navigate} />;
      case "settings": return <SettingsPage />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 flex items-center h-14">
          <div className="flex items-center gap-2 mr-8"><div className="w-6 h-6 bg-gradient-to-br from-sky-500 to-violet-500 rounded-md" /><span className="font-bold text-sm tracking-tight">MD-ANNOTATE</span></div>
          <div className="flex gap-1">{navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setView({ type: "list" }); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === item.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"}`}>
              {item.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${item.tier === 1 ? "bg-emerald-500/10 text-emerald-500" : item.tier === 2 ? "bg-violet-500/10 text-violet-400" : "bg-amber-500/10 text-amber-400"}`}>T{item.tier}</span>
            </button>
          ))}</div>
          <div className="ml-auto flex items-center gap-3"><span className="text-xs text-zinc-600 font-mono">supabase: connected</span><div className="w-2 h-2 rounded-full bg-emerald-500" /></div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-6">{renderPage()}</main>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 backdrop-blur border border-zinc-700 rounded-full px-4 py-1.5 text-xs text-zinc-400 font-mono">{getRoute()}</div>
    </div>
  );
}