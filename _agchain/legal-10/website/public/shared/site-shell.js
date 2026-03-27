function getShellBasePath() {
  try {
    const current =
      document.currentScript && document.currentScript.src
        ? new URL(document.currentScript.src)
        : null;
    if (current) return current.pathname.replace(/\/[^/]*$/, "");
  } catch {}

  try {
    const src = Array.from(document.scripts)
      .map((s) => s.src)
      .filter(Boolean)
      .find((s) => /\/site-shell\.js(\?|#|$)/.test(s));
    if (src) return new URL(src).pathname.replace(/\/[^/]*$/, "");
  } catch {}

  return "/shared";
}

const SHELL_BASE = getShellBasePath();

function resolveShellAsset(relPath) {
  const clean = String(relPath || "").replace(/^\/+/, "");
  return `${SHELL_BASE}/${clean}`;
}

function getSiteBasePathFromShellBase(shellBase) {
  const m = String(shellBase || "").match(/^(.*)\/(shared|_shared)$/);
  if (!m) return "";
  return m[1] || "";
}

const SITE_BASE = getSiteBasePathFromShellBase(SHELL_BASE);

// Global Standardized Branding Alignment Constants
const SHELL_MAX_WIDTH = "max-w-screen-2xl";
const SHELL_PX = "px-6";
const SHELL_CONTAINER_CLASSES = `w-full ${SHELL_MAX_WIDTH} mx-auto ${SHELL_PX}`;

function isMethodsRoute(pathname) {
  const p = String(pathname || "");
  return /(^|\/)methods(\/|$)/.test(p);
}

function isBenchmarksRoute(pathname) {
  const p = String(pathname || "");
  return /(^|\/)benchmarks(\/|$)/.test(p);
}

function redirectMethodsIndexWithoutSlashIfNeeded() {
  const base = `${SITE_BASE}/methods`;
  const currentPath = window.location.pathname || "";
  if (currentPath !== base) return false;

  const nextUrl = `${base}/${window.location.search || ""}${
    window.location.hash || ""
  }`;
  window.location.replace(nextUrl);
  return true;
}

function redirectBenchmarksIndexWithoutSlashIfNeeded() {
  const currentPath = window.location.pathname || "";
  const bases = [
    `${SITE_BASE}/benchmarks`,
    `${SITE_BASE}/benchmarks/atomic`,
    `${SITE_BASE}/benchmarks/agentic`,
  ];
  if (!bases.includes(currentPath)) return false;

  const nextUrl = `${currentPath}/${window.location.search || ""}${
    window.location.hash || ""
  }`;
  window.location.replace(nextUrl);
  return true;
}

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || ""));
}

function normalizeHref(href) {
  const value = String(href || "");
  if (!value) return value;
  if (
    isExternalHref(value) ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  )
    return value;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/")) return `${SITE_BASE}${value}`;
  return value;
}

function normalizePathForCompare(pathname) {
  const p = String(pathname || "");
  if (p.endsWith("/index.html")) return p.slice(0, -"/index.html".length) + "/";
  return p;
}

function buildPathCompareSet(pathname) {
  const set = new Set();
  const p = normalizePathForCompare(pathname || "/") || "/";
  set.add(p);

  // Treat "/dir/" and "/dir" as the same route.
  if (p.endsWith("/") && p !== "/") {
    set.add(p.slice(0, -1));
  }

  // Treat "/foo" and "/foo.html" as the same route when a server uses clean URLs.
  if (p.endsWith(".html")) {
    set.add(p.slice(0, -".html".length));
  } else {
    const segments = p.split("/").filter(Boolean);
    const last = segments.length > 0 ? segments[segments.length - 1] : "";
    // If the last segment has no extension and isn't a directory, also consider common clean-URL variants.
    if (last && !p.endsWith("/") && !last.includes(".")) {
      set.add(`${p}.html`);
      // Also consider that it could be a directory route (e.g., "/benchmarks" -> "/benchmarks/").
      set.add(`${p}/`);
      set.add(`${p}/index.html`);
    }
  }

  // Treat "/dir/" and "/dir/index.html" as the same route.
  if (p.endsWith("/")) {
    set.add(`${p}index.html`);
  }

  return set;
}

function hrefMatchesCurrentPath(href) {
  try {
    const rawHref = String(href || "");
    if (rawHref.endsWith("*")) {
      const prefix = normalizeHref(rawHref.slice(0, -1));
      return window.location.pathname.startsWith(prefix);
    }

    const currentSet = buildPathCompareSet(window.location.pathname || "/");
    // Use window.location.href (not origin) so file:// URLs resolve correctly.
    const base = window.location.href || "http://localhost/";
    const resolvedPathname = new URL(normalizeHref(href), base).pathname;
    const resolvedSet = buildPathCompareSet(resolvedPathname);
    for (const p of currentSet) {
      if (resolvedSet.has(p)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract just the filename from a path (e.g., "/foo/bar/mission.html" -> "mission.html")
 */
function getPathFilename(path) {
  const p = String(path || "");
  // Handle root path
  if (p === "/" || p === "" || p.endsWith("/")) return "index.html";
  // Get the last segment
  const segments = p.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : "index.html";
}

function normalizeFilenameForCompare(filename) {
  const f = String(filename || "");
  if (f.toLowerCase().endsWith(".html")) return f.slice(0, -".html".length);
  return f;
}

function l10DebugEnabled() {
  try {
    return (
      window.localStorage && window.localStorage.getItem("l10_debug") === "1"
    );
  } catch {
    return false;
  }
}

function l10Debug(...args) {
  if (l10DebugEnabled()) console.log(...args);
}

/**
 * Find the active top nav item based on current path.
 * Checks both the item's href and its aliases array.
 * Uses multiple matching strategies to handle different path formats.
 */
function findActiveTopNavItem(topItems) {
  const currentPath = window.location.pathname || "/";
  const currentFilename = normalizeFilenameForCompare(
    getPathFilename(currentPath)
  );
  l10Debug(
    "[L10 Debug] findActiveTopNavItem - currentPath:",
    currentPath,
    "currentFilename:",
    currentFilename
  );

  // Pass 1: Check direct href and alias matches (most reliable)
  for (const item of topItems || []) {
    l10Debug(
      "[L10 Debug] Checking item:",
      item.title,
      "href:",
      item.href,
      "aliases:",
      item.aliases
    );
    // Check direct href match using existing function
    if (item.href && hrefMatchesCurrentPath(item.href)) {
      l10Debug("[L10 Debug] Matched by href:", item.title);
      return item;
    }

    // Check aliases using existing function
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    for (const alias of aliases) {
      if (hrefMatchesCurrentPath(alias)) {
        l10Debug("[L10 Debug] Matched by alias:", item.title, alias);
        return item;
      }
    }
  }

  // Pass 2: Check if currentPath contains the href or alias path segments
  // This handles file:// protocol and unusual base paths where full path matching fails
  for (const item of topItems || []) {
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];

    // Check if path contains the href (e.g., "/benchmarks/index.html" in full Windows path)
    // Skip root "/" as it would match everything
    if (item.href && item.href !== "/" && item.href.length > 1) {
      // Remove leading slash for contains check
      const hrefPath = item.href.startsWith("/")
        ? item.href.slice(1)
        : item.href;
      if (currentPath.includes(hrefPath)) {
        l10Debug(
          "[L10 Debug] Matched by contains href:",
          item.title,
          item.href
        );
        return item;
      }
    }

    for (const alias of aliases) {
      if (alias && alias !== "/" && alias.length > 1) {
        const aliasPath = alias.startsWith("/") ? alias.slice(1) : alias;
        if (currentPath.includes(aliasPath)) {
          l10Debug("[L10 Debug] Matched by contains alias:", item.title, alias);
          return item;
        }
      }
    }
  }

  // Pass 3: Last resort filename match - only for non-index files
  // Skip "index" filenames as they're too ambiguous (multiple sections have index.html)
  if (currentFilename && currentFilename !== "index") {
    for (const item of topItems || []) {
      const aliases = Array.isArray(item.aliases) ? item.aliases : [];

      const hrefFilename = normalizeFilenameForCompare(
        getPathFilename(item.href)
      );
      if (
        hrefFilename &&
        hrefFilename !== "index" &&
        currentFilename === hrefFilename
      ) {
        l10Debug("[L10 Debug] Matched by filename:", item.title);
        return item;
      }
      for (const alias of aliases) {
        const aliasFilename = normalizeFilenameForCompare(
          getPathFilename(alias)
        );
        if (
          aliasFilename &&
          aliasFilename !== "index" &&
          currentFilename === aliasFilename
        ) {
          l10Debug("[L10 Debug] Matched by alias filename:", item.title, alias);
          return item;
        }
      }
    }
  }

  l10Debug("[L10 Debug] No match found");
  return null;
}

/**
 * Find the current page in nav hierarchy and return breadcrumb + sibling info.
 * Searches through side nav items (which may have children) to find current page.
 * Returns { breadcrumb: [{title, href}], siblings: [{title, href, active}], parent: {title, href} }
 */
function sideItemIsActive(sideItem) {
  if (!sideItem) return false;
  if (sideItem.href && hrefMatchesCurrentPath(sideItem.href)) return true;
  const children = Array.isArray(sideItem.children) ? sideItem.children : [];
  return children.some((c) => c && c.href && hrefMatchesCurrentPath(c.href));
}

async function loadNav() {
  const path = String(window.location.pathname || "");
  const navFile = /^\/admin(\/|$)/.test(path) ? "admin-nav.json" : "nav.json";
  l10Debug("[L10 Debug] loadNav - loading:", navFile);

  const bases = Array.from(
    new Set(
      [
        SHELL_BASE,
        "/shared",
        "/_shared",
        "shared",
        "./shared",
        "../shared",
        "../../shared",
        "../../../shared",
      ].filter(Boolean)
    )
  );

  const attempts = [];
  let lastErr = null;
  for (const base of bases) {
    const url = `${base}/${navFile}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const ct = res.headers ? res.headers.get("content-type") || "" : "";
      attempts.push(`${url} -> ${res.status}${ct ? ` (${ct})` : ""}`);
      if (!res.ok) continue;
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        lastErr = parseErr;
        attempts.push(`${url} -> JSON parse error: ${parseErr?.message || parseErr}`);
      }
    } catch (err) {
      lastErr = err;
      attempts.push(`${url} -> ${err?.message || err}`);
    }
  }

  const details = attempts.length > 0 ? `\nTried:\n- ${attempts.join("\n- ")}` : "";
  const error = new Error(`Failed to load ${navFile}.${details}`);
  error.cause = lastErr;
  throw error;
}

function setThemeFromStorage() {
  const stored = localStorage.getItem("theme");
  if (stored === "dark") {
    document.documentElement.classList.add("dark");
    return;
  }
  if (stored === "light") {
    document.documentElement.classList.remove("dark");
    return;
  }

  // Default (when no explicit user preference is stored).
  // Keep it deterministic for now (marketing/demo consistency); user can toggle.
  document.documentElement.classList.add("dark");
}

function applyBodyStyles() {
  // Centralized body styling - pages don't need to set these manually
  const isBenchmarksPage = isBenchmarksRoute(window.location.pathname);

  // Preserve existing font class if set, otherwise default to font-serif
  const existingFontClass = Array.from(document.body.classList).find(c => c.startsWith('font-'));

  const classes = [
    "min-h-screen",
    isBenchmarksPage
      ? "bg-[#fcfcfc]" /* Light mode research white */
      : "bg-[#f0f0eb]" /* Light mode paper */,
    isBenchmarksPage
      ? "dark:bg-[#0a0a0a]" /* Dark mode research black */
      : "dark:bg-[#050505]" /* Dark mode deep void */,
    "text-neutral-900",
    "dark:text-[#d4d4d4]",
    "transition-colors",
  ];

  // Only add default font if page hasn't specified one
  if (existingFontClass) {
    classes.push(existingFontClass);
  } else {
    classes.push("font-serif"); /* Default to Merriweather */
  }

  // Clear any existing bg- or text- classes from other systems/manual edits
  document.body.className = document.body.className
    .replace(/\b(bg|text|dark:bg|dark:text)-[^\s]+\b/g, "")
    .trim();
  document.body.classList.add(...classes);
  // Always show scrollbar to prevent layout shift between pages
  document.documentElement.style.overflowY = "scroll";
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  window.dispatchEvent(
    new CustomEvent("l10-theme-changed", {
      detail: { theme: isDark ? "dark" : "light" },
    })
  );
}

function topLinkClasses(href, opts = {}) {
  const aliases = Array.isArray(opts.aliases) ? opts.aliases : [];
  const isActive =
    hrefMatchesCurrentPath(href) ||
    aliases.some((a) => hrefMatchesCurrentPath(a));
  // Use color only for active state (no font-weight change) to prevent layout shift
  return [
    "hover:text-neutral-900",
    "dark:hover:text-neutral-100",
    isActive
      ? "text-neutral-900 dark:text-neutral-100"
      : "text-neutral-600 dark:text-neutral-400",
  ].join(" ");
}

function sideLinkClasses(href) {
  const isActive = hrefMatchesCurrentPath(href);
  return sideLinkClassesByState(isActive);
}

function sideLinkClassesByState(isActive) {
  // Use background color for active state (no font-weight change) to prevent layout shift
  return [
    "block",
    "px-4",
    "py-2.5",
    "rounded",
    "text-sm",
    "leading-relaxed",
    "transition-colors",
    "duration-100",
    isActive
      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100",
  ].join(" ");
}

function sideTocLinkClasses(level) {
  const base = [
    "block",
    "px-4",
    "py-2",
    "border-l-2",
    "border-transparent",
    "rounded",
    "text-sm",
    "leading-relaxed",
    "transition-colors",
    "duration-100",
    "text-neutral-600",
    "dark:text-neutral-400",
    "hover:bg-neutral-50",
    "dark:hover:bg-neutral-800/50",
    "hover:text-neutral-900",
    "dark:hover:text-neutral-100",
  ];
  if (level === "h2") base.push("font-medium", "mt-1");
  if (level === "h3") base.push("ml-4");
  return base.join(" ");
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined) continue;
    if (k === "class") node.className = String(v);
    else if (k === "text") node.textContent = String(v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children || []) {
    if (!child) continue;
    node.appendChild(child);
  }
  return node;
}

function injectAcademicStyles() {
  ensureStylesheet(
    "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Fira+Code:wght@400;500;600&display=swap"
  );

  const styleId = "l10-academic-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .layout-research {
      background-color: #fcfcfc;
    }
    .dark .layout-research {
      background-color: #0a0a0a;
    }
    .research-content {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 1.15rem;
      line-height: 1.75;
      color: #1f2937;
    }
    .dark .research-content {
      color: #d1d5db;
    }
    .research-title {
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      font-size: 3.75rem;
      letter-spacing: -0.025em;
      line-height: 1.05;
      margin-bottom: 2.5rem;
      color: #111827;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1rem;
    }
    .dark .research-title {
      color: #f9fafb;
      border-bottom-color: #1f2937;
    }
    .sidebar-research-group {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
      margin-top: 2.5rem;
      margin-bottom: 0.5rem;
      padding-left: 1rem;
    }
    .sidebar-link-active {
      background-color: #f5f3ff;
      color: #4f46e5 !important;
      font-weight: 600;
      border-right: 2px solid #4f46e5;
      padding-left: 1.25rem !important;
    }
    .dark .sidebar-link-active {
      background-color: #1e1b4b;
      color: #818cf8 !important;
      border-right-color: #818cf8;
    }
    .research-content h2 {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 1.875rem;
      margin-top: 3rem;
      margin-bottom: 1.25rem;
      color: #111827;
    }
    .dark .research-content h2 {
      color: #f9fafb;
    }
    .research-content h3 {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 1.25rem;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      color: #1f2937;
    }
    .dark .research-content h3 {
      color: #e5e7eb;
    }
    .research-content p {
      margin-bottom: 1.5rem;
    }
    @media (max-width: 768px) {
      .research-title {
        font-size: 2.25rem !important;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
      }
      .layout-research [data-l10-layout="research"] .research-title {
        font-size: 2.25rem !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function injectDashboardStyles() {
  ensureStylesheet(
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700;800&display=swap"
  );

  const styleId = "l10-dashboard-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .layout-dashboard {
      background-color: #0d0d0d;
      color: #e5e5e5;
      min-height: 100vh;
    }
    .layout-dashboard .dashboard-inner {
      max-width: 100%;
      display: grid;
      grid-template-columns: 320px 1fr 300px;
      gap: 0;
      min-height: 100vh;
    }
    .layout-dashboard aside {
      background-color: #141414;
      border-right: 1px solid #262626;
      padding: 1.5rem;
    }
    .layout-dashboard .main-content {
      padding: 3rem;
      background-color: #0d0d0d;
      overflow-y: auto;
    }
    .layout-dashboard h1 {
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      font-size: 2.5rem;
      color: #fff;
      margin-bottom: 2rem;
      letter-spacing: -0.02em;
    }
    .layout-dashboard .technical-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: #888;
    }
    .layout-dashboard .technical-card h4 {
      color: #4f46e5;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }
    .sidebar-dashboard-link {
        display: block;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        font-size: 13px;
        color: #a3a3a3 !important;
        transition: all 0.2s;
        text-decoration: none;
    }
    .sidebar-dashboard-link:hover {
        background: #262626;
        color: #fff !important;
    }
    .sidebar-dashboard-active {
        background: #262626;
        color: #fff !important;
        border-left: 2px solid #4f46e5;
    }
  `;
  document.head.appendChild(style);
}

function injectJournalStyles() {
  ensureStylesheet(
    "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
  );

  const styleId = "l10-journal-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .layout-journal {
      background-color: #fffaf0;
      color: #1a1a1a;
      font-family: 'Libre Baskerville', serif;
      min-height: 100vh;
    }
    .layout-journal .journal-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 5rem 2rem;
      display: grid;
      grid-template-columns: 300px 1fr 280px;
      gap: 3rem;
    }
    /* Responsive adjustment for journal */
    @media (max-width: 1200px) {
      .layout-journal .journal-inner {
        grid-template-columns: 1fr 250px;
      }
      .journal-nav { display: none; }
    }
    @media (max-width: 800px) {
      .layout-journal .journal-inner {
        grid-template-columns: 1fr;
      }
      .journal-marginalia { display: none; }
    }

    .layout-journal h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 3rem;
      text-align: center;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 1rem;
    }
    .journal-marginalia {
        font-size: 0.85rem;
        font-style: italic;
        color: #666;
        line-height: 1.5;
        border-left: 1px solid #e5e0d5;
        padding-left: 2rem;
    }
    .journal-nav {
      border-right: 1px solid #e5e0d5;
      padding-right: 2rem;
    }
  `;
  document.head.appendChild(style);
}

function ensureTailwind() {
  // 1. Check for Tailwind
  const hasTailwind = Array.from(document.querySelectorAll("script")).some(
    (s) => (s.src || "").includes("cdn.tailwindcss.com")
  );
  if (!hasTailwind) {
    console.warn("site-shell: Tailwind not detected. Layout may look unstyled.");
  }
  
  // 2. FORCE Tailwind Config for Dark Mode
  // This ensures the toggle works even if the page forgot the inline script
  if (!window.tailwind) window.tailwind = {};
  if (!window.tailwind.config) window.tailwind.config = {};
  window.tailwind.config.darkMode = "class";
}

function getLayoutMode(page) {
  const mode = (page.dataset.l10Layout || "").trim();
  if (
    mode === "about" ||
    mode === "research" ||
    mode === "wide" ||
    mode === "two-col" ||
    mode === "center" ||
    mode === "article" ||
    mode === "dashboard" ||
    mode === "journal"
  )
    return mode;
  return "wide";
}

function getSideMode(page) {
  const mode = (page.dataset.l10Sidenav || "").trim();
  if (mode === "toc" || mode === "site") return mode;
  return "site";
}

function getSidenavPosition(page, { sideMode, typographyMode }) {
  const pos = (page.dataset.l10SidenavPos || "").trim();
  if (pos === "right" || pos === "left") return pos;
  if (typographyMode === "report" && sideMode === "toc") return "left";
  return "left";
}

function getTypographyMode(page) {
  const mode = (page.dataset.l10Typography || "").trim();
  if (mode === "report") return mode;
  return "";
}

function getContentWidth(page) {
  const width = (page.dataset.l10ContentWidth || "").trim();
  if (width === "narrow") return "narrow";
  return "default";
}

function ensureStylesheet(href) {
  const exists = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]')
  ).some((l) => l.getAttribute("href") === href);
  if (!exists) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildTocItems(page) {
  // Only H2 in TOC (H1 is page title, H3+ too granular)
  const headings = Array.from(page.querySelectorAll("h2"));
  const items = [];
  const used = new Set();

  for (const h of headings) {
    const title = (h.textContent || "").trim();
    if (!title) continue;

    let id = h.id && h.id.trim() ? h.id.trim() : slugify(title);
    if (!id) continue;
    let candidate = id;
    let i = 2;
    while (used.has(candidate) || document.getElementById(candidate)) {
      candidate = `${id}-${i}`;
      i += 1;
    }
    id = candidate;
    used.add(id);
    h.id = id;

    items.push({ title, href: `#${id}`, level: h.tagName.toLowerCase() });
  }

  return items;
}

