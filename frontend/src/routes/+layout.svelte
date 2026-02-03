<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  let email: string | null = null;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    email = data.session?.user?.email ?? null;
    supabase.auth.onAuthStateChange((_event, session) => {
      email = session?.user?.email ?? null;
    });
  });
</script>

<div class="container">
  <div class="card" style="margin-bottom: 16px">
    <div class="row" style="justify-content: space-between">
      <div class="row">
        <a class="btn secondary" href="/">Writing System</a>
        <a class="btn secondary" href="/how-it-works">How it works</a>
        <a class="btn secondary" href="/pricing">Pricing</a>
        <a class="btn" href="/app">Dashboard</a>
      </div>
      <div class="row">
        {#if email}
          <span class="muted">Signed in as {email}</span>
          <a class="btn danger" href="/logout">Logout</a>
        {:else}
          <a class="btn" href="/login">Login</a>
        {/if}
      </div>
    </div>
  </div>

  <slot />
</div>

