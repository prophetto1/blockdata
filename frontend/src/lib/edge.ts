import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { supabase } from '$lib/supabase';

function functionsBaseUrl(): string {
  return `${PUBLIC_SUPABASE_URL.replace(/\\/+$/, '')}/functions/v1`;
}

async function requireAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function edgeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await requireAccessToken();
  const url = `${functionsBaseUrl()}/${path.replace(/^\\/+/, '')}`;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('apikey', PUBLIC_SUPABASE_ANON_KEY);
  return fetch(url, { ...init, headers });
}

export async function edgeJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await edgeFetch(path, init);
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Edge function failed: HTTP ${resp.status} ${text.slice(0, 500)}`);
  return JSON.parse(text) as T;
}

export async function downloadFromEdge(pathWithQuery: string, filename: string): Promise<void> {
  const resp = await edgeFetch(pathWithQuery, { method: 'GET' });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Download failed: HTTP ${resp.status} ${text.slice(0, 500)}`);
  }

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

