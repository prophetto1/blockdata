<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { downloadFromEdge } from '$lib/edge';

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

  let row: DocumentRow | null = null;
  let busy = true;
  let error: string | null = null;

  async function load() {
    busy = true;
    error = null;
    row = null;
    try {
      const source_uid = $page.params.source_uid;
      const { data, error: err } = await supabase
        .from('documents')
        .select(
          'source_uid, doc_uid, md_uid, source_type, source_locator, md_locator, doc_title, uploaded_at, immutable_schema_ref, status, error'
        )
        .eq('source_uid', source_uid)
        .maybeSingle();
      if (err) throw err;
      if (!data) throw new Error('Document not found');
      row = data as DocumentRow;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function exportJsonl() {
    if (!row?.doc_uid) return;
    await downloadFromEdge(`export-jsonl?doc_uid=${encodeURIComponent(row.doc_uid)}`, `export-${row.doc_uid}.jsonl`);
  }

  onMount(load);
</script>

<div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Document</h1>
      {#if row}
        <p class="mt-1 text-sm text-black/65 dark:text-white/65">{row.doc_title}</p>
      {/if}
    </div>
    <button class="btn btn-sm preset-filled-surface-100-900 disabled:opacity-60" on:click={load} disabled={busy}>
      {busy ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  {#if error}
    <div class="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
      {error}
    </div>
  {/if}

  {#if row}
    {#if row.error}
      <div class="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
        <span class="font-semibold">Error:</span> {row.error}
      </div>
    {/if}

    <div class="mt-6 grid gap-4 md:grid-cols-2">
      <div class="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div class="text-xs font-medium text-black/60 dark:text-white/60">Status</div>
        <div class="mt-1 text-sm font-semibold">{row.status}</div>
      </div>
      <div class="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div class="text-xs font-medium text-black/60 dark:text-white/60">Uploaded</div>
        <div class="mt-1 text-sm font-semibold">{new Date(row.uploaded_at).toLocaleString()}</div>
      </div>
      <div class="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div class="text-xs font-medium text-black/60 dark:text-white/60">source_uid</div>
        <div class="mt-1 break-all font-mono text-xs">{row.source_uid}</div>
      </div>
      <div class="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div class="text-xs font-medium text-black/60 dark:text-white/60">doc_uid</div>
        <div class="mt-1 break-all font-mono text-xs">{row.doc_uid ?? '—'}</div>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      {#if row.doc_uid && row.status === 'ingested'}
        <a class="btn btn-sm preset-filled-surface-100-900" href={`/app/documents/${row.source_uid}/blocks`}>View blocks</a>
        <button class="btn btn-sm preset-filled-primary-500" on:click={exportJsonl}>Export JSONL</button>
      {:else}
        <span class="text-sm text-black/60 dark:text-white/60">Waiting for ingest to complete...</span>
      {/if}
    </div>
  {/if}
</div>
