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
      if (!run_id) throw new Error('Missing run_id');

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
    if (!run_id) {
      error = 'Missing run_id';
      return;
    }
    await downloadFromEdge(`export-jsonl?run_id=${encodeURIComponent(run_id)}`, `export-${run_id}.jsonl`);
  }

  onMount(load);
</script>

<div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Run</h1>
      {#if row}
        <div class="mt-1 text-sm text-black/65 dark:text-white/65">
          <span class="font-mono text-xs">{row.run_id}</span>
        </div>
      {/if}
    </div>
    <button class="btn btn-sm preset-filled-surface-100-900 disabled:opacity-60" disabled={busy} on:click={load}>
      {busy ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  {#if error}
    <div class="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
      {error}
    </div>
  {/if}

  {#if row}
    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <div class="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div class="text-xs font-medium text-black/60 dark:text-white/60">status</div>
        <div class="mt-1 text-sm font-semibold">{row.status}</div>
      </div>
      <div class="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div class="text-xs font-medium text-black/60 dark:text-white/60">total</div>
        <div class="mt-1 text-sm font-semibold">{row.total_blocks}</div>
      </div>
      <div class="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div class="text-xs font-medium text-black/60 dark:text-white/60">completed</div>
        <div class="mt-1 text-sm font-semibold">{row.completed_blocks} <span class="text-black/50 dark:text-white/50">(+{row.failed_blocks} failed)</span></div>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <button class="btn btn-sm preset-filled-primary-500" on:click={exportJsonl}>Export JSONL</button>
    </div>
  {/if}
</div>
