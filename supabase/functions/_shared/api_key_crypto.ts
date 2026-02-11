function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const seed = enc.encode(`${secret}\nuser-api-keys-v1\n`);
  const digest = await crypto.subtle.digest("SHA-256", seed);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

const PREFIX = "enc:v1:";

export async function encryptApiKey(plaintext: string, secret: string): Promise<string> {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ptBytes = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ptBytes);
  const ctBytes = new Uint8Array(ct);
  return `${PREFIX}${base64UrlEncode(iv)}:${base64UrlEncode(ctBytes)}`;
}

export async function decryptApiKey(encrypted: string, secret: string): Promise<string> {
  if (!encrypted.startsWith(PREFIX)) {
    // Back-compat: older rows stored plaintext in api_key_encrypted.
    return encrypted;
  }
  const rest = encrypted.slice(PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted key format");
  const iv = base64UrlDecode(parts[0]);
  const ct = base64UrlDecode(parts[1]);
  const key = await deriveAesKey(secret);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(new Uint8Array(pt));
}

