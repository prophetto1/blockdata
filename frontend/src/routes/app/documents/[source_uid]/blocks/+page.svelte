<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';

  type DocumentRow = { doc_uid: string; doc_title: string; status: string };
  type BlockRow = {
    block_uid: string;
    block_index: number;
    block_type: string;
    section_path: string[];
    char_span: number[];
    content_original: string;
  };

  const pageSize = 50;
  let pageIndex = 0;
  let doc: DocumentRow | null = null;
  let blocks: BlockRow[] = [];
  let busy = true;
  let error: string | null = null;

  async function load() {
    busy = true;
    error = null;
    blocks = [];
    doc = null;

    try {
      const source_uid = $page.params.source_uid;
      const { data: d, error: derr } = await supabase
        .from('documents')
        .select('doc_uid, doc_title, status')
        .eq('source_uid', source_uid)
        .maybeSingle();
      if (derr) throw derr;
      if (!d) throw new Error('Document not found');
      if (d.status !== 'ingested' || !d.doc_uid) throw new Error('Document not ingested yet');
      doc = d as DocumentRow;

      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      const { data: b, error: berr } = await supabase
        .from('blocks')
        .select('block_uid, block_index, block_type, section_path, char_span, content_original')
        .eq('doc_uid', doc.doc_uid)
        .order('block_index', { ascending: true })
        .range(from, to);
      if (berr) throw berr;
      blocks = (b ?? []) as BlockRow[];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  function next() {
    pageIndex += 1;
    void load();
  }

  function prev() {
    pageIndex = Math.max(0, pageIndex - 1);
    void load();
  }

  onMount(load);
</script>

<div class="card">
  <div class="row" style="justify-content: space-between">
    <div>
      <h1 style="margin: 0">Blocks</h1>
      {#if doc}
        <div class="muted">{doc.doc_title}</div>
      {/if}
    </div>
    <div class="row">
      <button class="btn secondary" on:click={prev} disabled={busy || pageIndex === 0}>Prev</button>
      <button class="btn secondary" on:click={next} disabled={busy || blocks.length < pageSize}>Next</button>
      <button class="btn secondary" on:click={load} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
    </div>
  </div>

  {#if error}
    <p style="color: var(--danger)">{error}</p>
  {/if}

  <table style="margin-top: 12px">
    <thead>
      <tr>
        <th>#</th>
        <th>Type</th>
        <th>Section</th>
        <th>Excerpt</th>
      </tr>
    </thead>
    <tbody>
      {#each blocks as b}
        <tr>
          <td class="muted">{b.block_index}</td>
          <td class="muted">{b.block_type}</td>
          <td class="muted">{(b.section_path ?? []).join(' / ')}</td>
          <td class="muted">
            <code>{(b.content_original ?? '').replace(/\s+/g, ' ').slice(0, 120)}</code>
          </td>
        </tr>
      {/each}
      {#if !busy && blocks.length === 0}
        <tr>
          <td colspan="4" class="muted">No blocks on this page.</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

