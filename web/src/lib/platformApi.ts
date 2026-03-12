/**
 * Shared authenticated fetch for platform-api (VITE_PIPELINE_WORKER_URL).
 *
 * Reuses requireAccessToken() from lib/edge.ts — the same token helper
 * that edgeFetch uses for Supabase Edge Functions. This module targets
 * the platform-api base URL instead.
 */
import { requireAccessToken } from '@/lib/edge';
import { supabase } from '@/lib/supabase';

const PLATFORM_API_URL = (
  import.meta.env.VITE_PIPELINE_WORKER_URL ?? '/platform-api'
).replace(/\/+$/, '');

/**
 * Authenticated fetch against platform-api. Automatically attaches
 * the Supabase JWT as a Bearer token. On 401 with "Invalid JWT",
 * refreshes the session and retries once (matching edgeFetch behavior).
 */
export async function platformApiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${PLATFORM_API_URL}${path}`;

  const doFetch = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let token = await requireAccessToken();
  let resp = await doFetch(token);

  if (resp.status !== 401) return resp;

  // Check if it's a JWT issue worth retrying
  const bodyText = await resp.clone().text().catch(() => '');
  if (!bodyText.includes('Invalid JWT') && !bodyText.includes('token')) return resp;

  // Refresh session and retry once
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session?.access_token) return resp;

  token = refreshed.data.session.access_token;
  resp = await doFetch(token);

  return resp;
}