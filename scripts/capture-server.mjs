#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const skillScriptsDir = path.join(
  repoRoot,
  "docs",
  "skills",
  "design-1-layouts-spec-with-playwright",
  "scripts"
);
const capturesJsonPath = path.join(repoRoot, "docs", "design-layouts", "captures.json");

const PORT = Number(process.env.CAPTURE_SERVER_PORT || "4488");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readCaptures() {
  if (!fs.existsSync(capturesJsonPath)) return [];
  return JSON.parse(fs.readFileSync(capturesJsonPath, "utf8"));
}

function writeCaptures(entries) {
  ensureDir(path.dirname(capturesJsonPath));
  fs.writeFileSync(capturesJsonPath, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function resolvePlaywright() {
  const candidates = [process.cwd(), repoRoot, path.join(repoRoot, "web"), path.join(repoRoot, "web-docs")];
  for (const basePath of candidates) {
    try {
      return require(require.resolve("playwright", { paths: [basePath] }));
    } catch {
      // keep trying
    }
  }
  throw new Error("Unable to resolve 'playwright'. Install it in the workspace.");
}

function updateCaptureStatus(id, status, capturedAt = null) {
  const captures = readCaptures();
  const entry = captures.find((c) => c.id === id);
  if (entry) {
    entry.status = status;
    if (capturedAt) entry.capturedAt = capturedAt;
    writeCaptures(captures);
  }
}

/* ------------------------------------------------------------------ */
/*  Auth sessions — headed browser kept open for manual login          */
/* ------------------------------------------------------------------ */

// Map<captureId, { browser, context, page, storageStatePath, entry }>
const authSessions = new Map();

async function startAuthSession(id, entry, targetUrl, storageStatePath, width, height) {
  const playwright = resolvePlaywright();
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: "load" });

  authSessions.set(id, { browser, context, page, storageStatePath, entry });
  console.log(`[auth] Headed browser opened for ${targetUrl} — waiting for login`);
}

async function completeAuthSession(id) {
  const session = authSessions.get(id);
  if (!session) throw new Error(`No auth session for capture '${id}'`);

  const { browser, context, storageStatePath } = session;

  // Save storageState from the context the user logged into
  ensureDir(path.dirname(storageStatePath));
  await context.storageState({ path: storageStatePath });
  console.log(`[auth] Storage state saved to ${storageStatePath}`);

  await browser.close();
  authSessions.delete(id);
}

/* ------------------------------------------------------------------ */
/*  Capture logic                                                      */
/* ------------------------------------------------------------------ */

async function loadMeasureModule() {
  return import(pathToFileURL(path.join(skillScriptsDir, "measure-layout.mjs")).href);
}

async function startCapture(body) {
  const { url, width = 1920, height = 1080, theme = "light", pageType = "settings" } = body;
  if (!url) throw new Error("Missing required field: url");

  const mod = await loadMeasureModule();
  const slug = mod.deriveCaptureSlug(url);
  const outputDir = mod.deriveDefaultOutputDir({ repoRoot, targetUrl: url, width, height });
  const storageStatePath = mod.deriveAuthStatePath({ repoRoot, targetUrl: url });
  const id = `${slug}--${width}x${height}--${theme}--${pageType}`;

  const entry = {
    id,
    name: slug,
    url,
    viewport: `${width}x${height}`,
    theme,
    pageType,
    capturedAt: null,
    outputDir: path.relative(path.join(repoRoot, "docs", "design-layouts"), outputDir),
    status: "pending",
  };

  // Upsert captures index
  const captures = readCaptures();
  const existingIdx = captures.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    captures[existingIdx] = { ...captures[existingIdx], ...entry };
  } else {
    captures.push(entry);
  }
  writeCaptures(captures);

  // Check storageState
  const hasAuth = fs.existsSync(storageStatePath);

  if (!hasAuth) {
    updateCaptureStatus(id, "auth-needed");
    await startAuthSession(id, entry, url, storageStatePath, width, height);
    return {
      id,
      status: "auth-needed",
      message: `Headed browser opened for ${new URL(url).hostname}. Log in, then click "Auth Complete".`,
    };
  }

  // Auth exists — run capture
  return runCapture(id, entry, { url, width, height, theme, storageStatePath, outputDir });
}

