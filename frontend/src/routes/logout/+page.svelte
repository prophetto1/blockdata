<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  onMount(async () => {
    await supabase.auth.signOut();
    await goto('/');
  });
</script>

<div class="card">
  <p class="muted">Signing out…</p>
</div>

