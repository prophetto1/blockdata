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

<div class="card">
  <h1 style="margin-top: 0">Upload</h1>
  <p class="muted">Calls `POST /functions/v1/ingest`.</p>

  <div class="row" style="margin-top: 12px">
    <label class="muted">immutable_schema_ref</label>
    <input class="input" bind:value={immutable_schema_ref} />
    <label class="muted">doc_title</label>
    <input class="input" bind:value={doc_title} />
  </div>

  <div class="row" style="margin-top: 12px">
    <input class="input" type="file" on:change={onFileChange} />
    <button class="btn" disabled={busy} on:click={submit}>{busy ? 'Uploading…' : 'Upload'}</button>
  </div>

  {#if error}
    <p style="color: var(--danger)">{error}</p>
  {/if}

  {#if result}
    <pre>{JSON.stringify(result, null, 2)}</pre>
  {/if}
</div>