function activateTocHighlight(side, opts = {}) {
  const links = Array.from(side.querySelectorAll('a[href^="#"]'));
  const targets = links
    .map((a) => {
      const id = (a.getAttribute("href") || "").slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { a, el } : null;
    })
    .filter(Boolean);

  if (targets.length === 0) return;

  const ACTIVE_CLASSES = [
    "bg-neutral-100",
    "dark:bg-neutral-800",
    "text-neutral-900",
    "dark:text-neutral-100",
    "font-medium",
    "border-l-neutral-900",
    "dark:border-l-neutral-100",
  ];

  const clearAll = () => {
    for (const t of targets) {
      t.a.classList.remove(...ACTIVE_CLASSES);
      t.a.removeAttribute("aria-current");
    }
  };

  const setActive = (a) => {
    clearAll();
    a.classList.add(...ACTIVE_CLASSES);
    a.setAttribute("aria-current", "true");
  };

  const observer = new IntersectionObserver(
    (entries) => {
      // Choose the top-most visible heading
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      const match = targets.find((t) => t.el === visible.target);
      if (match) {
        setActive(match.a);
        try {
          if (typeof opts?.onActiveChange === "function")
            opts.onActiveChange(match);
        } catch {}
      }
    },
    { root: null, rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] }
  );

  for (const t of targets) observer.observe(t.el);
}

