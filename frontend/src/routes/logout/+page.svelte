<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  onMount(async () => {
    await supabase.auth.signOut();
    await goto('/');
  });
</script>

<div class="card preset-tonal-surface p-6 ring-1 ring-black/10 dark:ring-white/10">
  <p class="text-black/65 dark:text-white/65">Signing out...</p>
</div>
