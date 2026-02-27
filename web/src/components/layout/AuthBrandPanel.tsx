import {
  IconUpload,
  IconBrain,
  IconServer,
  IconShieldCheck,
} from '@tabler/icons-react';

const HIGHLIGHTS = [
  { icon: IconUpload, text: 'Ingest documents, databases, and APIs' },
  { icon: IconBrain, text: 'AI extracts structured knowledge per block' },
  { icon: IconServer, text: 'Serve results via MCP to any AI tool' },
  { icon: IconShieldCheck, text: 'Human-in-the-loop review before export' },
];

export function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center bg-card border-r border-border/40 px-12 py-14">
      <div className="flex flex-col gap-6">
        <h1 className="max-w-sm text-3xl font-bold tracking-tight leading-tight">
          From Raw Data to{' '}
          <span className="text-primary">AI-Ready Knowledge</span>
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          The end-to-end platform to ingest, structure, and transform your data into Knowledge Graphs and Vectors — served instantly via MCP.
        </p>
        <div className="flex flex-col gap-3 mt-2">
          {HIGHLIGHTS.map((h) => (
            <div key={h.text} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <h.icon size={16} />
              </div>
              <span className="text-sm text-muted-foreground">{h.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
