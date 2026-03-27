/**
 * Tiny HTML include loader for static pages.
 *
 * Use with:
 *   <div data-l10-include="shared/components/foo.html"></div>
 *   <script type="module">
 *     import { includeAll } from "../shared/ui/include.js";
 *     await (window.l10ShellReady ?? Promise.resolve());
 *     await includeAll();
 *   </script>
 *
 * Includes are fetched relative to the site base so deployments under subpaths work.
 */

function getShellBasePath() {
  try {
    const scripts = Array.from(document.scripts || []).map((s) => s.src).filter(Boolean);
    const shellSrc = scripts.find((src) => /\/site-shell\.js(\?|#|$)/.test(src));
    if (!shellSrc) return "/shared";
    const url = new URL(shellSrc, window.location.href);
    return url.pathname.replace(/\/[^/]*$/, "");
  } catch {
    return "/shared";
  }
}

function getSiteBasePathFromShellBase(shellBase) {
  const m = String(shellBase || "").match(/^(.*)\/(shared|_shared)$/);
  if (!m) return "";
  return m[1] || "";
}

const SHELL_BASE = getShellBasePath();
const SITE_BASE = getSiteBasePathFromShellBase(SHELL_BASE);

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || ""));
}

function normalizeHref(href) {
  const value = String(href || "").trim();
  if (!value) return value;
  if (isExternalHref(value) || value.startsWith("mailto:") || value.startsWith("tel:")) return value;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/")) return `${SITE_BASE}${value}`;
  return `${SITE_BASE}/${value.replace(/^\.?\//, "")}`;
}

async function fetchText(href) {
  const res = await fetch(href, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load include: ${res.status} ${res.statusText}`);
  return res.text();
}

export async function includeInto(target, href) {
  const resolved = normalizeHref(href);
  const html = await fetchText(resolved);
  target.innerHTML = html;
  target.removeAttribute("data-l10-include");
}

export async function includeAll(root = document) {
  const nodes = Array.from(root.querySelectorAll("[data-l10-include]"));
  for (const node of nodes) {
    const href = node.getAttribute("data-l10-include");
    if (!href) continue;
    try {
      await includeInto(node, href);
    } catch (err) {
      node.innerHTML = `<div class="text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">Failed to load component: ${String(err?.message || err)}</div>`;
    }
  }
}

