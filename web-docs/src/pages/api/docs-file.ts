import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { normalize, resolve, extname } from 'node:path';

export const prerender = false;

const ALLOWED_EXTENSIONS = new Set(['.md', '.mdx']);
const DOCS_ROOT = resolve(process.cwd(), 'src/content/docs');

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeRelativePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.trim()) return null;

  const normalized = normalize(value)
    .replace(/^\\+/, '')
    .replace(/\\/g, '/');
  return normalized;
}

function resolveSafePath(relativePath: string) {
  const absolute = resolve(DOCS_ROOT, relativePath);
  const normalizedAbs = normalize(absolute).replace(/\\/g, '/');
  const normalizedRoot = normalize(DOCS_ROOT).replace(/\\/g, '/');

  const insideRoot = normalizedAbs === normalizedRoot
    || normalizedAbs.startsWith(`${normalizedRoot}/`);
  if (!insideRoot) return null;

  const extension = extname(normalizedAbs).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return null;

  return absolute;
}

function isAuthorized(request: Request) {
  const token = process.env.DOCS_FILE_WRITE_TOKEN;
  if (!token) return true;

  const auth = request.headers.get('authorization');
  if (!auth) return false;

  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (supplied !== token) return false;

  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  if (!host || !origin) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const GET: APIRoute = async ({ url }) => {
  const rawPath = normalizeRelativePath(url.searchParams.get('path'));
  if (!rawPath) return jsonError(400, 'Missing path parameter');

  const absolutePath = resolveSafePath(rawPath);
  if (!absolutePath) return jsonError(400, 'Invalid path');
  if (!existsSync(absolutePath)) return jsonError(404, 'File not found');

  try {
    const content = await readFile(absolutePath, 'utf-8');
    return new Response(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    return jsonError(500, 'Failed to read file');
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return jsonError(401, 'Unauthorized');

  let body: { path?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Malformed JSON body');
  }

  const rawPath = normalizeRelativePath(body.path);
  if (!rawPath) return jsonError(400, 'Missing path');

  const absolutePath = resolveSafePath(rawPath);
  if (!absolutePath) return jsonError(400, 'Invalid path');

  if (typeof body.content !== 'string') return jsonError(400, 'Missing or invalid content');
  if (!existsSync(absolutePath)) return jsonError(404, 'File not found');

  try {
    await writeFile(absolutePath, body.content, 'utf-8');
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    return jsonError(500, 'Failed to write file');
  }
};
