<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { edgeJson } from '$lib/edge';

  type SchemaRow = { schema_id: string; schema_ref: string; schema_uid: string; created_at: string };

  let rows: SchemaRow[] = [];
  let file: File | null = null;
  let schema_ref = '';
  let busy = false;
  let error: string | null = null;
  let lastUpload: unknown = null;

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
  }

  async function load() {
    error = null;
    busy = true;
    try {
      const { data, error: err } = await supabase
        .from('schemas')
        .select('schema_id, schema_ref, schema_uid, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) throw err;
      rows = (data ?? []) as SchemaRow[];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function upload() {
    error = null;
    lastUpload = null;
    if (!file) {
      error = 'Choose a schema JSON file first.';
      return;
    }
    busy = true;
    try {
      const form = new FormData();
      if (schema_ref.trim()) form.set('schema_ref', schema_ref.trim());
      form.set('schema', file);
      lastUpload = await edgeJson('schemas', { method: 'POST', body: form });
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
  <h1 style="margin-top: 0">Schemas</h1>
  <p class="muted">Phase 2 scaffolding: upload and list annotation schemas.</p>

  <div class="row" style="margin-top: 12px">
    <input class="input" placeholder="schema_ref (optional)" bind:value={schema_ref} />
    <input class="input" type="file" accept="application/json,.json" on:change={onFileChange} />
    <button class="btn" disabled={busy} on:click={upload}>{busy ? 'Uploading…' : 'Upload schema'}</button>
    <button class="btn secondary" disabled={busy} on:click={load}>Refresh</button>
  </div>

  {#if error}
    <p style="color: var(--danger)">{error}</p>
  {/if}
  {#if lastUpload}
    <pre>{JSON.stringify(lastUpload, null, 2)}</pre>
  {/if}

  <table style="margin-top: 12px">
    <thead>
      <tr>
        <th>schema_ref</th>
        <th>schema_uid</th>
        <th>created</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as r}
        <tr>
          <td class="muted"><code>{r.schema_ref}</code></td>
          <td class="muted"><code>{r.schema_uid}</code></td>
          <td class="muted">{new Date(r.created_at).toLocaleString()}</td>
        </tr>
      {/each}
      {#if !busy && rows.length === 0}
        <tr>
          <td colspan="3" class="muted">No schemas yet.</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

