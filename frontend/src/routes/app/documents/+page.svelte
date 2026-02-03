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

<div class="card">
  <div class="row" style="justify-content: space-between">
    <h1 style="margin: 0">Documents</h1>
    <button class="btn secondary" on:click={load} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
  </div>

  {#if error}
    <p style="color: var(--danger)">{error}</p>
  {/if}

  <table style="margin-top: 12px">
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
          <td><a href={`/app/documents/${r.source_uid}`}>{r.doc_title}</a></td>
          <td class="muted">{r.source_type}</td>
          <td class="muted">{r.status}</td>
          <td class="muted">{new Date(r.uploaded_at).toLocaleString()}</td>
        </tr>
      {/each}
      {#if !busy && rows.length === 0}
        <tr>
          <td colspan="4" class="muted">No documents yet.</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

