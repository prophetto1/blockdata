import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export const ssr = false;

export async function load() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session) throw redirect(302, '/login');
  return { user: data.session.user };
}

