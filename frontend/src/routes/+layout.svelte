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

<div class="min-h-screen">
  <header class="sticky top-0 z-20 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/30">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
      <a href="/" class="text-base font-semibold tracking-tight sm:text-lg">Writing System</a>

      <nav class="hidden items-center gap-2 sm:flex">
        <a class="btn btn-sm preset-filled-surface-100-900" href="/how-it-works">How it works</a>
        <a class="btn btn-sm preset-filled-surface-100-900" href="/pricing">Pricing</a>
        <a class="btn btn-sm preset-filled-primary-500" href="/app">Dashboard</a>
      </nav>

      <div class="flex items-center gap-2">
        {#if email}
          <span class="hidden text-sm text-black/60 dark:text-white/60 sm:inline">Signed in as {email}</span>
          <a class="btn btn-sm preset-filled-error-500" href="/logout">Logout</a>
        {:else}
          <a class="btn btn-sm preset-filled-primary-500" href="/login">Login</a>
        {/if}
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-6xl px-4 py-10">
    <slot />
  </main>

  <footer class="border-t border-black/5 py-10 text-sm text-black/50 dark:border-white/10 dark:text-white/50">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
      <div>MD Annotate</div>
      <div class="flex items-center gap-3">
        <a
          class="underline decoration-black/20 underline-offset-4 hover:decoration-black/60 dark:decoration-white/20 dark:hover:decoration-white/60"
          href="/how-it-works"
          >How it works</a
        >
        <a
          class="underline decoration-black/20 underline-offset-4 hover:decoration-black/60 dark:decoration-white/20 dark:hover:decoration-white/60"
          href="/pricing"
          >Pricing</a
        >
      </div>
    </div>
  </footer>
</div>
