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

<div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Blocks</h1>
      {#if doc}
        <div class="mt-1 text-sm text-black/65 dark:text-white/65">{doc.doc_title}</div>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button class="btn btn-sm preset-filled-surface-100-900 disabled:opacity-60" on:click={prev} disabled={busy || pageIndex === 0}>
        Prev
      </button>
      <button class="btn btn-sm preset-filled-surface-100-900 disabled:opacity-60" on:click={next} disabled={busy || blocks.length < pageSize}>
        Next
      </button>
      <button class="btn btn-sm preset-filled-surface-100-900 disabled:opacity-60" on:click={load} disabled={busy}>
        {busy ? 'Loading...' : 'Refresh'}
      </button>
    </div>
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
          <th>#</th>
          <th>Type</th>
          <th>Section</th>
          <th>Excerpt</th>
        </tr>
      </thead>
      <tbody>
        {#each blocks as b}
          <tr>
            <td class="text-black/60 dark:text-white/60">{b.block_index}</td>
            <td class="text-black/60 dark:text-white/60">{b.block_type}</td>
            <td class="text-black/60 dark:text-white/60">{(b.section_path ?? []).join(' / ')}</td>
            <td class="text-black/60 dark:text-white/60">
              <code class="font-mono text-xs">{(b.content_original ?? '').replace(/\s+/g, ' ').slice(0, 140)}</code>
            </td>
          </tr>
        {/each}
        {#if !busy && blocks.length === 0}
          <tr>
            <td colspan="4" class="text-black/60 dark:text-white/60">No blocks on this page.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
