import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function functionsBaseUrl(): string {
  return `${(SUPABASE_URL as string).replace(/\/+$/, '')}/functions/v1`;
}

async function requireAccessToken(): Promise<string> {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw new Error(sessionResult.error.message);

  let token = sessionResult.data.session?.access_token ?? null;
  if (!token) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw new Error(refreshed.error.message);
    token = refreshed.data.session?.access_token ?? null;
  }

  if (!token) throw new Error('Not authenticated');
  return token;
}

async function hasLocalAuthenticatedUser(): Promise<boolean> {
  const userResult = await supabase.auth.getUser();
  return !userResult.error && Boolean(userResult.data.user);
}

export async function edgeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = await requireAccessToken();
  const url = `${functionsBaseUrl()}/${path.replace(/^\/+/, '')}`;
  const runFetch = async (accessToken: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('apikey', ANON_KEY as string);
    try {
      return await fetch(url, { ...init, headers });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Network error calling edge function (${path}): ${reason}. ` +
          'If this is a newly added function, confirm it is deployed and reachable for this Supabase project.',
      );
    }
  };

  let resp = await runFetch(token);
  if (resp.status !== 401) return resp;

  const firstText = await resp.clone().text().catch(() => '');
  const firstInvalidJwt = firstText.includes('Invalid JWT');
  const localSessionLooksValid = await hasLocalAuthenticatedUser();

  if (!firstInvalidJwt) return resp;

  // Standard recovery path: refresh once, retry once.
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error) {
    if (localSessionLooksValid) {
      throw new Error(
        `Edge function auth rejected JWT (${path}) while client session is present. ` +
          'This usually indicates a backend function auth configuration mismatch for this Supabase project.',
      );
    }
    throw new Error('Session may be invalid or expired; please sign in again.');
  }

  const refreshedToken = refreshed.data.session?.access_token ?? null;
  if (!refreshedToken) {
    if (localSessionLooksValid) {
      throw new Error(
        `Edge function auth rejected JWT (${path}) while client session is present. ` +
          'This usually indicates a backend function auth configuration mismatch for this Supabase project.',
      );
    }
    throw new Error('Session may be invalid or expired; please sign in again.');
  }

  token = refreshedToken;
  resp = await runFetch(token);
  if (resp.status === 401) {
    const retryText = await resp.clone().text().catch(() => '');
    if (retryText.includes('Invalid JWT')) {
      if (localSessionLooksValid) {
        throw new Error(
          `Edge function auth rejected JWT (${path}) after token refresh. ` +
            'This usually indicates a backend function auth configuration mismatch for this Supabase project.',
        );
      }
      throw new Error('Session may be invalid or expired; please sign in again.');
    }
  }
  return resp;
}

export async function edgeJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await edgeFetch(path, init);
  const text = await resp.text();
  if (!resp.ok) {
    const authHint =
      resp.status === 401
        ? ' Session may be invalid or expired; please sign in again.'
        : '';
    const notFoundHint =
      resp.status === 404 && text.includes('Requested function was not found')
        ? ` Edge function "${path}" is not deployed for this project.`
        : '';
    throw new Error(`Edge function failed: HTTP ${resp.status} ${text.slice(0, 500)}${authHint}${notFoundHint}`);
  }
  return JSON.parse(text) as T;
}

export async function downloadFromEdge(pathWithQuery: string, filename: string): Promise<void> {
  const resp = await edgeFetch(pathWithQuery, { method: 'GET' });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Download failed: HTTP ${resp.status} ${text.slice(0, 500)}`);
  }
  const blob = await resp.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