async function runCapture(id, entry, options) {
  updateCaptureStatus(id, "capturing");
  console.log(`[capture] Starting ${id} → ${options.url} at ${options.width}x${options.height} theme=${options.theme}`);

  try {
    const mod = await loadMeasureModule();

    // Build measureLayout options — translate "both" → captureBothThemes
    const measureOptions = {
      url: options.url,
      width: String(options.width),
      height: String(options.height),
      storageStatePath: options.storageStatePath,
      outputDir: options.outputDir,
    };

    if (options.theme === "both") {
      measureOptions.captureBothThemes = "true";
    } else if (options.theme === "light" || options.theme === "dark") {
      measureOptions.theme = options.theme;
    }
    // else: omit theme → defaults to "system"

    await mod.measureLayout(measureOptions);

    const capturedAt = new Date().toISOString();
    updateCaptureStatus(id, "complete", capturedAt);
    console.log(`[capture] Complete: ${id}`);
    return { id, status: "complete" };
  } catch (err) {
    updateCaptureStatus(id, "failed");
    console.error(`[capture] Failed: ${id}`, err.message);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  HTTP routes                                                        */
/* ------------------------------------------------------------------ */

async function handleRequest(req, res) {
  const { method } = req;
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    // GET /captures — list all
    if (method === "GET" && pathname === "/captures") {
      sendJson(res, 200, readCaptures());
      return;
    }

    // POST /capture — start new capture
    if (method === "POST" && pathname === "/capture") {
      const body = await readBody(req);
      const result = await startCapture(body);
      sendJson(res, 200, result);
      return;
    }

    // POST /auth-complete — user finished login in headed browser
    if (method === "POST" && pathname === "/auth-complete") {
      const body = await readBody(req);
      const { id } = body;

      if (!authSessions.has(id)) {
        sendJson(res, 404, { error: `No active auth session for capture '${id}'` });
        return;
      }

      // Save storageState and close headed browser
      const session = authSessions.get(id);
      await completeAuthSession(id);

      // Now run the actual capture with saved auth
      const entry = session.entry;
      const mod = await loadMeasureModule();
      const [w, h] = entry.viewport.split("x").map(Number);
      const outputDir = mod.deriveDefaultOutputDir({ repoRoot, targetUrl: entry.url, width: w, height: h });

      const result = await runCapture(id, entry, {
        url: entry.url,
        width: w,
        height: h,
        theme: entry.theme,
        storageStatePath: session.storageStatePath,
        outputDir,
      });

      sendJson(res, 200, result);
      return;
    }

    // GET /status/:id — check single capture
    if (method === "GET" && pathname.startsWith("/status/")) {
      const id = decodeURIComponent(pathname.slice("/status/".length));
      const captures = readCaptures();
      const entry = captures.find((c) => c.id === id);
      if (!entry) {
        sendJson(res, 404, { error: "Capture not found" });
        return;
      }
      sendJson(res, 200, entry);
      return;
    }

    // GET /files/* — serve captured files (screenshots, reports)
    if (method === "GET" && pathname.startsWith("/files/")) {
      const designLayoutsDir = path.join(repoRoot, "docs", "design-layouts");
      const relativePath = decodeURIComponent(pathname.slice("/files/".length));
      const filePath = path.resolve(designLayoutsDir, relativePath);

      // Security: ensure resolved path is inside design-layouts
      if (!filePath.startsWith(designLayoutsDir) || relativePath.includes("..")) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        sendJson(res, 404, { error: "File not found" });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
      };

      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(`[server] Error:`, err.message);
    sendJson(res, 500, { error: err.message });
  }
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\nCapture server running on http://localhost:${PORT}`);
  console.log(`  GET  /captures        — list all captures`);
  console.log(`  POST /capture         — start new { url, width, height, theme, pageType }`);
  console.log(`  POST /auth-complete   — signal login done { id }`);
  console.log(`  GET  /status/:id      — check one capture\n`);
});
