import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function PipelineNewRunForm({
  onSave,
}: {
  onSave: (label: string, files: File[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState('');
  const [dragOver, setDragOver] = useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const mdFiles = Array.from(incoming).filter(
      (f) => f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.type === 'text/markdown',
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}|${f.size}`));
      const deduped = mdFiles.filter((f) => !existing.has(`${f.name}|${f.size}`));
      return [...prev, ...deduped];
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleStart() {
    if (files.length === 0) return;
    const runLabel = label.trim() || `Run ${new Date().toLocaleString()}`;
    onSave(runLabel, files);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">New Run</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Drop markdown files and start processing.
        </p>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        {/* Label */}
        <div className="space-y-1.5">
          <label htmlFor="run-label" className="text-xs font-medium text-muted-foreground">
            Label
          </label>
          <input
            id="run-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional — auto-generated if empty"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Drop zone */}
        <label
          htmlFor="new-run-file-input"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
            dragOver
              ? 'border-primary/50 bg-primary/5'
              : 'border-border bg-background/40 hover:bg-background/60'
          }`}
        >
          <span className="text-xs font-medium text-foreground">
            Drop .md files or click to browse
          </span>
          <input
            id="new-run-file-input"
            type="file"
            multiple
            accept=".md,.markdown,text/markdown"
            onChange={(e) => { addFiles(e.currentTarget.files); e.currentTarget.value = ''; }}
            className="sr-only"
          />
        </label>

        {/* File list */}
        {files.length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              {files.length} file{files.length === 1 ? '' : 's'}
            </div>
            <ul className="space-y-1">
              {files.map((file, i) => (
                <li
                  key={`${file.name}-${file.size}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                >
                  <span className="min-w-0 truncate text-xs text-foreground">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <Button
          type="button"
          className="w-full"
          disabled={files.length === 0}
          onClick={handleStart}
        >
          Save
        </Button>
      </div>
    </div>
  );
}