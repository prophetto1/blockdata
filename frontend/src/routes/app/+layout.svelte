<script lang="ts">
  export let data: { user: { email?: string | null } };
</script>

<div class="mb-8 flex flex-wrap items-center justify-between gap-3">
  <div class="flex flex-wrap items-center gap-2">
    <a class="btn btn-sm preset-filled-surface-100-900" href="/app">Overview</a>
    <a class="btn btn-sm preset-filled-surface-100-900" href="/app/workspace">Workspace</a>
    <a class="btn btn-sm preset-filled-primary-500" href="/app/upload">Upload</a>
    <a class="btn btn-sm preset-filled-surface-100-900" href="/app/documents">Documents</a>
    <a class="btn btn-sm preset-filled-surface-100-900" href="/app/schemas">Schemas</a>
    <a class="btn btn-sm preset-filled-surface-100-900" href="/app/runs">Runs</a>
  </div>
  <div class="text-sm text-black/60 dark:text-white/60">{data.user?.email ?? ''}</div>
</div>

<slot />
