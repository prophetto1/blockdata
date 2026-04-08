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
const capturesRoot = path.join(repoRoot, "docs", "design-layouts");
const skillScriptsDir = path.join(
  repoRoot,
  "docs",
  "jon",
  "skills",
  "design-1-layouts-spec-with-playwright",
  "scripts"
);
const capturesJsonPath = path.join(capturesRoot, "captures.json");

const PORT = Number(process.env.CAPTURE_SERVER_PORT || "4488");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readCaptures() {
  if (!fs.existsSync(capturesJsonPath)) return [];
  const raw = fs.readFileSync(capturesJsonPath, "utf8");
  const trimmed = String(raw).trim();
  let capturesJsonText = trimmed;
  let captures;

  try {
    captures = JSON.parse(capturesJsonText);
  } catch (error) {
    // Backward-compatibility repair for accidental writes that stored escaped newlines
    // as literal "\\n" characters (for example `[]\\n`), which breaks JSON.parse.
    while (capturesJsonText.endsWith("\\n")) {
      capturesJsonText = capturesJsonText.slice(0, -2);
    }
    try {
      captures = JSON.parse(capturesJsonText);
      console.warn(`[capture] Repaired captures.json after detecting escaped newline corruption at ${capturesJsonPath}`);
      writeCaptures(captures);
    } catch {
      throw new Error(`Invalid captures.json: ${(error && error.message) || "Unknown JSON parse error"}`);
    }
  }

  return captures.map((entry) => ({
    ...entry,
    outputDir: typeof entry.outputDir === "string" ? entry.outputDir.replace(/\\/g, "/") : entry.outputDir,
    status:
      entry.status === "complete" &&
      (typeof entry.outputDir !== "string" || !fs.existsSync(path.join(capturesRoot, entry.outputDir.replace(/\\/g, "/"))))
        ? "failed"
        : entry.status,
  }));
}

function writeCaptures(entries) {
  ensureDir(path.dirname(capturesJsonPath));
  fs.writeFileSync(capturesJsonPath, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

async function deleteCapture(id) {
  const captures = readCaptures();
  const index = captures.findIndex((entry) => entry.id === id);
  if (index < 0) {
    return null;
  }

  const [entry] = captures.splice(index, 1);
  writeCaptures(captures);

  const designLayoutsRoot = path.join(repoRoot, "docs", "design-layouts");
  const outputDirPath = path.join(designLayoutsRoot, entry.outputDir);
  try {
    if (fs.existsSync(outputDirPath)) {
      fs.rmSync(outputDirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`[capture] Failed to remove output dir for ${id}: ${error?.message || error}`);
  }

  return entry;
}

/* ------------------------------------------------------------------ */
/*  Capture logic                                                      */
/* ------------------------------------------------------------------ */

async function loadMeasureModule() {
  return import(pathToFileURL(path.join(skillScriptsDir, "measure-layout.mjs")).href);
}

async function startCapture(body) {
  const {
    url,
    width = 1920,
    height = 1080,
    theme = "light",
    pageType = "settings",
  } = body;
  if (!url) throw new Error("Missing required field: url");

  const mod = await loadMeasureModule();
  const slug = mod.deriveCaptureSlug(url);
  const outputDir = mod.deriveDefaultOutputDir({ repoRoot, targetUrl: url, width, height });
  const id = `${slug}--${width}x${height}--${theme}--${pageType}`;

  const entry = {
    id,
    name: slug,
    url,
    viewport: `${width}x${height}`,
    theme,
    pageType,
    capturedAt: null,
    outputDir: path.relative(path.join(repoRoot, "docs", "design-layouts"), outputDir).replace(/\\/g, "/"),
    status: "pending",
  };

  const captures = readCaptures();
  const existingIdx = captures.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    captures[existingIdx] = { ...captures[existingIdx], ...entry };
  } else {
    captures.push(entry);
  }
  writeCaptures(captures);

  return runCapture(id, entry, { url, width, height, theme, outputDir });
}

async function runCapture(id, entry, options) {
  updateCaptureStatus(id, "capturing");
  console.log(`[capture] Starting ${id} → ${options.url} at ${options.width}x${options.height} theme=${options.theme}`);

  try {
    const mod = await loadMeasureModule();

    const measureOptions = {
      url: options.url,
      width: String(options.width),
      height: String(options.height),
      outputDir: options.outputDir,
    };

    if (options.theme === "both") {
      measureOptions.captureBothThemes = "true";
    } else if (options.theme === "light" || options.theme === "dark") {
      measureOptions.theme = options.theme;
    }

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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

    // POST /captures/delete — remove capture and artifacts
    if (method === "POST" && pathname === "/captures/delete") {
      const body = await readBody(req);
      const id = body?.id;
      if (typeof id !== "string" || !id.trim()) {
        sendJson(res, 400, { error: "Missing capture id" });
        return;
      }
      const deleted = await deleteCapture(decodeURIComponent(id));
      if (!deleted) {
        sendJson(res, 404, { error: `Capture ${id} not found` });
        return;
      }
      sendJson(res, 200, { id, status: "deleted" });
      return;
    }

    // POST /captures/:id/delete — remove capture and artifacts
    if (method === "POST") {
      const deleteMatch = pathname.match(/^\/captures\/(.+)\/delete\/?$/);
      if (deleteMatch) {
        const id = decodeURIComponent(deleteMatch[1]);
        const deleted = await deleteCapture(id);
        if (!deleted) {
          sendJson(res, 404, { error: `Capture ${id} not found` });
          return;
        }
        sendJson(res, 200, { id, status: "deleted" });
        return;
      }
    }

    // DELETE /captures/:id — remove capture and artifacts
    if (method === "DELETE" && pathname.startsWith("/captures/")) {
      const id = decodeURIComponent(pathname.slice("/captures/".length));
      const deleted = await deleteCapture(id);
      if (!deleted) {
        sendJson(res, 404, { error: `Capture ${id} not found` });
        return;
      }
      sendJson(res, 200, { id, status: "deleted" });
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
  console.log(`  POST /captures/delete — remove capture and artifacts (payload id)`);
  console.log(`  POST /captures/:id/delete — remove capture and artifacts`);
  console.log(`  DELETE /captures/:id    — remove capture and artifacts (legacy)`);
  console.log(`  GET  /status/:id      — check one capture\n`);
});
