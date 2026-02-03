<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { edgeJson } from '$lib/edge';

  type DocRow = { doc_uid: string; doc_title: string; uploaded_at: string };
  type SchemaRow = { schema_id: string; schema_ref: string; created_at: string };
  type RunRow = { run_id: string; doc_uid: string; schema_id: string; status: string; started_at: string; total_blocks: number };

  let docs: DocRow[] = [];
  let schemas: SchemaRow[] = [];
  let runs: RunRow[] = [];

  let selectedDocUid = '';
  let selectedSchemaId = '';

  let busy = false;
  let error: string | null = null;
  let lastCreate: unknown = null;

  async function load() {
    busy = true;
    error = null;
    try {
      const [docsRes, schemasRes, runsRes] = await Promise.all([
        supabase
          .from('documents')
          .select('doc_uid, doc_title, uploaded_at')
          .eq('status', 'ingested')
          .not('doc_uid', 'is', null)
          .order('uploaded_at', { ascending: false })
          .limit(50),
        supabase.from('schemas').select('schema_id, schema_ref, created_at').order('created_at', { ascending: false }).limit(50),
        supabase
          .from('annotation_runs')
          .select('run_id, doc_uid, schema_id, status, started_at, total_blocks')
          .order('started_at', { ascending: false })
          .limit(50)
      ]);

      if (docsRes.error) throw docsRes.error;
      if (schemasRes.error) throw schemasRes.error;
      if (runsRes.error) throw runsRes.error;

      docs = (docsRes.data ?? []) as DocRow[];
      schemas = (schemasRes.data ?? []) as SchemaRow[];
      runs = (runsRes.data ?? []) as RunRow[];

      selectedDocUid = selectedDocUid || (docs[0]?.doc_uid ?? '');
      selectedSchemaId = selectedSchemaId || (schemas[0]?.schema_id ?? '');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function createRun() {
    error = null;
    lastCreate = null;
    if (!selectedDocUid) {
      error = 'Select a doc_uid.';
      return;
    }
    if (!selectedSchemaId) {
      error = 'Select a schema.';
      return;
    }
    busy = true;
    try {
      lastCreate = await edgeJson('runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_uid: selectedDocUid, schema_id: selectedSchemaId })
      });
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  onMount(load);
</script>

<div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Runs</h1>
      <div class="mt-1 text-sm text-black/65 dark:text-white/65">Create a run and export JSONL by <code>run_id</code>.</div>
    </div>
    <button class="btn btn-sm preset-filled-surface-100-900 disabled:opacity-60" disabled={busy} on:click={load}>Refresh</button>
  </div>

  <div class="mt-6 grid gap-3 md:grid-cols-3">
    <select class="select" bind:value={selectedDocUid}>
      {#each docs as d}
        <option value={d.doc_uid}>{d.doc_title} ({d.doc_uid.slice(0, 8)}...)</option>
      {/each}
    </select>

    <select class="select" bind:value={selectedSchemaId}>
      {#each schemas as s}
        <option value={s.schema_id}>{s.schema_ref}</option>
      {/each}
    </select>

    <button class="btn preset-filled-primary-500 disabled:opacity-60" disabled={busy} on:click={createRun}>
      {busy ? 'Working...' : 'Create run'}
    </button>
  </div>

  {#if error}
    <div class="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
      {error}
    </div>
  {/if}
  {#if lastCreate}
    <pre class="mt-4 overflow-auto rounded-xl bg-black/5 p-4 text-xs ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
      ><code>{JSON.stringify(lastCreate, null, 2)}</code></pre
    >
  {/if}

  <div class="table-wrap mt-6">
    <table class="table">
      <thead>
        <tr>
          <th>run_id</th>
          <th>status</th>
          <th>total_blocks</th>
          <th>started</th>
        </tr>
      </thead>
      <tbody>
        {#each runs as r}
          <tr>
            <td class="font-mono text-xs">
              <a class="underline decoration-black/20 underline-offset-4 hover:decoration-black/60 dark:decoration-white/20 dark:hover:decoration-white/60" href={`/app/runs/${r.run_id}`}
                >{r.run_id}</a
              >
            </td>
            <td class="text-black/60 dark:text-white/60">{r.status}</td>
            <td class="text-black/60 dark:text-white/60">{r.total_blocks}</td>
            <td class="text-black/60 dark:text-white/60">{new Date(r.started_at).toLocaleString()}</td>
          </tr>
        {/each}
        {#if !busy && runs.length === 0}
          <tr>
            <td colspan="4" class="text-black/60 dark:text-white/60">No runs yet.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
