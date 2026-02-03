<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  type DocumentRow = {
    source_uid: string;
    doc_uid: string | null;
    source_type: string;
    doc_title: string;
    status: string;
    error: string | null;
    uploaded_at: string;
  };

  let rows: DocumentRow[] = [];
  let error: string | null = null;
  let busy = true;

  async function load() {
    busy = true;
    error = null;
    try {
      const { data, error: err } = await supabase
        .from('documents')
        .select('source_uid, doc_uid, source_type, doc_title, status, error, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(50);
      if (err) throw err;
      rows = (data ?? []) as DocumentRow[];
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
      <h1 class="text-2xl font-bold tracking-tight">Documents</h1>
      <p class="mt-1 text-sm text-black/65 dark:text-white/65">Last 50 uploads.</p>
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

  <div class="table-wrap mt-6">
    <table class="table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>Status</th>
          <th>Uploaded</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r}
          <tr>
            <td>
              <a class="underline decoration-black/20 underline-offset-4 hover:decoration-black/60 dark:decoration-white/20 dark:hover:decoration-white/60" href={`/app/documents/${r.source_uid}`}
                >{r.doc_title}</a
              >
            </td>
            <td class="text-black/60 dark:text-white/60">{r.source_type}</td>
            <td class="text-black/60 dark:text-white/60">{r.status}</td>
            <td class="text-black/60 dark:text-white/60">{new Date(r.uploaded_at).toLocaleString()}</td>
          </tr>
        {/each}
        {#if !busy && rows.length === 0}
          <tr>
            <td colspan="4" class="text-black/60 dark:text-white/60">No documents yet.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
