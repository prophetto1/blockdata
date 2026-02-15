/**
 * GCP Service Account → OAuth2 Bearer Token for Deno Edge Functions.
 * Uses Web Crypto API (zero external dependencies).
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

let _cached: { token: string; expiresAt: number } | null = null;

function b64url(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlStr(s: string): string {
  return b64url(new TextEncoder().encode(s));
}

async function importRsaKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signJwt(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const hdr = b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const pay = b64urlStr(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const input = `${hdr}.${pay}`;
  const key = await importRsaKey(sa.private_key);
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(input),
    ),
  );
  return `${input}.${b64url(sig)}`;
}

/**
 * Returns a GCP OAuth2 access token for the Vertex AI service account.
 * Caches until near-expiry (60 s buffer). Reads GCP_VERTEX_SA_KEY env/secret.
 */
export async function getVertexAccessToken(): Promise<string> {
  if (_cached && _cached.expiresAt > Date.now() + 60_000) return _cached.token;

  const raw = Deno.env.get("GCP_VERTEX_SA_KEY");
  if (!raw) throw new Error("Missing GCP_VERTEX_SA_KEY env/secret");
  const sa: ServiceAccountKey = JSON.parse(raw);

  const jwt = await signJwt(sa);
  const resp = await fetch(
    sa.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(
      `GCP token exchange failed (${resp.status}): ${err.slice(0, 500)}`,
    );
  }

  const data = await resp.json();
  _cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3599) * 1000,
  };
  return _cached.token;
}

/** Invalidate the cached token (e.g. after a 401 from Vertex). */
export function clearVertexTokenCache(): void {
  _cached = null;
}

/** Returns { projectId, location } from env. */
export function getVertexConfig() {
  return {
    projectId: Deno.env.get("GCP_VERTEX_PROJECT_ID") ?? "agchain",
    location: Deno.env.get("GCP_VERTEX_LOCATION") ?? "global",
  };
}
