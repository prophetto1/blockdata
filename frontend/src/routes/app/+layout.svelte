<script lang="ts">
  export let data: { user: { email?: string | null } };
</script>

<div class="card" style="margin-bottom: 16px">
  <div class="row" style="justify-content: space-between">
    <div class="row">
      <a class="btn secondary" href="/app">Overview</a>
      <a class="btn secondary" href="/app/upload">Upload</a>
      <a class="btn secondary" href="/app/documents">Documents</a>
      <a class="btn secondary" href="/app/schemas">Schemas</a>
      <a class="btn secondary" href="/app/runs">Runs</a>
    </div>
    <div class="muted">{data.user?.email ?? ''}</div>
  </div>
</div>

<slot />

