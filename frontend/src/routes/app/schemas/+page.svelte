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

<div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Schemas</h1>
      <p class="mt-1 text-sm text-black/65 dark:text-white/65">Upload and list annotation schemas.</p>
    </div>
    <button class="btn btn-sm preset-filled-surface-100-900 disabled:opacity-60" disabled={busy} on:click={load}>
      Refresh
    </button>
  </div>

  <div class="mt-6 grid gap-3 md:grid-cols-3">
    <input class="input md:col-span-1" placeholder="schema_ref (optional)" bind:value={schema_ref} />
    <input class="input md:col-span-1" type="file" accept="application/json,.json" on:change={onFileChange} />
    <button class="btn preset-filled-primary-500 disabled:opacity-60 md:col-span-1" disabled={busy} on:click={upload}>
      {busy ? 'Uploading...' : 'Upload schema'}
    </button>
  </div>

  {#if error}
    <div class="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
      {error}
    </div>
  {/if}
  {#if lastUpload}
    <pre class="mt-4 overflow-auto rounded-xl bg-black/5 p-4 text-xs ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
      ><code>{JSON.stringify(lastUpload, null, 2)}</code></pre
    >
  {/if}

  <div class="table-wrap mt-6">
    <table class="table">
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
            <td class="font-mono text-xs text-black/70 dark:text-white/70">{r.schema_ref}</td>
            <td class="font-mono text-xs text-black/70 dark:text-white/70">{r.schema_uid}</td>
            <td class="text-black/60 dark:text-white/60">{new Date(r.created_at).toLocaleString()}</td>
          </tr>
        {/each}
        {#if !busy && rows.length === 0}
          <tr>
            <td colspan="3" class="text-black/60 dark:text-white/60">No schemas yet.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
