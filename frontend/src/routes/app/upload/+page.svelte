<script lang="ts">
  import { goto } from '$app/navigation';
  import { edgeJson } from '$lib/edge';

  let immutable_schema_ref = 'md_prose_v1';
  let doc_title = 'Untitled';
  let file: File | null = null;

  let busy = false;
  let error: string | null = null;
  let result: unknown = null;

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
    if (file && (!doc_title || doc_title === 'Untitled')) {
      doc_title = file.name.replace(/\.[^.]+$/, '');
    }
  }

  async function submit() {
    error = null;
    result = null;
    if (!file) {
      error = 'Choose a file first.';
      return;
    }
    busy = true;
    try {
      const form = new FormData();
      form.set('immutable_schema_ref', immutable_schema_ref);
      form.set('doc_title', doc_title);
      form.set('file', file);

      const resp = await edgeJson<any>('ingest', { method: 'POST', body: form });
      result = resp;
      if (resp?.source_uid) {
        await goto(`/app/documents/${resp.source_uid}`);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

<div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Upload</h1>
      <p class="mt-1 text-sm text-black/65 dark:text-white/65">Calls <code>POST /functions/v1/ingest</code>.</p>
    </div>
  </div>

  <div class="mt-6 grid gap-4 md:grid-cols-2">
    <div>
      <label class="text-sm font-medium text-black/70 dark:text-white/70" for="immutable_schema_ref">immutable_schema_ref</label>
      <input id="immutable_schema_ref" class="input mt-2 w-full" bind:value={immutable_schema_ref} />
    </div>
    <div>
      <label class="text-sm font-medium text-black/70 dark:text-white/70" for="doc_title">doc_title</label>
      <input id="doc_title" class="input mt-2 w-full" bind:value={doc_title} />
    </div>
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <input class="input w-full md:w-auto" type="file" on:change={onFileChange} />
    <button class="btn preset-filled-primary-500 disabled:opacity-60" disabled={busy} on:click={submit}>
      {busy ? 'Uploading...' : 'Upload'}
    </button>
  </div>

  {#if error}
    <div class="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
      {error}
    </div>
  {/if}

  {#if result}
    <pre class="mt-4 overflow-auto rounded-xl bg-black/5 p-4 text-xs ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
      ><code>{JSON.stringify(result, null, 2)}</code></pre
    >
  {/if}
</div>
