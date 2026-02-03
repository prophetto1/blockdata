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

<div class="card">
  <div class="row" style="justify-content: space-between">
    <h1 style="margin: 0">Document</h1>
    <button class="btn secondary" on:click={load} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
  </div>

  {#if error}
    <p style="color: var(--danger)">{error}</p>
  {/if}

  {#if row}
    <p class="muted" style="margin-bottom: 0"><b>Title:</b> {row.doc_title}</p>
    <p class="muted" style="margin-bottom: 0"><b>Status:</b> {row.status}</p>
    {#if row.error}
      <p style="color: var(--danger); margin-bottom: 0"><b>Error:</b> {row.error}</p>
    {/if}
    <p class="muted" style="margin-bottom: 0"><b>source_uid:</b> <code>{row.source_uid}</code></p>
    <p class="muted" style="margin-bottom: 0"><b>doc_uid:</b> <code>{row.doc_uid ?? '—'}</code></p>
    <p class="muted" style="margin-bottom: 0"><b>md_uid:</b> <code>{row.md_uid ?? '—'}</code></p>

    <div class="row" style="margin-top: 12px">
      {#if row.doc_uid && row.status === 'ingested'}
        <a class="btn secondary" href={`/app/documents/${row.source_uid}/blocks`}>View blocks</a>
        <button class="btn" on:click={exportJsonl}>Export JSONL</button>
      {:else}
        <span class="muted">Waiting for ingest to complete…</span>
      {/if}
    </div>
  {/if}
</div>

