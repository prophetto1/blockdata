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

<div class="card">
  <div class="row" style="justify-content: space-between">
    <div>
      <h1 style="margin: 0">Runs</h1>
      <div class="muted">Phase 2 scaffolding: create a run and export JSONL by run_id.</div>
    </div>
    <button class="btn secondary" disabled={busy} on:click={load}>Refresh</button>
  </div>

  <div class="row" style="margin-top: 12px">
    <select bind:value={selectedDocUid}>
      {#each docs as d}
        <option value={d.doc_uid}>{d.doc_title} ({d.doc_uid.slice(0, 8)}…)</option>
      {/each}
    </select>

    <select bind:value={selectedSchemaId}>
      {#each schemas as s}
        <option value={s.schema_id}>{s.schema_ref}</option>
      {/each}
    </select>

    <button class="btn" disabled={busy} on:click={createRun}>{busy ? 'Working…' : 'Create run'}</button>
  </div>

  {#if error}
    <p style="color: var(--danger)">{error}</p>
  {/if}
  {#if lastCreate}
    <pre>{JSON.stringify(lastCreate, null, 2)}</pre>
  {/if}

  <table style="margin-top: 12px">
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
          <td class="muted"><a href={`/app/runs/${r.run_id}`}><code>{r.run_id}</code></a></td>
          <td class="muted">{r.status}</td>
          <td class="muted">{r.total_blocks}</td>
          <td class="muted">{new Date(r.started_at).toLocaleString()}</td>
        </tr>
      {/each}
      {#if !busy && runs.length === 0}
        <tr>
          <td colspan="4" class="muted">No runs yet.</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

