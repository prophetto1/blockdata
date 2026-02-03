<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  let email = '';
  let password = '';
  let error: string | null = null;
  let busy = false;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await goto('/app');
  });

  async function submit() {
    error = null;
    busy = true;
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      await goto('/app');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

<div class="card" style="max-width: 520px; margin: 0 auto">
  <h1 style="margin-top: 0">Login</h1>
  <p class="muted">Sign in with your Supabase Auth user.</p>

  <div class="row" style="margin-top: 12px">
    <input class="input" placeholder="Email" bind:value={email} />
    <input class="input" placeholder="Password" type="password" bind:value={password} />
    <button class="btn" disabled={busy} on:click={submit}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </div>

  {#if error}
    <p style="color: var(--danger); margin-bottom: 0">{error}</p>
  {/if}
</div>

