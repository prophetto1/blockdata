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

<div class="mx-auto max-w-md">
  <div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
    <h1 class="text-2xl font-bold tracking-tight">Sign in</h1>
    <p class="mt-2 text-sm text-black/65 dark:text-white/65">Use a Supabase Auth email/password user.</p>

    <div class="mt-6 space-y-4">
      <div>
        <label class="text-sm font-medium text-black/70 dark:text-white/70" for="email">Email</label>
        <input id="email" class="input mt-2 w-full" placeholder="you@company.com" bind:value={email} />
      </div>
      <div>
        <label class="text-sm font-medium text-black/70 dark:text-white/70" for="password">Password</label>
        <input id="password" class="input mt-2 w-full" placeholder="••••••••" type="password" bind:value={password} />
      </div>

      <div class="flex items-center gap-3">
        <button class="btn preset-filled-primary-500 disabled:opacity-60" disabled={busy} on:click={submit}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <a class="btn preset-filled-surface-100-900" href="/how-it-works">How it works</a>
      </div>

      {#if error}
        <div class="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
          {error}
        </div>
      {/if}
    </div>
  </div>
</div>
