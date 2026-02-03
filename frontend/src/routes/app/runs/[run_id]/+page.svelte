<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { downloadFromEdge } from '$lib/edge';

  type RunRow = {
    run_id: string;
    doc_uid: string;
    schema_id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    total_blocks: number;
    completed_blocks: number;
    failed_blocks: number;
  };

  let row: RunRow | null = null;
  let busy = true;
  let error: string | null = null;

  async function load() {
    busy = true;
    error = null;
    row = null;
    try {
      const run_id = $page.params.run_id;
      const { data, error: err } = await supabase
        .from('annotation_runs')
        .select(
          'run_id, doc_uid, schema_id, status, started_at, completed_at, total_blocks, completed_blocks, failed_blocks'
        )
        .eq('run_id', run_id)
        .maybeSingle();
      if (err) throw err;
      if (!data) throw new Error('Run not found');
      row = data as RunRow;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function exportJsonl() {
    const run_id = $page.params.run_id;
    await downloadFromEdge(`export-jsonl?run_id=${encodeURIComponent(run_id)}`, `export-${run_id}.jsonl`);
  }

  onMount(load);
</script>

<div class="card">
  <div class="row" style="justify-content: space-between">
    <h1 style="margin: 0">Run</h1>
    <button class="btn secondary" disabled={busy} on:click={load}>{busy ? 'Loading…' : 'Refresh'}</button>
  </div>

  {#if error}
    <p style="color: var(--danger)">{error}</p>
  {/if}

  {#if row}
    <p class="muted" style="margin-bottom: 0"><b>run_id:</b> <code>{row.run_id}</code></p>
    <p class="muted" style="margin-bottom: 0"><b>status:</b> {row.status}</p>
    <p class="muted" style="margin-bottom: 0"><b>total:</b> {row.total_blocks}</p>
    <p class="muted" style="margin-bottom: 0"><b>completed:</b> {row.completed_blocks}</p>
    <p class="muted" style="margin-bottom: 0"><b>failed:</b> {row.failed_blocks}</p>

    <div class="row" style="margin-top: 12px">
      <button class="btn" on:click={exportJsonl}>Export JSONL (run)</button>
    </div>
  {/if}
</div>