function renderTopNavItem(topLinks, item) {
  if (!item?.title || !item?.href) return;

  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  if (!hasChildren) {
    const a = document.createElement("a");
    a.href = normalizeHref(item.href);
    a.textContent = item.title;
    a.className = topLinkClasses(item.href, { aliases: item.aliases });
    if (isExternalHref(item.href)) a.rel = "noreferrer";
    if (isExternalHref(item.href)) a.target = "_blank";
    topLinks.appendChild(a);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "relative";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `${topLinkClasses(item.href, {
    aliases: item.children.map((c) => c?.href).filter(Boolean),
  })} inline-flex items-center gap-1`;
  btn.setAttribute("aria-haspopup", "menu");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = `
    <span>${item.title}</span>
    <svg class="w-4 h-4 opacity-70 transition-transform" data-l10-chevron="1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
    </svg>
  `;

  const menu = document.createElement("div");
  menu.className =
    "hidden absolute mt-2 min-w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 shadow-lg z-50";
  menu.setAttribute("role", "menu");

  for (const child of item.children) {
    if (!child?.title || !child?.href) continue;
    const a = document.createElement("a");
    a.href = normalizeHref(child.href);
    a.textContent = child.title;
    a.setAttribute("role", "menuitem");
    a.className =
      "block px-4 py-2.5 rounded text-base text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100";
    menu.appendChild(a);
  }

  const chevron = btn.querySelector("[data-l10-chevron='1']");

  const close = () => {
    menu.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
    if (chevron) chevron.classList.remove("rotate-180");
  };
  const open = () => {
    menu.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
    if (chevron) chevron.classList.add("rotate-180");
  };
  const toggle = () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    if (isOpen) close();
    else open();
  };

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Close any other open menus
    for (const other of document.querySelectorAll(
      "[data-l10-topmenu-open='1']"
    )) {
      other.removeAttribute("data-l10-topmenu-open");
    }
    if (btn.getAttribute("aria-expanded") === "true") {
      close();
      wrap.removeAttribute("data-l10-topmenu-open");
    } else {
      open();
      wrap.setAttribute("data-l10-topmenu-open", "1");
    }
  });

  document.addEventListener("click", () => close(), { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  wrap.appendChild(btn);
  wrap.appendChild(menu);
  topLinks.appendChild(wrap);
}

function renderSideNav(side, items) {
  for (const item of items || []) {
    if (!item?.title) continue;

    const hasChildren =
      Array.isArray(item.children) && item.children.length > 0;

    if (!hasChildren) {
      if (!item.href) continue;
      const a = document.createElement("a");
      a.href = normalizeHref(item.href);
      a.textContent = item.title;
      a.className = sideLinkClasses(item.href);
      side.appendChild(a);
      continue;
    }

    const section = document.createElement("div");
    section.className = "mt-4 first:mt-0";

    const sectionTitle = document.createElement(item.href ? "a" : "div");
    if (item.href) sectionTitle.href = normalizeHref(item.href);
    sectionTitle.textContent = item.title;
    sectionTitle.className =
      "block px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1";
    section.appendChild(sectionTitle);

    for (const child of item.children) {
      if (!child?.title) continue;

      // Check if this child has nested children (L3 structure)
      const childHasChildren =
        Array.isArray(child.children) && child.children.length > 0;

      if (childHasChildren) {
        // Render L3 group header
        const groupTitle = el("div", {
          class:
            "px-4 py-1.5 mt-3 first:mt-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500",
          text: child.title,
        });
        section.appendChild(groupTitle);

        // Render L3 items
        for (const grandchild of child.children) {
          if (!grandchild?.href || !grandchild?.title) continue;
          const a = document.createElement("a");
          a.href = normalizeHref(grandchild.href);
          a.textContent = grandchild.title;
          a.className = `${sideLinkClasses(grandchild.href)} ml-2 text-[13px]`;
          section.appendChild(a);
        }
      } else if (child.href) {
        // Regular L2 item
        const a = document.createElement("a");
        a.href = normalizeHref(child.href);
        a.textContent = child.title;
        a.className = sideLinkClasses(child.href);
        section.appendChild(a);
      }
    }

    side.appendChild(section);
  }
}

/**
 * Render sidebar items flat (no outer section wrapper).
 * Used when rendering items from a top nav item's side array.
 */
const NAV_METADATA = {
  "Start Here": {
    color: "#a3a3a3", // Neutral/White
    bg: "rgba(163, 163, 163, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  "Overview": {
    color: "#4f46e5", // Indigo
    bg: "rgba(79, 70, 229, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>`,
  },
  "L10 Atomic": {
    color: "#2563eb", // Blue
    bg: "rgba(37, 99, 235, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>`,
  },
  "L10 Agentic": {
    color: "#7c3aed", // Purple
    bg: "rgba(124, 58, 237, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3 7h7l-5.5 4.1L18 20l-6-4-6 4 1.5-6.9L2 9h7z"/></svg>`,
  },
  "Data & Corpus": {
    color: "#059669", // Emerald
    bg: "rgba(5, 150, 105, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
  },
  "Evaluation Pipeline": {
    color: "#7c3aed", // Purple
    bg: "rgba(124, 58, 237, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  },
  "Scoring & Judging": {
    color: "#db2777", // Pink
    bg: "rgba(219, 39, 119, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M2 18l10-4 10 4M2 6l10-4 10 4"/></svg>`,
  },
  "Artifacts & Reproducibility": {
    color: "#d97706", // Amber
    bg: "rgba(217, 119, 6, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 8V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><rect x="1" y="3" width="22" height="5" rx="2" ry="2"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  },
  "Validation Checks": {
    color: "#0891b2", // Cyan
    bg: "rgba(8, 145, 178, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11 11 13 15 9"/></svg>`,
  },
  "Quantization & Reasoning Performance": {
    color: "#db2777", // Pink
    bg: "rgba(219, 39, 119, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 7h6a3 3 0 0 1 0 6H6z"/><path d="M6 13h7a3 3 0 0 1 0 6H6z"/><path d="M6 7v12"/></svg>`,
  },
  "Problems We Solve": {
    color: "#eab308", // Yellow
    bg: "rgba(234, 179, 8, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 20l-5-5 5-5M20 4v7a4 4 0 0 1-4 4H4"/></svg>`,
  },
  "Roadmap & Legacy": {
    color: "#eab308", // Yellow
    bg: "rgba(234, 179, 8, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 20l-5-5 5-5M20 4v7a4 4 0 0 1-4 4H4"/></svg>`,
  },
  "AG8": {
    color: "#059669", // Emerald
    bg: "rgba(5, 150, 105, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 7h16M4 12h10M4 17h16"/><path d="M17 10l3 2-3 2"/></svg>`,
  },
  "AG10": {
    color: "#4f46e5", // Indigo
    bg: "rgba(79, 70, 229, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M7 12h14"/><path d="M11 18h10"/><circle cx="5" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/></svg>`,
  },
  "L7": {
    color: "#2563eb", // Blue
    bg: "rgba(37, 99, 235, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19h16"/><path d="M6 17V7"/><path d="M10 17V5"/><path d="M14 17V9"/><path d="M18 17V11"/></svg>`,
  },
  "Roadmap": {
    color: "#eab308", // Yellow
    bg: "rgba(234, 179, 8, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h11a3 3 0 0 1 3 3v11"/><path d="M4 10h9"/><path d="M4 14h7"/><path d="M4 18h5"/></svg>`,
  },
  "Quantization": {
    color: "#db2777", // Pink
    bg: "rgba(219, 39, 119, 0.1)",
    icon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 7h6a3 3 0 0 1 0 6H6z"/><path d="M6 13h7a3 3 0 0 1 0 6H6z"/><path d="M6 7v12"/></svg>`,
  },
};

function renderSideNavFlat(side, items, layoutMode = "default") {
  const isResearch = layoutMode === "research";
  const isDashboard = layoutMode === "dashboard";
  const isAdminRoute = (() => {
    try {
      return /^\/admin(\/|$)/.test(String(window.location.pathname || ""));
    } catch {
      return false;
    }
  })();

  for (const item of items || []) {
    if (!item?.title) continue;

    const hasChildren =
      Array.isArray(item.children) && item.children.length > 0;

    // Robust Metadata Lookup (handle potential whitespace issues)
    let metaFromMap = NAV_METADATA[item.title];
    if (!metaFromMap && item.title.trim() !== item.title) {
      metaFromMap = NAV_METADATA[item.title.trim()];
    }
    const meta =
      metaFromMap || { color: "#171717", bg: "rgba(0,0,0,0.05)", icon: "" };

    if (!hasChildren) {
      if (!item.href) continue;

      const isActive = hrefMatchesCurrentPath(item.href);

      // Special Case: Research Layout Single Item WITH Icon -> Render like a Header
      if (isResearch && meta.icon) {
        const a = document.createElement("a");
        a.href = normalizeHref(item.href);
        // Use header-row styling but as an anchor
        // Removed active background color per user request ("same as bg color that's all around it")
        a.className =
          "sidebar-v2-header-row flex items-center gap-3 cursor-pointer py-2 px-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors select-none mb-2 block";

        if (isActive) {
          // The "Purple Line" REMOVED per user request
          // Just ensure active text is colored (handled later? No, we need it here)
          // Actually titleText color depends on logic later?
          // Wait, title styling is below.
        }

        // Icon Container
        const icon = document.createElement("div");
        icon.className =
          "nav-icon-container w-6 h-6 rounded flex items-center justify-center";
        icon.style.backgroundColor = meta.bg;
        icon.style.color = meta.color;
        icon.innerHTML = meta.icon;
        a.appendChild(icon);

        // Title
        const titleText = el("span", {
          class: "sidebar-v2-header-text",
          text: item.title,
        });

        if (isActive) {
          // Only apply a brand color if we have explicit metadata.
          // Otherwise rely on CSS (dark mode toggles correctly).
          if (metaFromMap) titleText.style.color = meta.color;
          titleText.classList.add("font-bold");
        }

        a.appendChild(titleText);
        side.appendChild(a);
        continue;
      }

      const a = document.createElement("a");
      a.href = normalizeHref(item.href);
      a.textContent = item.title;

      if (isResearch) {
        a.className =
          "sidebar-v2-link" + (isActive ? " sidebar-v2-active" : "");
        // Only set brand variables when metadata exists; otherwise fall back to
        // readable defaults in both light/dark modes.
        if (metaFromMap) {
          a.style.setProperty("--active-brand-color", meta.color);
          a.style.setProperty("--active-brand-bg", meta.bg);
        }
        side.appendChild(a);
        continue;
      } else if (isDashboard) {
        a.className =
          "sidebar-dashboard-link" +
          (isActive ? " sidebar-dashboard-active" : "");
        side.appendChild(a);
        continue;
      } else {
        // V1 Layout: If it has an icon, it should LOOK like a Header (even if single link)
        if (meta.icon) {
          const wrap = document.createElement("div");
          wrap.className = "sidebar-category-header mb-2";
          // Note: V1 headers usually have some margin?

          // Icon
          const icon = document.createElement("div");
          icon.className = "nav-icon-container";
          icon.style.backgroundColor = meta.bg;
          icon.style.color = meta.color;
          icon.innerHTML = meta.icon;
          wrap.appendChild(icon);

          // Title Link
          const titleLink = document.createElement("a");
          titleLink.className =
            "sidebar-v1-group-text hover:underline block w-full";
          // block w-full to accept border
          titleLink.textContent = item.title;
          titleLink.href = normalizeHref(item.href);

          if (isActive) {
            titleLink.style.color = meta.color;
            titleLink.classList.add("font-bold");
          } else {
            titleLink.style.color = "#4b5563"; // default gray
          }

          wrap.appendChild(titleLink);
          side.appendChild(wrap);
          continue; // Done for this item
        }

        // Standard V1 Sub-Link (no icon)
        a.className =
          "sidebar-v1-link block" + (isActive ? " sidebar-v1-active" : "");
        if (isActive) {
          a.style.borderLeft = `3px solid ${meta.color}`;
          a.style.paddingLeft = "0.75rem";
          a.style.color = meta.color;
          a.style.fontWeight = "600";
        } else {
          a.style.borderLeft = "3px solid transparent";
          a.style.paddingLeft = "0.75rem";
        }
        side.appendChild(a);
        continue;
      }
    }

    // Group Header & Children Container (Collapsible for Research)
    if (isResearch) {
      const wrap = document.createElement("div");
      wrap.className = "sidebar-v2-group mb-2"; // Container for the whole group

      // 1. Header Row
      const headerRow = document.createElement("div");
      headerRow.className =
        "sidebar-v2-header-row flex items-center justify-between cursor-pointer py-1.5 px-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors select-none";

      // Left side: Icon + Title
      const left = document.createElement("div");
      left.className = "flex items-center gap-3";

      if (meta.icon) {
        const icon = document.createElement("div");
        icon.className =
          "nav-icon-container w-6 h-6 rounded flex items-center justify-center";
        icon.style.backgroundColor = meta.bg;
        icon.style.color = meta.color;
        icon.innerHTML = meta.icon; // SVG
        left.appendChild(icon);
      }

      const titleText = el("span", {
        class: "sidebar-v2-header-text",
        text: item.title,
      });
      // Override color if active (optional, but let's keep it clean)
      left.appendChild(titleText);
      headerRow.appendChild(left);

      // Right side: Chevron
      const chevron = document.createElement("div");
      chevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
      chevron.className = "text-neutral-400 transition-transform duration-200";
      headerRow.appendChild(chevron);

      wrap.appendChild(headerRow);

      // 2. Children Container
      const childrenContainer = document.createElement("div");
      childrenContainer.className =
        "overflow-hidden transition-all duration-300 ease-in-out pl-2 border-l border-neutral-100 dark:border-neutral-800 ml-5";
      childrenContainer.style.maxHeight = "0px"; // Default collapsed

      let hasActiveChild = false;

      for (const child of item.children) {
        if (!child?.href || !child?.title) continue;
        const a = document.createElement("a");
        a.href = normalizeHref(child.href);
        a.textContent = child.title;
        const isActive = hrefMatchesCurrentPath(child.href);
        if (isActive) hasActiveChild = true;

        a.className =
          "sidebar-v2-link block py-1 px-3 text-sm rounded-md transition-colors " +
          (isActive
            ? "sidebar-v2-active bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300 font-semibold"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-300");

        childrenContainer.appendChild(a);
      }

      wrap.appendChild(childrenContainer);
      side.appendChild(wrap);

      // 3. Logic: Toggle & Auto-Expand
      const toggle = (forceOpen = null) => {
        const isOpen =
          forceOpen !== null
            ? forceOpen
            : childrenContainer.style.maxHeight === "0px";
        if (isOpen) {
          childrenContainer.style.maxHeight =
            childrenContainer.scrollHeight + "px";
          childrenContainer.style.opacity = "1";
          chevron.style.transform = "rotate(180deg)";
        } else {
          childrenContainer.style.maxHeight = "0px";
          childrenContainer.style.opacity = "0";
          chevron.style.transform = "rotate(0deg)";
        }
      };

      headerRow.onclick = () => {
        const isCurrentlyOpen = childrenContainer.style.maxHeight !== "0px";
        
        // COLLAPSE ALL OTHER SECTIONS (Accordion Behavior)
        if (!isCurrentlyOpen) {
          const allWraps = side.querySelectorAll(".sidebar-v2-group");
          allWraps.forEach(otherWrap => {
             const otherContainer = otherWrap.querySelector(".overflow-hidden");
             const otherChevron = otherWrap.querySelector("svg");
             if (otherContainer && otherContainer !== childrenContainer) {
               otherContainer.style.maxHeight = "0px";
               if (otherChevron) otherChevron.style.transform = "rotate(0deg)";
             }
          });
        }

        // TOGGLE CURRENT
        if (isCurrentlyOpen) {
          childrenContainer.style.maxHeight = "0px";
          chevron.style.transform = "rotate(0deg)";
        } else {
          childrenContainer.style.maxHeight =
            childrenContainer.scrollHeight + "px";
          chevron.style.transform = "rotate(180deg)";
        }
      };

      // If this section contains the active page, expand it by default
      if (hasActiveChild) {
        // Need a slight delay or immediate style set to ensure height calc works?
        // Actually, setting max-height to a large value or scrollHeight works.
        // Since we are rendering, we can just set it inline now if we trust layout.
        // Better: use a microtask or just set non-zero.
        childrenContainer.style.maxHeight = "100%"; // Allow it to be open initially
        chevron.style.transform = "rotate(180deg)";
      }
    } else if (isDashboard) {
      const groupTitle = el("div", {
        class:
          "px-4 py-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500",
        text: item.title,
      });
      side.appendChild(groupTitle);
      // Children for dashboard
      for (const child of item.children) {
        const a = document.createElement("a");
        a.href = normalizeHref(child.href);
        a.textContent = child.title;
        a.className =
          "sidebar-dashboard-link" +
          (hrefMatchesCurrentPath(child.href)
            ? " sidebar-dashboard-active"
            : "");
        side.appendChild(a);
      }
    } else {
      // Admin special: "Runs" group gets a run-spec dropdown, and child links
      // get an auto-appended ?runspec=<id> query param.
      if (isAdminRoute && item.title === "Runs") {
        const wrap = document.createElement("div");
        wrap.className = "sidebar-category-header";

        let groupTitle;
        if (item.href) {
          groupTitle = el("a", {
            class: "sidebar-v1-group-text hover:underline",
            text: item.title,
            href: normalizeHref(item.href),
          });
        } else {
          groupTitle = el("div", {
            class: "sidebar-v1-group-text",
            text: item.title,
          });
        }
        wrap.appendChild(groupTitle);
        side.appendChild(wrap);

        const control = document.createElement("div");
        control.className = "px-4 pb-2";

        const label = document.createElement("div");
        label.className =
          "text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2";
        label.textContent = "Run Spec";
        control.appendChild(label);

        const select = document.createElement("select");
        select.className =
          "w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm px-3 py-2 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-sky-500/30";
        select.innerHTML = `<option value="" selected>Loading…</option>`;
        control.appendChild(select);

        const hint = document.createElement("div");
        hint.className = "mt-2 text-xs text-neutral-500";
        hint.textContent = "Applies to all run-scoped admin pages.";
        control.appendChild(hint);

        side.appendChild(control);

        const linkEls = [];
        for (const child of item.children) {
          if (!child?.href || !child?.title) continue;
          const a = document.createElement("a");
          a.href = normalizeHref(child.href);
          a.textContent = child.title;
          const isActive = hrefMatchesCurrentPath(child.href);
          a.className =
            "sidebar-v1-link" + (isActive ? " sidebar-v1-active" : "");
          side.appendChild(a);
          linkEls.push(a);
        }

        const STORAGE_KEY = "l10_admin_runspec_v1";
        const getRunspecFromUrl = () => {
          try {
            const params = new URLSearchParams(window.location.search || "");
            return String(params.get("runspec") || "").trim();
          } catch {
            return "";
          }
        };
        const getStoredRunspec = () => {
          try {
            return String(localStorage.getItem(STORAGE_KEY) || "").trim();
          } catch {
            return "";
          }
        };
        const setStoredRunspec = (id) => {
          try {
            localStorage.setItem(STORAGE_KEY, String(id || ""));
          } catch {}
        };

        const applyRunspecToLinks = (runspecId) => {
          const id = String(runspecId || "").trim();
          if (!id) return;
          for (const a of linkEls) {
            try {
              const u = new URL(a.href, window.location.href);
              const p = u.pathname || "";
              // Never attach to non-run pages.
              if (
                /\/admin\/(login|logout)(\.html)?\/?$/.test(p) ||
                /\/admin\/cms(\.html)?\/?$/.test(p)
              )
                continue;
              u.searchParams.set("runspec", id);
              a.href = u.toString();
            } catch {}
          }
        };

        const setSelectValueIfPresent = (value) => {
          const v = String(value || "").trim();
          if (!v) return false;
          const opt = Array.from(select.options).find((o) => o.value === v);
          if (!opt) return false;
          select.value = v;
          return true;
        };

        const chooseInitial = (ids) => {
          const fromUrl = getRunspecFromUrl();
          if (fromUrl && ids.includes(fromUrl)) return fromUrl;
          const stored = getStoredRunspec();
          if (stored && ids.includes(stored)) return stored;
          return ids.length > 0 ? ids[0] : "";
        };

        const populate = async () => {
          try {
            const res = await fetch("/data/run-specs.json", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = await res.json();
            const runSpecs = Array.isArray(payload.runSpecs) ? payload.runSpecs : [];
            const ids = runSpecs.map((rs) => rs?.id).filter(Boolean);

            select.innerHTML = "";
            for (const rs of runSpecs) {
              const id = String(rs?.id || "").trim();
              if (!id) continue;
              const label = String(rs?.label || id).trim();
              const opt = document.createElement("option");
              opt.value = id;
              opt.textContent = label === id ? id : `${label} (${id})`;
              select.appendChild(opt);
            }

            if (ids.length === 0) {
              select.innerHTML = `<option value="" selected>(no run specs found)</option>`;
              return;
            }

            const initial = chooseInitial(ids);
            if (initial) {
              setSelectValueIfPresent(initial);
              setStoredRunspec(initial);
              applyRunspecToLinks(initial);
            }

            select.addEventListener("change", () => {
              const id = String(select.value || "").trim();
              if (!id) return;
              setStoredRunspec(id);
              applyRunspecToLinks(id);
            });
          } catch (err) {
            select.innerHTML = `<option value="" selected>(failed to load run specs)</option>`;
            hint.textContent = `Could not load /data/run-specs.json (${String(
              err?.message || err
            )}).`;
          }
        };

        populate();
        continue;
      }

      // ... Original V1 Logic matching exactly what was there ...
      const wrap = document.createElement("div");
      wrap.className = "sidebar-category-header";

      if (meta.icon) {
        const icon = document.createElement("div");
        icon.className = "nav-icon-container";
        icon.style.backgroundColor = meta.bg;
        icon.style.color = meta.color;
        icon.innerHTML = meta.icon;
        wrap.appendChild(icon);
      }

      let groupTitle;
      if (item.href) {
        groupTitle = el("a", {
          class: "sidebar-v1-group-text hover:underline",
          text: item.title,
          href: normalizeHref(item.href),
        });
        const isActive = hrefMatchesCurrentPath(item.href);
        if (isActive) {
          groupTitle.style.color = meta.color;
          groupTitle.classList.add("font-bold");
        }
      } else {
        groupTitle = el("div", {
          class: "sidebar-v1-group-text",
          text: item.title,
        });
      }
      wrap.appendChild(groupTitle);
      side.appendChild(wrap);

      // Children V1
      for (const child of item.children) {
        if (!child?.href || !child?.title) continue;
        const a = document.createElement("a");
        a.href = normalizeHref(child.href);
        a.textContent = child.title;
        const isActive = hrefMatchesCurrentPath(child.href);

        a.className =
          "sidebar-v1-link" + (isActive ? " sidebar-v1-active" : "");
        a.style.setProperty("--active-brand-color", meta.color);
        side.appendChild(a);
      }
    }
  }
}

function injectAdminQuickLinks(container, { variant = "sidebar" } = {}) {
  try {
    if (!container || container.getAttribute("data-l10-quicklinks") === "1") return;
    container.setAttribute("data-l10-quicklinks", "1");

    const dataUrl = normalizeHref("/data/admin/quick-links.json");
    fetch(dataUrl, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const links = Array.isArray(data?.links) ? data.links : [];
        if (!links.length) return;

        const items = links
          .map((link) => ({
            id: String(link?.id || ""),
            title: String(link?.title || link?.id || link?.url || ""),
            url: String(link?.url || "").trim(),
          }))
          .filter((x) => x.title && x.url)
          .sort((a, b) => a.title.localeCompare(b.title));

        if (!items.length) return;

        const block = document.createElement("div");
        block.className =
          variant === "drawer"
            ? "mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800"
            : "mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800";

        const row = document.createElement("div");
        row.className = "px-4 flex items-center gap-2";

        const select = document.createElement("select");
        select.className =
          "w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-neutral-900/40 px-2 py-2 text-xs text-neutral-800 dark:text-neutral-200";

        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "Quick Links…";
        select.appendChild(defaultOpt);

        for (const item of items) {
          const opt = document.createElement("option");
          opt.value = item.url;
          opt.textContent = item.title;
          select.appendChild(opt);
        }

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.disabled = true;
        openBtn.className =
          "shrink-0 rounded-lg border border-neutral-200 dark:border-white/10 px-2 py-2 text-xs font-mono text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 disabled:opacity-50 disabled:pointer-events-none";
        openBtn.title = "Open selected link";
        openBtn.innerHTML =
          '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v7H3V3h7"/></svg>';

        function currentUrl() {
          return String(select.value || "").trim();
        }

        select.addEventListener("change", () => {
          openBtn.disabled = !currentUrl();
        });

        openBtn.addEventListener("click", () => {
          const url = currentUrl();
          if (!url) return;
          window.open(normalizeHref(url), "_blank", "noreferrer");
        });

        row.appendChild(select);
        row.appendChild(openBtn);
        block.appendChild(row);

        container.appendChild(block);
      })
      .catch(() => {});
  } catch {}
}

function renderSideNavV3(side, section) {
  // section: { title, href?, children: [ {title, children:[{title, href}...] }...] }
  const groups = section?.children || [];
  for (const group of groups) {
    if (!group?.title || !Array.isArray(group.children)) continue;
    renderSideNavLevel3(side, group);
  }
}

function findActiveSideSection(side, path) {
  for (const section of side || []) {
    if (!section?.title) continue;
    if (section.href && hrefMatchesCurrentPath(section.href)) return section;
    for (const child of section.children || []) {
      if (!child?.href) continue;
      if (hrefMatchesCurrentPath(child.href)) return section;
    }
  }
  return null;
}

function findActiveSideSectionDeep(side, path) {
  const active = findActiveSideSection(side, path);
  if (active) return active;

  // If the section contains nested group children (L2 groups), search their L3 hrefs.
  for (const section of side || []) {
    for (const group of section?.children || []) {
      for (const child of group?.children || []) {
        if (child?.href && hrefMatchesCurrentPath(child.href)) return section;
      }
    }
  }
  return null;
}

/**
 * Process all elements with data-l10-include attribute.
 * Fetches the component HTML and replaces the element content.
 */
async function processIncludes(root = document) {
  const includes = Array.from(root.querySelectorAll("[data-l10-include]"));
  if (includes.length === 0) return;

  l10Debug("[L10 Debug] processIncludes found", includes.length, "items");

  await Promise.all(
    includes.map(async (el) => {
      const relPath = el.dataset.l10Include;
      if (!relPath) return;

      const fullPath = normalizeHref(relPath);
      l10Debug("[L10 Debug] Fetching include:", relPath, "->", fullPath);

      try {
        const res = await fetch(fullPath, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // Use a temporary container to parse the HTML
        const temp = document.createElement("div");
        temp.innerHTML = html;

        // Replace inner content
        el.innerHTML = "";
        while (temp.firstChild) {
          el.appendChild(temp.firstChild);
        }

        // Remove the attribute so it doesn't get processed again
        el.removeAttribute("data-l10-include");

        // Recursively process any includes inside the newly added content
        await processIncludes(el);
      } catch (err) {
        console.error(`site-shell: Failed to include ${fullPath}:`, err);
        el.innerHTML = `<div class="p-4 bg-red-50 text-red-600 text-xs border border-red-100 rounded">Failed to load component: ${relPath}</div>`;
      }
    })
  );
}

async function mountShell() {
  ensureTailwind();

  // `serve` (and some static hosting) may serve `methods/index.html` at `/methods`
  // (no trailing slash). That breaks relative links like `./case-universe.html` and
  // prevents methods-only affordances (like prev/next) from activating.
  if (redirectMethodsIndexWithoutSlashIfNeeded()) return;
  // Same issue for benchmarks subpages: links like `design.html` assume a trailing slash.
  if (redirectBenchmarksIndexWithoutSlashIfNeeded()) return;

  // Hybrid Logic: Original Shell + Codex Content
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Fira+Code:wght@400;500;600&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap');
    
    :root {
      /* Shell Fonts (Original) */
      --l10-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
      --l10-font-display: 'Outfit', 'Inter', sans-serif;
      --l10-font-brand: 'EB Garamond', ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;

      
      /* Content Fonts (Codex) */
      --l10-font-mono: 'Fira Code', monospace;
      --l10-font-serif: 'Merriweather', serif;
      
      --l10-text-main: #171717;
      
      /* Scrollbar hiding utility */
      --scrollbar-width: none;
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    
    /* Chrome, Safari and Opera */
    *::-webkit-scrollbar {
      display: none;
    } 

    /* DEFAULT GLOBAL STYLES (Restored Standard) */
    body { 
      font-family: var(--l10-font-sans); 
      -webkit-font-smoothing: antialiased;
      color: var(--l10-text-main);
      line-height: 1.55;
    }
    .dark body { --l10-text-main: #e5e5e5; }
    #l10-page { 
      font-family: var(--l10-font-serif); /* Base serif for all reports */
      font-size: 16.5px; /* Standard Report Size */
    }

    .brand-logo {
      font-family: var(--l10-font-brand);
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    /* CODEX THEME: Only active when body has class .l10-codex-mode (Methods Pages) */
    body.l10-codex-mode {
      /* Light mode defaults */
      --l10-codex-text: #404040; /* neutral-700 */
      --l10-codex-strong: #171717; /* neutral-900 */
      --l10-codex-h1: #0a0a0a; /* neutral-950 */
      --l10-codex-subhead: #525252; /* neutral-600 */
      --l10-codex-border: #d4d4d4; /* neutral-300 */
      --l10-codex-td: #262626; /* neutral-800 */
      --l10-codex-code-bg: #fafafa; /* neutral-50 */
      --l10-codex-code-border: #e5e5e5; /* neutral-200 */
    }
    .dark body.l10-codex-mode {
      /* Dark mode overrides */
      --l10-codex-text: #a3a3a3; /* neutral-400 */
      --l10-codex-strong: #e5e5e5; /* neutral-200 */
      --l10-codex-h1: #ffffff;
      --l10-codex-subhead: #737373; /* neutral-500 */
      --l10-codex-border: #262626; /* neutral-800 */
      --l10-codex-td: #d4d4d4; /* neutral-300 */
      --l10-codex-code-bg: #0a0a0a; /* neutral-950 */
      --l10-codex-code-border: #262626; /* neutral-800 */
    }

    /* Light-mode overrides for "dark-first" Tailwind utilities used in methods pages. */
    html:not(.dark) body.l10-codex-mode #l10-page .text-white { color: #0a0a0a !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .text-neutral-200 { color: #171717 !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .text-neutral-300 { color: #262626 !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .text-neutral-400 { color: #404040 !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .text-neutral-500 { color: #525252 !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .text-neutral-600 { color: #525252 !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .text-neutral-700 { color: #404040 !important; }

    html:not(.dark) body.l10-codex-mode #l10-page .border-neutral-800 { border-color: #e5e5e5 !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .border-neutral-900 { border-color: #e5e5e5 !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .divide-neutral-900 > :not([hidden]) ~ :not([hidden]) { border-color: #e5e5e5 !important; }

    html:not(.dark) body.l10-codex-mode #l10-page .bg-neutral-950 { background-color: #ffffff !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .bg-neutral-900 { background-color: #ffffff !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .bg-neutral-900\\/50 { background-color: rgba(0,0,0,0.04) !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .bg-neutral-900\\/20 { background-color: rgba(0,0,0,0.03) !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .bg-neutral-900\\/10 { background-color: rgba(0,0,0,0.02) !important; }
    html:not(.dark) body.l10-codex-mode #l10-page .bg-neutral-800 { background-color: rgba(0,0,0,0.12) !important; }

    body.l10-codex-mode #l10-page { 
      font-family: var(--l10-font-serif); 
      font-size: 0.8rem !important; /* ~12.8px (Exact match to slides) */
      line-height: 1.5 !important;   /* Tighter spacing (Exact match to slides) */
      color: var(--l10-codex-text) !important;
      font-weight: 300;
      max-width: 900px !important; 
      margin-right: auto; 
    }
    
    /* Ensure bold text pops against the muted grey */
    body.l10-codex-mode strong, body.l10-codex-mode b {
        color: var(--l10-codex-strong);
        font-weight: 700;
    }
    
    body.l10-codex-mode .font-display {
        font-family: var(--l10-font-display) !important; /* Keep Brand font for Logo/Nav */
    }

    /* Codex Headers - Only in Codex Mode */
    /* Increased Specificity to override report.css .research-title [0-2-0] */
    body.l10-codex-mode #l10-page h1,
    body.l10-codex-mode #l10-page .research-title { 
      font-family: var(--l10-font-serif) !important; 
      letter-spacing: -0.01em;
      font-weight: 300 !important; /* font-light */
      font-size: 2.25rem !important; /* text-4xl */
      line-height: 2.5rem !important; /* text-4xl */
      color: var(--l10-codex-h1) !important;
      margin-top: 1.5rem !important;
      margin-bottom: 2rem !important; /* mb-8 match */
      padding-bottom: 1rem !important; /* border-b match */
      border-bottom: 1px solid var(--l10-codex-border) !important;
      text-transform: none !important;
    }

    /* Sub-Headers (System Map Style) */
    body.l10-codex-mode #l10-page h2, 
    body.l10-codex-mode #l10-page h3,
    body.l10-codex-mode #l10-page h4 { 
      font-family: var(--l10-font-mono) !important; 
      font-size: 11.5px !important;
      font-weight: 400 !important;
      color: var(--l10-codex-subhead) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      margin-top: 2rem !important;
      margin-bottom: 0.5rem !important;
      border-bottom: none !important;
      padding-bottom: 0 !important;
    }

    /* Body Text (The 'Serif Dense' Look) */
    body.l10-codex-mode #l10-page p,
    body.l10-codex-mode #l10-page li {
        font-family: var(--l10-font-serif) !important;
        font-size: 0.8rem !important; /* ~12.8px */
        line-height: 1.5 !important;
         color: var(--l10-codex-text) !important;
        margin-bottom: 1rem !important;
    }

    /* Codex Tables - Strict "Spec Sheet" Look */
    body.l10-codex-mode table,
    body.l10-codex-mode thead,
    body.l10-codex-mode tbody,
    body.l10-codex-mode th,
    body.l10-codex-mode td {
        font-family: var(--l10-font-mono) !important;
        font-size: 11.5px !important; /* Slide match approx */
         border-color: var(--l10-codex-border) !important;
    }

    body.l10-codex-mode th {
         color: var(--l10-codex-subhead) !important;
        font-weight: 400 !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 4px 8px !important;
        border-bottom: 1px solid #333 !important;
    }

    body.l10-codex-mode td {
        padding: 4px 8px !important;
         color: var(--l10-codex-td) !important;
    }
    
    /* Code/Pre blocks - Sunken Look */
    body.l10-codex-mode pre, 
    body.l10-codex-mode code {
         background-color: var(--l10-codex-code-bg) !important;
         border: 1px solid var(--l10-codex-code-border) !important;
        border-radius: 4px !important;
        font-family: var(--l10-font-mono) !important;
        font-size: 11.5px !important;
    }

    /* Professional "Document" Header Scaling */
    /* Professional "Document" Header Scaling — ONLY in codex mode */
    body.l10-codex-mode h1, body.l10-codex-mode .text-4xl { 
      font-size: 24px !important;
      font-weight: 600 !important;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
      margin-bottom: 24px;
    }
    body.l10-codex-mode .light h1 { border-bottom-color: #e5e5e5; }

    body.l10-codex-mode h2, body.l10-codex-mode .text-3xl { 
      font-size: 18px !important;
      font-weight: 500 !important;
      color: #a3a3a3 !important;
      margin-top: 32px;
      margin-bottom: 12px;
      border-bottom: 1px dotted #333;
      padding-bottom: 4px;
    }
    body.l10-codex-mode .light h2 { color: #525252 !important; border-bottom-color: #d4d4d4; }

    body.l10-codex-mode h3, body.l10-codex-mode .text-2xl { 
      font-size: 15px !important;
      font-weight: 600 !important;
      color: #e5e5e5 !important;
      margin-top: 24px;
      margin-bottom: 8px;
    }
    body.l10-codex-mode .light h3 { color: #171717 !important; }

    /* RESTORED: Original Sidebar Styling (Icons, Display Font) */
    .nav-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      margin-right: 12px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .sidebar-category-header {
      display: flex;
      align-items: center;
      padding: 0 1rem;
      margin-top: 2.5rem;
      margin-bottom: 0.75rem;
    }

    .sidebar-v1-group-text, .sidebar-v2-header-text {
      font-family: var(--l10-font-display);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #737373;
    }
    .dark .sidebar-v1-group-text, .dark .sidebar-v2-header-text { color: #a3a3a3; }

    .sidebar-v1-link, .sidebar-v2-link {
      display: block;
      padding: 0.5rem 1rem 0.5rem 3rem;
      font-size: 13px;
      color: #525252;
      border-radius: 6px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      margin-bottom: 2px;
      border-left: 3px solid transparent;
      font-family: var(--l10-font-sans); /* Ensure Sidebar is Sans */
    }
    .dark .sidebar-v1-link, .dark .sidebar-v2-link { color: #a2a2a2; }

    .sidebar-v1-link:hover, .sidebar-v2-link:hover {
      background-color: rgba(23, 23, 23, 0.03);
      color: #171717;
      border-left-color: #e5e5e5;
    }
    .dark .sidebar-v1-link:hover, .dark .sidebar-v2-link:hover {
      background-color: rgba(255, 255, 255, 0.03);
      color: #f5f5f5;
      border-left-color: #404040;
    }

    .sidebar-v1-active, .sidebar-v2-active {
      background-color: var(--active-brand-bg, rgba(0,0,0,0.03));
      color: var(--active-brand-color, #171717) !important;
      font-weight: 700;
      border-left-color: var(--active-brand-color, #171717) !important;
    }
    .dark .sidebar-v1-active, .dark .sidebar-v2-active {
      background-color: rgba(255, 255, 255, 0.04);
      color: var(--active-brand-color, #fff) !important;
      border-left-color: var(--active-brand-color, #f5f5f5) !important;
    }

    /* Academic layout specific header wrap */
    /* Academic layout specific header wrap */
    .sidebar-v2-header-wrap {
      display: flex;
      align-items: center;
      padding: 1.5rem 0.5rem 0.5rem 0.5rem;
      border-bottom: 2px solid #f0f0f0;
      margin-bottom: 0.75rem;
    }
    .dark .sidebar-v2-header-wrap { border-bottom-color: #262626; }

    /* Professional "Document" Header Scaling — ONLY in codex mode */
    body.l10-codex-mode h4, body.l10-codex-mode .text-xl { 
      font-family: var(--l10-font-mono) !important; /* Content Headers Mono */
      font-size: 13px !important;
      line-height: 1.4 !important;
      font-weight: 600 !important;
      margin-top: 1.5rem;
      text-transform: uppercase;
      color: #737373 !important;
    }

    /* For specific UI elements that should remain Sans-serif */
    .nav-link, .sidebar-link, .btn, .badge, .text-sm, .text-xs, .font-mono {
      font-family: var(--l10-font-sans) !important;
    }

    p, li { max-width: 72ch; } /* Scholarly line length */
    
    /* Scientific/Academic Offset Theme - ISOLATED to Research Layout */
    [data-l10-layout="research"] {
      --l10-bg-offset: #fcfcfc;
      --l10-accent-technical: #4f46e5; /* Indigo 600 */
      --l10-text-secondary: #4b5563;
    }

    [data-l10-layout="research"] body {
      background-color: var(--l10-bg-offset);
      line-height: 1.6; /* Tightened from 1.8 */
      font-feature-settings: "kern", "liga", "clig", "calt";
    }

    .dark [data-l10-layout="research"] {
      --l10-bg-offset: #0a0a0a;
      --l10-accent-technical: #818cf8; /* Indigo 400 */
      --l10-text-secondary: #9ca3af;
    }

    /* Full Serif for Research Content */
    [data-l10-layout="research"] #l10-page,
    [data-l10-layout="research"] .research-content {
      font-family: var(--l10-font-serif);
      font-size: 0.9rem; /* Reduced from 0.95rem (~14.4px) */
      color: #1a1a1a;
    }

    .dark [data-l10-layout="research"] #l10-page,
    .dark [data-l10-layout="research"] .research-content {
      color: #d1d5db;
    }

    /* Scholarly Title Treatment - Condensed for Monitor Density */
    [data-l10-layout="research"] .research-title {
      font-size: 1.75rem !important;
      font-weight: 700 !important;
      letter-spacing: -0.015em;
      line-height: 1.1 !important;
      margin-top: 0 !important;
      margin-bottom: 1.25rem; /* Reduced from 2.5rem */
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1.0rem; /* Reduced from 2.0rem */
      color: #111;
    }
    
    /* Condensed Header Container Override */
    [data-l10-layout="research"] header {
        margin-bottom: 2rem !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important; /* INHERIT container padding (Fixes Double Indent) */
        width: 100% !important;
        border-bottom: none; /* Let H1 handle it or remove checks */
    }

    /* Full-Width Responsive Container */
    /* Fixes "Right side stops" and "Mobile broken" */
    [data-l10-layout="research"] .research-content {
      width: 100% !important;
      max-width: 100% !important; /* Allow stretch to edge */
      margin-left: 0 !important;
      margin-right: 0 !important;
      /* 
         Data Inventory Reference: 604px Left (with 556px Sidebar) = ~48px gap.
         #l10-page handles the first 3rem (48px). 
         We set this to 0 to prevent double-padding (96px).
      */
      padding-left: 0 !important; 
      padding-right: 2rem;
      box-sizing: border-box !important;
    }
    
    /* Child Constraints for Readability (Instead of Container Constraint) */
    /* Only cap TEXT elements. Let DIVs, Tables, Images, etc. span full width. */
    [data-l10-layout="research"] .research-content > p,
    [data-l10-layout="research"] .research-content > ul,
    [data-l10-layout="research"] .research-content > ol,
    [data-l10-layout="research"] .research-content > blockquote,
    [data-l10-layout="research"] .research-content > li {
        margin-left: 0 !important;
        max-width: 72ch; /* Widened slightly from 65ch */
    }

    /* Titles can span wider if needed, or stick to prose width */
    [data-l10-layout="research"] .research-content h1,
    [data-l10-layout="research"] .research-content h2,
    [data-l10-layout="research"] .research-content h3,
    [data-l10-layout="research"] .research-content h4 {
        margin-left: 0 !important;
        max-width: 85ch; /* Headers slightly wider */
    }

    /* Explicitly UNCAP other elements */
    [data-l10-layout="research"] .research-content > div,
    [data-l10-layout="research"] .research-content > figure,
    [data-l10-layout="research"] .research-content > table,
    [data-l10-layout="research"] .research-content > pre,
    [data-l10-layout="research"] .research-content > img {
        max-width: 100% !important;
        width: 100%; /* Force full width availability */
        margin-left: 0 !important;
    }

    [data-l10-layout="research"] .research-content > blockquote {
        margin-left: 0 !important;
        border-left-width: 4px; /* Maintain blockquote style processing */
        padding-left: 1rem;
    }

    /* Content H2 Compression */
    [data-l10-layout="research"] .research-content h2 {
        margin-top: 2rem !important;
        max-width: 65ch;
    }

    /* RESPONSIVE: Mobile Adjustments */
    @media (max-width: 768px) {
        [data-l10-layout="research"] header,
        [data-l10-layout="research"] .research-content {
             padding-left: 1rem !important;
             padding-right: 1rem !important;
        }
    }
    
    .dark [data-l10-layout="research"] .research-title {
        border-color: #262626; /* neutral-800 */
        color: #f3f4f6;
    }

    /* KICKER / BREADCRUMB STYLE */
    .research-kicker {
        font-family: var(--l10-font-sans);
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #d97706; /* amber-600 */
        margin-bottom: 1rem;
    }
    .dark .research-kicker { color: #fbbf24; /* amber-400 */ }

    @media (max-width: 1024px) {
      [data-l10-layout="research"] .research-title {
        font-size: 2.25rem !important;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
      }
    }

    /* Scientific Accents for Sidebar */
    [data-l10-layout="research"] .sidebar-link-active,
    .l10-sidenav-research .sidebar-link-active {
        background: rgba(79, 70, 229, 0.05); /* Indigo tint */
        color: var(--l10-accent-technical) !important;
        font-weight: 600;
        border-left: 2px solid var(--l10-accent-technical);
        padding-left: 1rem;
    }

    [data-l10-layout="research"] .sidebar-v2-header-text,
    .l10-sidenav-research .sidebar-v2-header-text {
        font-family: var(--l10-font-serif);
        font-size: 13px;
        text-transform: none;
        letter-spacing: normal;
        font-weight: 700;
        color: #111;
    }
    .dark [data-l10-layout="research"] .sidebar-v2-header-text,
    .dark .l10-sidenav-research .sidebar-v2-header-text { color: #f3f4f6; }

    /* Benchmarks: side-nav is flat (no children), so make items larger. */
    .l10-sidenav-benchmarks .sidebar-v2-header-row {
        padding: 0.75rem 0.5rem;
        margin-bottom: 0.25rem;
    }

    .l10-sidenav-benchmarks .sidebar-v2-header-text {
        font-size: 18px;
    }

    .l10-sidenav-benchmarks .sidebar-v2-header-row .nav-icon-container {
        width: 32px !important;
        height: 32px !important;
    }

    .l10-sidenav-benchmarks .sidebar-v2-header-row .nav-icon-container svg {
        width: 18px !important;
        height: 18px !important;
    }

    [data-l10-layout="research"] .sidebar-v2-link,
    .l10-sidenav-research .sidebar-v2-link {
        font-family: var(--l10-font-serif);
        font-size: 14px;
        padding-left: 1rem;
        border-left: none;
        color: #4b5563;
    }
    .dark [data-l10-layout="research"] .sidebar-v2-link,
    .dark .l10-sidenav-research .sidebar-v2-link { color: #9ca3af; }

    [data-l10-layout="research"] .sidebar-research-group,
    .l10-sidenav-research .sidebar-research-group {
        font-family: var(--l10-font-serif);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--l10-text-secondary);
        margin-top: 2rem;
        margin-bottom: 0.75rem;
        padding-left: 1rem;
    }

    /* Subtle Notice Banner */
    .v22-notice {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-family: var(--l10-font-sans);
      font-size: 0.875rem;
    }
    .dark .v22-notice {
      background: rgba(30, 41, 59, 0.4);
      border-color: rgba(51, 65, 85, 0.5);
    }

    /* Benchmarks: de-blue the default Tailwind gray palette (gray-900/800 lean blue in dark mode). */
    .dark .l10-bench-page [class*="dark:bg-gray-950"],
    .dark .l10-bench-page [class*="dark:bg-neutral-950"] {
      background-color: #0a0a0a !important;
    }
    .dark .l10-bench-page [class*="dark:bg-gray-900"] {
      background-color: rgba(23, 23, 23, 0.4) !important; /* neutral-900/40 */
    }
    .dark .l10-bench-page [class*="dark:bg-gray-800"] {
      background-color: rgba(23, 23, 23, 0.6) !important; /* neutral-900/60 */
    }
    .dark .l10-bench-page [class*="dark:border-gray-800"],
    .dark .l10-bench-page [class*="dark:border-gray-700"],
    .dark .l10-bench-page [class*="dark:divide-gray-700"] {
      border-color: #262626 !important; /* neutral-800 */
    }

    /* Atomic pages: tables should read like Methodology spec sheets. */
    .l10-bench-atomic table {
      font-family: var(--l10-font-mono) !important;
      font-size: 12px !important;
    }
    .l10-bench-atomic thead th {
      font-size: 10px !important;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #737373 !important;
      font-weight: 700 !important;
    }
    .dark .l10-bench-atomic thead th {
      color: #a3a3a3 !important;
    }
  `;
  document.head.appendChild(style);

  // AUTO-DETECT CODEX MODE
  // Methods/Slides: enable Codex aesthetic + DOM normalization transforms.
  // Benchmarks: enable Codex typography only (keep page-level layout/components intact).
  const isCodexPage =
    isMethodsRoute(window.location.pathname) ||
    window.location.pathname.includes("/slides/");
  const isBenchmarksPage = isBenchmarksRoute(window.location.pathname);

  if (isCodexPage || isBenchmarksPage) {
    document.body.classList.add("l10-codex-mode");
  }

  if (isCodexPage) {
    // 1. Remove 'prose' to kill blog-style margins/colors
    const article = document.querySelector("article.prose");
    if (article) {
      article.classList.remove("prose", "prose-slate", "dark:prose-invert");
      article.style.maxWidth = "100%"; // Let #l10-page constrain it
    }

    // 2. Flatten Geometry (Kill 'rounded-xl', 'shadow-2xl')
    // We do this by swapping them for 'rounded' (4px) and 'border'
    document.querySelectorAll(".rounded-xl").forEach((el) => {
      el.classList.remove("rounded-xl", "shadow-2xl");
      el.classList.add("rounded", "border", "border-neutral-800");
      el.style.boxShadow = "none";
    });

    // 3. Fix Kicker Styling (The "Tiny Mono" Label)
    document.querySelectorAll(".research-kicker").forEach((el) => {
      el.style.fontFamily = "var(--l10-font-mono)";
      el.style.fontSize = "11px";
      el.style.textTransform = "uppercase";
      el.style.letterSpacing = "0.05em";
      el.style.color = "#737373";
      el.style.marginBottom = "8px";
      el.style.border = "none";
    });
  }

  setThemeFromStorage();
  applyBodyStyles();

  const page = document.getElementById("l10-page");
  if (!page) {
    throw new Error('Missing required element: <main id="l10-page">...</main>');
  }

  const layoutMode = getLayoutMode(page);
  const sideMode = getSideMode(page);
  const typographyMode = getTypographyMode(page);
  const sidePos = getSidenavPosition(page, { sideMode, typographyMode });
  const contentWidth = getContentWidth(page);
  const nav = await loadNav();

  l10Debug("[L10 Debug] mountShell:", {
    layoutMode,
    sideMode,
    typographyMode,
    sidePos,
    contentWidth,
    path: window.location.pathname,
  });

  // Top nav
  const topNav = document.createElement("nav");
  topNav.className =
    "font-sans border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-50";

  // Use same max-width as content area to align left edges
  const topInner = document.createElement("div");
  topInner.className = `${SHELL_CONTAINER_CLASSES} py-5 flex items-center justify-between relative`;

  // Mobile Menu Overlay & Drawer
  const mobileOverlay = document.createElement("div");
  mobileOverlay.className =
    "hidden fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[60] lg:hidden";

  const mobileDrawer = document.createElement("div");
  mobileDrawer.className =
    "fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-neutral-900 shadow-2xl z-[70] transform -translate-x-full transition-transform duration-300 lg:hidden flex flex-col";

  const drawerHeader = document.createElement("div");
  drawerHeader.className =
    "p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between";
  const drawerBrand = document.createElement("span");
  drawerBrand.className = "text-lg font-semibold tracking-tight text-neutral-900 dark:text-white brand-logo";
  drawerBrand.textContent = nav.brand?.title || "LegalChain";
  drawerHeader.appendChild(drawerBrand);

  const drawerClose = document.createElement("button");
  drawerClose.className =
    "p-2 -mr-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500";
  drawerClose.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
  drawerHeader.appendChild(drawerClose);
  mobileDrawer.appendChild(drawerHeader);

  const drawerContent = document.createElement("div");
  drawerContent.className = "flex-1 overflow-y-auto p-5 scrollbar-hide";
  mobileDrawer.appendChild(drawerContent);

  // Mobile drawer footer with Developers link
  const drawerFooter = document.createElement("div");
  drawerFooter.className =
    "p-5 border-t border-neutral-100 dark:border-neutral-800";
  const drawerDevLink = document.createElement("a");
  drawerDevLink.href = normalizeHref("/developers/");
  drawerDevLink.textContent = "Developers";
  drawerDevLink.className =
    "text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors";
  drawerFooter.appendChild(drawerDevLink);
  mobileDrawer.appendChild(drawerFooter);

  const toggleMobileMenu = (open) => {
    if (open) {
      mobileOverlay.classList.remove("hidden");
      setTimeout(() => mobileDrawer.classList.remove("-translate-x-full"), 10);
      document.body.style.overflow = "hidden";
    } else {
      mobileDrawer.classList.add("-translate-x-full");
      setTimeout(() => mobileOverlay.classList.add("hidden"), 300);
      document.body.style.overflow = "";
    }
  };

  drawerClose.onclick = () => toggleMobileMenu(false);
  mobileOverlay.onclick = () => toggleMobileMenu(false);

  const left = document.createElement("div");
  left.className = "flex items-center gap-4 lg:gap-8";

  const hamburger = document.createElement("button");
  hamburger.className =
    "p-2 -ml-2 rounded-lg lg:hidden hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300";
  hamburger.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`;
  hamburger.onclick = () => toggleMobileMenu(true);
  left.appendChild(hamburger);

  const brand = document.createElement("a");
  brand.href = normalizeHref(nav.brand?.href || "/");
  brand.className =
    "text-lg font-semibold tracking-tight text-neutral-900 dark:text-white shrink-0 brand-logo";
  brand.textContent = nav.brand?.title || "LegalChain";
  left.appendChild(brand);

  const topLinks = document.createElement("div");
  // Hide main links on mobile, use drawer instead
  topLinks.className = "hidden lg:flex items-center gap-6 text-sm font-medium";
  const topItems = Array.isArray(nav.top) ? nav.top : [];
  const homeTopItem = topItems.find(
    (item) =>
      item?.href === "/" ||
      item?.href === nav.brand?.href ||
      item?.title === nav.brand?.title
  );

  // Populating Mobile Drawer with flattened Primary Items
  const drawerTopSection = document.createElement("div");
  drawerTopSection.className = "mb-8";
  const drawerTopTitle = document.createElement("div");
  drawerTopTitle.className =
    "text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-4 px-1";
  drawerTopTitle.textContent = "Primary Sections";
  drawerTopSection.appendChild(drawerTopTitle);
  drawerContent.appendChild(drawerTopSection);

  // Build mobile links dynamically from nav.json top items
  for (const item of topItems) {
    if (!item?.title || !item?.href) continue;
    const ma = document.createElement("a");
    ma.href = normalizeHref(item.href);
    ma.textContent = item.title;
    ma.className =
      "flex items-center justify-between py-3 text-base font-medium text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800/60 transition-colors";
    if (
      hrefMatchesCurrentPath(item.href) ||
      (item.aliases && item.aliases.some((a) => hrefMatchesCurrentPath(a)))
    ) {
      ma.classList.add("text-indigo-600", "dark:text-indigo-400");
      ma.innerHTML += `<span class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>`;
    }
    ma.onclick = () => toggleMobileMenu(false);
    drawerTopSection.appendChild(ma);
  }

  for (const item of topItems) {
    if (homeTopItem && item === homeTopItem) continue;
    renderTopNavItem(topLinks, item);
  }

  left.appendChild(topLinks);

  const right = document.createElement("div");
  right.className = "flex items-center gap-4";

  const themeBtn = document.createElement("button");
  themeBtn.type = "button";
  themeBtn.id = "theme-toggle";
  themeBtn.title = "Toggle dark mode";
  themeBtn.className =
    "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors";
  themeBtn.innerHTML = `
    <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
    </svg>
    <svg class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
    </svg>
  `;
  themeBtn.addEventListener("click", toggleTheme);

  right.appendChild(themeBtn);

  // Admin: show logout next to the theme toggle.
  try {
    const isAdminRoute = /^\/admin(\/|$)/.test(
      String(window.location.pathname || "")
    );
    if (isAdminRoute) {
      const logout = document.createElement("a");
      logout.href = normalizeHref("/admin/logout.html");
      logout.title = "Logout";
      logout.className =
        "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-300";
      logout.innerHTML = `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      `;
      right.appendChild(logout);
    }
  } catch {}

  topInner.appendChild(left);
  topInner.appendChild(right);
  topNav.appendChild(topInner);

  // Layout: optional sidenav + content
  const layout = document.createElement("div");
  if (layoutMode === "two-col") {
    const isBenchmarksPage = isBenchmarksRoute(window.location.pathname);
    const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname);

    const maxWidth =
      isBenchmarksPage
        ? SHELL_MAX_WIDTH
        : typographyMode === "report"
        ? "max-w-6xl"
        : contentWidth === "narrow"
        ? "max-w-7xl"
        : SHELL_MAX_WIDTH;

    // Admin: 250px (Narrower). Benchmarks: 340px. Default: 300px.
    const sideColWidth = isBenchmarksPage ? "340px" : isAdmin ? "250px" : "300px";
    const gridPy = isBenchmarksPage ? "py-16" : "py-8";
    const gridGap = isBenchmarksPage ? "gap-12" : "gap-8";
    layout.className =
      sidePos === "right"
        ? `w-full ${maxWidth} mx-auto ${SHELL_PX} ${gridPy} grid grid-cols-1 lg:grid-cols-[1fr_${sideColWidth}] ${gridGap}`
        : `w-full ${maxWidth} mx-auto ${SHELL_PX} ${gridPy} grid grid-cols-1 lg:grid-cols-[${sideColWidth}_1fr] ${gridGap}`;

    const side = document.createElement("aside");
    const isReportToc = typographyMode === "report" && sideMode === "toc";
    const useResearchSidenav = isBenchmarksPage && sideMode !== "toc";
    
    if (isBenchmarksPage) {
      page.classList.add("l10-bench-page");
      if (
        window.location.pathname.includes("/benchmarks/atomic") ||
        window.location.pathname.includes("/benchmarks/l7")
      ) {
        page.classList.add("l10-bench-atomic");
      } else if (
        window.location.pathname.includes("/benchmarks/agentic") ||
        window.location.pathname.includes("/benchmarks/ag8")
      ) {
      page.classList.add("l10-bench-agentic");
      }
      page.style.width = "100%";
      // Keep benchmark content aligned with the sidebar gutter (no centering),
      // so the separator spacing matches the Methodology section.
      page.style.marginLeft = "0";
      page.style.marginRight = "0";
      page.style.maxWidth = contentWidth === "narrow" ? "56rem" : "80rem";
    }
    // w-full ensures sidebar fills grid cell, min-w-0 prevents content overflow from expanding it
    if (useResearchSidenav) {
      side.className =
        "hidden lg:block w-full min-w-0 h-fit sticky top-40 max-h-[calc(100vh-160px)] overflow-y-auto pr-4 border-r border-neutral-100 dark:border-neutral-800";
      side.classList.add("l10-sidenav-research");
      side.classList.add("l10-sidenav-benchmarks");
    } else if (isAdmin) {
      // Admin: Cleaner, unboxed sidebar (Flight Simulator vibes)
      side.className =
        "hidden lg:block w-full min-w-0 h-fit sticky top-28 pr-4 border-r border-neutral-200 dark:border-neutral-800 text-sm";
    } else {
      side.className =
        "hidden lg:block w-full min-w-0 border rounded-lg py-4 h-fit sticky top-28" +
        (isReportToc
          ? " bg-neutral-50/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-700 backdrop-blur-sm flex flex-col"
          : " bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700");
    }

    if (sideMode === "toc") {
      const sideTitle = document.createElement("div");
      sideTitle.className =
        "text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-4 pb-2";
      sideTitle.textContent = "Contents";
      side.appendChild(sideTitle);
    }

    if (sideMode === "toc") {
      const tocItems = buildTocItems(page).map((it) => ({
        title: it.title,
        href: it.href,
        level: it.level,
      }));

      const tocList = document.createElement("div");
      tocList.className = isReportToc
        ? "flex-1 min-h-0 max-h-[calc(100vh-14rem)] overflow-auto"
        : "";

      for (const item of tocItems) {
        if (!item?.href || !item?.title) continue;
        const a = document.createElement("a");
        a.href = item.href;
        a.textContent = item.title;
        a.className = sideTocLinkClasses(item.level);
        tocList.appendChild(a);
      }
      side.appendChild(tocList);

      if (isReportToc && tocItems.length >= 2) {
        const navBox = document.createElement("div");
        navBox.className =
          "mt-2 pt-2 px-4 border-t border-neutral-200 dark:border-neutral-700";

        const row = document.createElement("div");
        row.className = "flex items-center gap-2";

        const mkBtn = (label) => {
          const a = document.createElement("a");
          a.href = "#";
          a.textContent = label;
          a.className =
            "flex-1 text-center text-sm py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/30 hover:bg-white dark:hover:bg-neutral-900 transition-colors";
          return a;
        };

        const prev = mkBtn("← Prev");
        const next = mkBtn("Next →");
        row.appendChild(prev);
        row.appendChild(next);
        navBox.appendChild(row);
        side.appendChild(navBox);

        const setDisabled = (a, disabled) => {
          if (!a) return;
          if (disabled) {
            a.setAttribute("aria-disabled", "true");
            a.classList.add("opacity-50", "pointer-events-none");
          } else {
            a.removeAttribute("aria-disabled");
            a.classList.remove("opacity-50", "pointer-events-none");
          }
        };

        const update = (activeHref) => {
          const idx = tocItems.findIndex((it) => it.href === activeHref);
          const prevItem = idx > 0 ? tocItems[idx - 1] : null;
          const nextItem =
            idx >= 0 && idx < tocItems.length - 1 ? tocItems[idx + 1] : null;
          prev.href = prevItem ? prevItem.href : "#";
          next.href = nextItem ? nextItem.href : "#";
          setDisabled(prev, !prevItem);
          setDisabled(next, !nextItem);
        };

        update(tocItems[0].href);
        activateTocHighlight(side, {
          onActiveChange: (match) => update(`#${match.el.id}`),
        });
      } else {
        activateTocHighlight(side);
      }
    } else {
      // Find the active top nav item and use its side array
      const activeTopItem = findActiveTopNavItem(nav.top);
      l10Debug(
        "[L10 Debug] activeTopItem:",
        activeTopItem?.title || "NULL",
        "has side:",
        !!activeTopItem?.side,
        "side length:",
        activeTopItem?.side?.length || 0
      );
      const sideItems = activeTopItem?.side || [];
      const renderMode = useResearchSidenav ? "research" : layoutMode;

      if (useResearchSidenav) {
        const subnavPref = String(page.dataset.l10Subnav || "").toLowerCase();
        const allowKicker =
          subnavPref !== "none" && subnavPref !== "off" && subnavPref !== "false";
        const h1 = page.querySelector("h1");
        if (
          allowKicker &&
          h1 &&
          (!h1.previousElementSibling ||
            !h1.previousElementSibling.classList.contains("research-kicker"))
        ) {
          let kickerText = "";
          for (const group of sideItems) {
            if (sideItemIsActive(group)) {
              kickerText = String(group.title || "").trim();
              break;
            }
          }
          if (kickerText) {
            const kicker = document.createElement("div");
            kicker.className = "research-kicker";
            kicker.textContent = kickerText;
            h1.parentNode.insertBefore(kicker, h1);
          }
        }
      }

      // Render sidebar items directly (no section wrapper needed)
      renderSideNavFlat(side, sideItems, renderMode);

      // Also add to mobile drawer if it's the active section
      if (sideItems.length > 0) {
        const drawerSideSection = document.createElement("div");
        drawerSideSection.className =
          "mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800";
        const drawerSideTitle = document.createElement("div");
        drawerSideTitle.className =
          "text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3";
        drawerSideTitle.textContent = "Section Navigation";
        drawerSideSection.appendChild(drawerSideTitle);

        const drawerSideList = document.createElement("div");
        if (useResearchSidenav) {
          drawerSideList.classList.add("l10-sidenav-research");
        }
        renderSideNavFlat(drawerSideList, sideItems, renderMode);
        drawerSideSection.appendChild(drawerSideList);

        drawerContent.appendChild(drawerSideSection);
      }
    }

    const contentWrap = document.createElement("section");
    // min-w-0 prevents content from expanding grid cell beyond defined width
    const isBoxless =
      page.dataset.l10Boxless === "true" ||
      (useResearchSidenav && page.dataset.l10Boxless !== "false");
    contentWrap.className = isBoxless
      ? "w-full min-w-0"
      : "w-full min-w-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-8";
    if (typographyMode === "report") {
      ensureStylesheet(resolveShellAsset("report.css"));
      contentWrap.classList.add("l10-report");
      const w = parseInt(page.dataset.l10ReportWeight || "", 10);
      if (Number.isFinite(w) && w >= 200 && w <= 600) {
        contentWrap.style.setProperty("--l10-report-body-weight", String(w));
      }
    }
    contentWrap.appendChild(page);

    if (sidePos === "right") {
      layout.appendChild(contentWrap);
      layout.appendChild(side);
    } else {
      layout.appendChild(side);
      layout.appendChild(contentWrap);
    }
  } else if (layoutMode === "about") {
    // Compact two-column layout for About Us pages:
    // - Left: small section sidenav (from nav.json)
    // - Right: Responsive content width
    layout.className = `w-full max-w-7xl mx-auto ${SHELL_PX} grid grid-cols-1 lg:grid-cols-[12rem_minmax(0,1fr)] gap-8`;

    const side = document.createElement("aside");
    side.className =
      "hidden lg:block w-full min-w-0 h-fit sticky top-28 mt-24 pr-4 border-r border-neutral-200 dark:border-neutral-800";

    // Find the active top nav item and use its side array
    const activeTopItem = findActiveTopNavItem(nav.top);
    const sideItems = activeTopItem?.side || [];
    renderSideNavFlat(side, sideItems, "about");

    const contentWrap = document.createElement("section");
    contentWrap.className = "min-w-0";
    contentWrap.appendChild(page);

    layout.appendChild(side);
    layout.appendChild(contentWrap);

    // Also add to mobile drawer if it's the active section
    if (sideItems.length > 0) {
      const drawerSideSection = document.createElement("div");
      drawerSideSection.className =
        "mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800";
      const drawerSideTitle = document.createElement("div");
      drawerSideTitle.className =
        "text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3";
      drawerSideTitle.textContent = "Section Navigation";
      drawerSideSection.appendChild(drawerSideTitle);

      const drawerSideList = document.createElement("div");
      renderSideNavFlat(drawerSideList, sideItems, "about");
      drawerSideSection.appendChild(drawerSideList);
      drawerContent.appendChild(drawerSideSection);
    }
  } else if (layoutMode === "research") {
    // Transformer Circuits inspired "Scientific Paper" layout
    injectAcademicStyles();
    layout.className = "layout-research min-h-screen flex flex-col";

    const inner = document.createElement("div");
    inner.className = `${SHELL_CONTAINER_CLASSES} grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-12 py-16`;

    const side = document.createElement("aside");
    side.className =
      "hidden lg:block w-full sticky top-32 h-fit max-h-[calc(100vh-160px)] overflow-y-auto pr-8 border-r border-neutral-100 dark:border-neutral-800";

    // Find nav and render tree
    const activeTopItem = findActiveTopNavItem(nav.top);
    const sideItems = activeTopItem?.side || [];
    renderSideNavFlat(side, sideItems, "research");

    const main = document.createElement("section");
    main.className = "min-w-0 research-content";

    // Auto-apply research-title class to any H1 found in page
    const h1 = page.querySelector("h1");
    if (h1) {
        h1.classList.add("research-title");
        
        // AUTO-INJECT KICKER (Breadcrumb)
        // If the h1 doesn't already have a kicker before it, add one based on active section
        if (!h1.previousElementSibling || !h1.previousElementSibling.classList.contains("research-kicker")) {
             // Find active "side" parent group
             const activeGroup = nav.top.find(item => item.side && item.side.some(group => 
                sideItemIsActive(group) || (group.children && group.children.some(child => hrefMatchesCurrentPath(child.href)))
             ));
             
             // Or typically simpler: find the top level item title
             const topTitle = activeTopItem?.title;
             // Ideally we want the Sidebar Group Title (e.g. "Data & Corpus")
             // Search sideItems for the one containing current page if possible, or just use Top Title
             let kickerText = topTitle;
             
             // Try to find specific sidebar group
             const sideGroups = activeTopItem?.side || [];
             for(const group of sideGroups) {
                 if(sideItemIsActive(group)) {
                     kickerText = group.title; // e.g. "Data & Corpus"
                     break;
                 }
             }

             if(kickerText) {
                 const kicker = document.createElement("div");
                 kicker.className = "research-kicker";
                 kicker.textContent = kickerText;
                 h1.parentNode.insertBefore(kicker, h1);
             }
        }
    }

    main.appendChild(page);

    inner.appendChild(side);
    inner.appendChild(main);
    layout.appendChild(inner);

    // Also add to mobile drawer for research layout
    if (sideItems.length > 0) {
      const drawerSideSection = document.createElement("div");
      drawerSideSection.className =
        "mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800";
      const drawerSideTitle = document.createElement("div");
      drawerSideTitle.className =
        "text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3";
      drawerSideTitle.textContent = "Section Navigation";
      drawerSideSection.appendChild(drawerSideTitle);

      const drawerSideList = document.createElement("div");
      renderSideNavFlat(drawerSideList, sideItems, "research");
      drawerSideSection.appendChild(drawerSideList);
      drawerContent.appendChild(drawerSideSection);
    }
  } else if (layoutMode === "dashboard") {
    injectDashboardStyles();
    layout.className = "layout-dashboard min-h-screen";

    const inner = document.createElement("div");
    inner.className = "dashboard-inner min-h-screen";

    const side = document.createElement("aside");
    const activeTopItem = findActiveTopNavItem(nav.top);
    const sideItems = activeTopItem?.side || [];
    renderSideNavFlat(side, sideItems, "dashboard");

    const main = document.createElement("main");
    main.className = "main-content";
    main.appendChild(page);

    const right = document.createElement("aside");
    right.className = "hidden xl:block border-l border-neutral-800 p-6";
    right.innerHTML =
      "<h4 class='text-xs font-bold uppercase text-neutral-500 mb-4'>System Status</h4><div class='technical-card'><h4>Build Info</h4>v4.2.0-experimental<br>Status: STABLE<br>Integrity: 100%</div>";

    inner.appendChild(side);
    inner.appendChild(main);
    inner.appendChild(right);
    layout.appendChild(inner);
  } else if (layoutMode === "journal") {
    injectJournalStyles();
    layout.className = "layout-journal min-h-screen";

    const inner = document.createElement("div");
    inner.className = `${SHELL_CONTAINER_CLASSES} journal-inner py-16`;

    const navCol = document.createElement("aside");
    navCol.className = "journal-nav hidden lg:block";
    const activeTopItem = findActiveTopNavItem(nav.top);
    const sideItems = activeTopItem?.side || [];
    renderSideNavFlat(navCol, sideItems, "research"); // Reuse research style links for academic look

    const main = document.createElement("article");
    main.appendChild(page);

    const side = document.createElement("aside");
    side.className = "journal-marginalia hidden md:block";
    side.innerHTML =
      "<strong>Review Status</strong>: Peer Reviewed<br><strong>License</strong>: CC BY-SA 4.0<br><br><em>Note: This document follows technical reporting standards for AI legal benchmark transparency.</em>";

    inner.appendChild(navCol);
    inner.appendChild(main);
    inner.appendChild(side);
    layout.appendChild(inner);
  } else if (layoutMode === "article") {
    // Article layout: centered content with right-hand TOC (no left sidebar)
    layout.className = `${SHELL_CONTAINER_CLASSES} py-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8`;

    const contentWrap = document.createElement("section");
    const isBoxless = page.dataset.l10Boxless === "true";
    contentWrap.className = isBoxless
      ? "w-full"
      : "w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-8 max-w-4xl";
    if (typographyMode === "report") {
      ensureStylesheet(resolveShellAsset("report.css"));
      contentWrap.classList.add("l10-report");
    }
    contentWrap.appendChild(page);

    // Build right-hand TOC
    const toc = document.createElement("aside");
    toc.className =
      "hidden lg:block h-fit sticky top-28 border rounded-lg py-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700";

    const tocTitle = document.createElement("div");
    tocTitle.className =
      "text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-4 pb-2";
    tocTitle.textContent = "Contents";
    toc.appendChild(tocTitle);

    // Only show h2 headings in article TOC (keeps it concise)
    const tocItems = buildTocItems(page).filter((it) => it.level === "h2");
    for (const item of tocItems) {
      if (!item?.href || !item?.title) continue;
      const a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.title;
      a.className = sideTocLinkClasses("h2");
      toc.appendChild(a);
    }
    activateTocHighlight(toc);

    layout.appendChild(contentWrap);
    layout.appendChild(toc);
  } else {
    if (layoutMode === "center") {
      layout.className = `${SHELL_CONTAINER_CLASSES} py-8`;
      const contentWrap = document.createElement("section");
      contentWrap.className =
        "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6";
      if (typographyMode === "report") {
        ensureStylesheet(resolveShellAsset("report.css"));
        contentWrap.classList.add("l10-report");
      }
      contentWrap.appendChild(page);
      layout.appendChild(contentWrap);
    } else {
      if (typographyMode === "report") {
        ensureStylesheet(resolveShellAsset("report.css"));
        page.classList.add("l10-report");
      }

      // wide (default): don't wrap, so pages can control their own width/padding.
      layout.className = "";
      layout.appendChild(page);
    }
  }

  // Mount - use flex column with min-h-screen to push footer to bottom
  const shell = document.createElement("div");
  shell.id = "l10-shell-mount";
  shell.dataset.l10ShellVersion = "1";
  shell.className = "flex flex-col min-h-screen";
  topNav.classList.add("flex-shrink-0");
  layout.classList.add("flex-grow");
  shell.appendChild(topNav);
  shell.appendChild(layout);

  // Clear existing shell if prepended by accident or manual
  const existing = document.getElementById("l10-shell-mount") || document.getElementById("site-shell");
  if (existing) existing.remove();

  // Footer (always)
  const footer = document.createElement("footer");
  footer.className =
    "font-sans flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";

  const footerInner = document.createElement("div");
  // Use same max-width as top nav and content area for consistent alignment
  footerInner.className = `${SHELL_CONTAINER_CLASSES} py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm text-gray-600 dark:text-gray-400`;

  const leftFoot = document.createElement("div");
  leftFoot.className = "flex items-center gap-1";
  leftFoot.innerHTML = `© ${new Date().getFullYear()} <span class="font-semibold tracking-tight brand-logo">${
    nav.brand?.title || "LegalChain"
  }</span>`;

  const rightFoot = document.createElement("div");
  rightFoot.className = "flex items-center gap-4";

  // Developers link
  const devLink = document.createElement("a");
  devLink.href = normalizeHref("/developers/");
  devLink.textContent = "Developers";
  devLink.className =
    "hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors";
  rightFoot.appendChild(devLink);

  // Hugging Face icon
  if (nav.huggingface?.href) {
    const hf = document.createElement("a");
    hf.href = nav.huggingface.href;
    hf.target = "_blank";
    hf.rel = "noreferrer";
    hf.title = "Hugging Face";
    hf.className =
      "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100";
    hf.innerHTML = `
      <svg class="w-5 h-5" viewBox="0 0 120 120" fill="currentColor" aria-hidden="true">
        <path d="M37.4 48.6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm45.2 0c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zM60 0C26.9 0 0 26.9 0 60s26.9 60 60 60 60-26.9 60-60S93.1 0 60 0zm0 110c-27.6 0-50-22.4-50-50S32.4 10 60 10s50 22.4 50 50-22.4 50-50 50zm23.8-62c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10zm-47.6 0c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10zm47.6 32c0 11-10.5 20-23.8 20s-23.8-9-23.8-20h47.6z"/>
      </svg>
    `;
    rightFoot.appendChild(hf);
  }

  // GitHub icon
  if (nav.github?.href) {
    const gh = document.createElement("a");
    gh.href = nav.github.href;
    gh.target = "_blank";
    gh.rel = "noreferrer";
    gh.title = "GitHub";
    gh.className =
      "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100";
    gh.innerHTML = `
      <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
      </svg>
    `;
    rightFoot.appendChild(gh);
  }

  // Email icon
  if (nav.email) {
    const em = document.createElement("a");
    em.href = `mailto:${nav.email}`;
    em.title = "Email";
    em.className =
      "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100";
    em.innerHTML = `
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
      </svg>
    `;
    rightFoot.appendChild(em);
  }

  footerInner.appendChild(leftFoot);
  footerInner.appendChild(rightFoot);
  footer.appendChild(footerInner);

  shell.appendChild(footer);
  document.body.prepend(shell);
  document.body.appendChild(mobileOverlay);
  document.body.appendChild(mobileDrawer);

  // Process any includes present in the initial page or layout
  await processIncludes();

  // =====================================================
  // AUTO PREV/NEXT NAVIGATION FOR METHODOLOGY PAGES
  // =====================================================
  if (isMethodsRoute(window.location.pathname)) {
    injectPrevNextNav(nav);
  }
}

/**
 * Inject standardized prev/next navigation at the bottom of methodology pages.
 * Uses section colors from the sidebar menu.
 */
function injectPrevNextNav(nav) {
  // Section colors matching the sidebar icons
  const sectionColors = {
    "Start Here": "amber",
    "Data & Corpus": "blue",
    "Evaluation Pipeline": "indigo",
    "Scoring & Judging": "purple",
    "Artifacts & Reproducibility": "amber",
    "Validation Checks": "emerald",
    "Roadmap & Legacy": "yellow"
  };

  // Flatten nav structure into linear page order with section info
  const methodologyNav = nav.top?.find(t => t.title === "Methodology");
  if (!methodologyNav?.side) return;

  const pages = [];
  for (const section of methodologyNav.side) {
    const sectionTitle = section.title;
    const color = sectionColors[sectionTitle] || "blue";

    // Add section header page
    const children = Array.isArray(section.children) ? section.children : [];
    const headerHref = section.href;
    const headerDuplicatesChild =
      headerHref && children.some((child) => child?.href === headerHref);

    // If the section "header" href points at a child page (common pattern for groups),
    // don't include the header as a separate page in prev/next order — it creates self-links.
    if (headerHref && !headerDuplicatesChild) {
      pages.push({
        title: section.title,
        href: headerHref,
        section: sectionTitle,
        color,
      });
    }

    // Add children
    for (const child of children) {
      pages.push({
        title: child.title,
        href: child.href,
        section: sectionTitle,
        color,
      });
    }
  }

  // Find current page
  const currentPath = window.location.pathname;
  const currentIndex = pages.findIndex((p) => p?.href && hrefMatchesCurrentPath(p.href));

  console.log("[L10 Debug] PrevNext:", { currentPath, currentIndex, totalPages: pages.length });

  if (currentIndex === -1) return;

  const prev = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const next = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

  if (!prev && !next) return;

  // Remove existing footer nav patterns (all 10+ types we found)
  const article = document.querySelector("article.research-content, article");
  if (!article) return;

  // Find and remove ALL existing manual footers
  // Pattern 1: <footer> elements with border-t
  article.querySelectorAll('footer[class*="border-t"]').forEach(el => el.remove());

  // Pattern 2: <div> elements with mt-16/mt-20/mt-24 and border-t (navigation footers)
  article.querySelectorAll('div[class*="mt-16"][class*="border-t"], div[class*="mt-20"][class*="border-t"], div[class*="mt-24"][class*="border-t"]').forEach(el => el.remove());

  console.log("[L10 Debug] Removed existing footers");

  // Color classes for Tailwind
  const colorClasses = {
    blue: { text: "text-blue-500", border: "border-blue-500/30", hover: "hover:border-blue-500" },
    indigo: { text: "text-indigo-500", border: "border-indigo-500/30", hover: "hover:border-indigo-500" },
    purple: { text: "text-purple-500", border: "border-purple-500/30", hover: "hover:border-purple-500" },
    amber: { text: "text-amber-500", border: "border-amber-500/30", hover: "hover:border-amber-500" },
    emerald: { text: "text-emerald-500", border: "border-emerald-500/30", hover: "hover:border-emerald-500" },
    rose: { text: "text-rose-500", border: "border-rose-500/30", hover: "hover:border-rose-500" }
  };

  // Build nav HTML
  const navContainer = document.createElement("div");
  navContainer.className = "mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-2 gap-4 not-prose";

  // Previous link
  if (prev) {
    const c = colorClasses[prev.color] || colorClasses.blue;
    const prevLink = document.createElement("a");
    prevLink.href = normalizeHref(prev.href);
    prevLink.className = `group p-4 border ${c.border} ${c.hover} rounded-lg transition-colors`;
    prevLink.innerHTML = `
      <div class="text-[10px] font-mono ${c.text} uppercase tracking-widest mb-1">← Previous</div>
      <div class="font-serif text-neutral-900 dark:text-white group-hover:${c.text.replace('text-', '')} transition-colors">${prev.title}</div>
    `;
    navContainer.appendChild(prevLink);
  } else {
    navContainer.appendChild(document.createElement("div")); // Empty placeholder
  }

  // Next link
  if (next) {
    const c = colorClasses[next.color] || colorClasses.blue;
    const nextLink = document.createElement("a");
    nextLink.href = normalizeHref(next.href);
    nextLink.className = `group p-4 border ${c.border} ${c.hover} rounded-lg transition-colors text-right`;
    nextLink.innerHTML = `
      <div class="text-[10px] font-mono ${c.text} uppercase tracking-widest mb-1">Next →</div>
      <div class="font-serif text-neutral-900 dark:text-white group-hover:${c.text.replace('text-', '')} transition-colors">${next.title}</div>
    `;
    navContainer.appendChild(nextLink);
  } else {
    navContainer.appendChild(document.createElement("div")); // Empty placeholder
  }

  article.appendChild(navContainer);
}

window.l10 = window.l10 || {};
window.l10.SHELL_BASE = SHELL_BASE;
window.l10.SITE_BASE = SITE_BASE;
window.l10.normalizeHref = normalizeHref;

window.l10ShellReady = mountShell();
window.l10ShellReady.catch((err) => {
  console.error(err);
  const banner = document.createElement("div");
  banner.className = "p-3 bg-red-100 text-red-900 border-b border-red-200";
  banner.style.whiteSpace = "pre-wrap";
  banner.textContent = `LegalChain shell failed to load: ${String(
    err?.message || err
  )}`;
  document.body.prepend(banner);
});
