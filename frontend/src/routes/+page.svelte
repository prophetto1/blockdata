<section class="grid items-start gap-8 lg:grid-cols-2">
  <div>
    <p class="text-sm font-medium text-black/60 dark:text-white/60">MD Annotate</p>
    <h1 class="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Upload documents. Freeze the text. Export JSONL.</h1>
    <p class="mt-4 text-lg leading-relaxed text-black/65 dark:text-white/65">
      A dashboard-first pipeline for turning messy inputs (PDF/DOCX/TXT/MD) into deterministic blocks you can annotate, enrich, and
      ship downstream.
    </p>

    <div class="mt-7 flex flex-wrap items-center gap-3">
      <a class="btn preset-filled-primary-500" href="/app/upload">Upload a document</a>
      <a class="btn preset-filled-surface-100-900" href="/how-it-works">How it works</a>
      <a class="btn preset-filled-surface-100-900" href="/pricing">Pricing</a>
    </div>
  </div>

  <div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
    <div class="text-sm font-medium text-black/70 dark:text-white/70">Pipeline</div>
    <ol class="mt-4 space-y-3 text-sm text-black/65 dark:text-white/65">
      <li><span class="font-semibold">1)</span> Upload any supported format</li>
      <li><span class="font-semibold">2)</span> Convert to canonical Markdown (if needed)</li>
      <li><span class="font-semibold">3)</span> Parse blocks with stable offsets + IDs</li>
      <li><span class="font-semibold">4)</span> Annotate blocks with schemas</li>
      <li><span class="font-semibold">5)</span> Export JSONL for LLM/RAG/KG workflows</li>
    </ol>

    <div class="mt-6 flex items-center gap-2">
      <a class="btn btn-sm preset-filled-primary-500" href="/app">Open dashboard</a>
      <a class="btn btn-sm preset-filled-surface-100-900" href="/login">Sign in</a>
    </div>
  </div>
</section>

<section class="mt-10 grid gap-4 sm:grid-cols-3">
  <div class="card preset-tonal-surface p-5 ring-1 ring-black/10 dark:ring-white/10">
    <div class="text-sm font-semibold">Immutable base</div>
    <p class="mt-2 text-sm text-black/65 dark:text-white/65">Ingest once. Never mutate the source text. Everything else layers on.</p>
  </div>
  <div class="card preset-tonal-surface p-5 ring-1 ring-black/10 dark:ring-white/10">
    <div class="text-sm font-semibold">Schema-driven</div>
    <p class="mt-2 text-sm text-black/65 dark:text-white/65">Swap annotation schemas without re-ingesting or re-chunking.</p>
  </div>
  <div class="card preset-tonal-surface p-5 ring-1 ring-black/10 dark:ring-white/10">
    <div class="text-sm font-semibold">Exportable</div>
    <p class="mt-2 text-sm text-black/65 dark:text-white/65">JSONL export makes downstream pipelines simple and debuggable.</p>
  </div>
</section>
