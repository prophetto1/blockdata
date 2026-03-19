#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
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
  const captures = JSON.parse(fs.readFileSync(capturesJsonPath, "utf8"));
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

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return ["1", "true", "yes", "y", "on"].includes(String(value).toLowerCase());
}

const AUTH_PATH_HINTS = [
  "/login",
  "/signin",
  "/sign-in",
  "/sign_in",
  "/log-in",
  "/auth",
  "/sso",
  "/oauth",
  "/id/",
  "/session",
  "/account",
];

const AUTH_TEXT_HINTS = [
  "sign in",
  "signin",
  "log in",
  "log into",
  "authentication",
  "authorize",
  "authorization",
  "forgot password",
  "create account",
  "continue with",
  "single sign",
  "password",
];

function isLikelyLoggedOutPage(finalUrl, title = "", bodyText = "") {
  const normalizedUrl = String(finalUrl || "").toLowerCase();
  const normalizedTitle = String(title || "").toLowerCase();
  const normalizedBody = String(bodyText || "").toLowerCase();

  const urlHints = AUTH_PATH_HINTS.some((hint) => normalizedUrl.includes(hint));
  const textHints = AUTH_TEXT_HINTS.some(
    (hint) => normalizedTitle.includes(hint) || normalizedBody.includes(hint)
  );
  return urlHints || textHints;
}

async function validateStorageState(playwright, { url, storageStatePath, width, height }) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      storageState: path.resolve(storageStatePath),
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    const finalUrl = page.url();
    const title = await page.title().catch(() => "");
    let bodyText = "";
    try {
      bodyText = (await page.locator("body").innerText()) || "";
    } catch {
      // no-op
    }

    const hasPasswordInput = (await page.locator('input[type="password"]').count().catch(() => 0)) > 0;
    const looksLoggedOut =
      isLikelyLoggedOutPage(finalUrl, title, bodyText) ||
      (hasPasswordInput &&
        (bodyText.toLowerCase().includes("email") || bodyText.toLowerCase().includes("password")));

    await context.close();
    return !looksLoggedOut;
  } catch (error) {
    console.warn(`[auth] Failed auth-state validation for ${url}: ${error?.message || error}`);
    return false;
  } finally {
    await browser.close();
  }
}

function normalizeChromeProfilePath(candidate) {
  if (!candidate) return null;
  const resolved = path.resolve(candidate);
  return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? resolved : null;
}

function resolveDefaultChromeProfileDir() {
  const home = process.env.USERPROFILE || os.homedir();
  const defaultProfilePath = path.join(home, "AppData", "Local", "Google", "Chrome", "User Data");
  return normalizeChromeProfilePath(defaultProfilePath);
}

async function launchAuthContext(playwright, width, height) {
  const useProfile = parseBoolean(process.env.CAPTURE_USE_CHROME_PROFILE ?? true);
  const channel = process.env.CAPTURE_CHROME_CHANNEL || "chrome";
  const profileName = process.env.CAPTURE_CHROME_PROFILE_NAME || "Default";
  const browserArgs = ["--disable-blink-features=AutomationControlled"];

  async function launchFallback() {
    const browser = await playwright.chromium.launch({
      channel,
      headless: false,
      args: browserArgs,
    });
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    return {
      page,
      context,
      cleanup: async () => {
        await context.close();
        await browser.close();
      },
    };
  }

  if (!useProfile) {
    return launchFallback();
  }

  const profileBase = normalizeChromeProfilePath(process.env.CAPTURE_CHROME_PROFILE_DIR) || resolveDefaultChromeProfileDir();
  if (!profileBase) {
    return launchFallback();
  }

  const resolvedProfileDir = path.join(profileBase, profileName);
  if (!normalizeChromeProfilePath(resolvedProfileDir)) {
    return launchFallback();
  }

  const tempProfileRoot = fs.mkdtempSync(path.join(os.tmpdir(), "capture-chrome-profile-"));
  const copiedProfileDir = path.join(tempProfileRoot, profileName);
  const sourceLocalState = path.join(profileBase, "Local State");
  const targetLocalState = path.join(tempProfileRoot, "Local State");

  try {
    fs.cpSync(resolvedProfileDir, copiedProfileDir, { recursive: true });
    if (fs.existsSync(sourceLocalState)) {
      fs.copyFileSync(sourceLocalState, targetLocalState);
    }

    const context = await playwright.chromium.launchPersistentContext(tempProfileRoot, {
      channel,
      headless: false,
      viewport: { width, height },
      deviceScaleFactor: 1,
      args: [...browserArgs, `--profile-directory=${profileName}`],
    });
    const page = await context.newPage();
    return {
      page,
      context,
      tempProfileRoot,
      cleanup: async () => {
        await context.close();
        try {
          fs.rmSync(tempProfileRoot, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      },
    };
  } catch (error) {
    try {
      fs.rmSync(tempProfileRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    console.warn(`[auth] Chrome profile launch failed (${error?.message || error}). Falling back to headed Chromium session.`);
    return launchFallback();
  }
}

/* ------------------------------------------------------------------ */
/*  Auth sessions â€” headed browser kept open for manual login          */
/* ------------------------------------------------------------------ */

// Map<captureId, { context, page, storageStatePath, cleanup, tempProfileRoot?, entry }>
const authSessions = new Map();

async function startAuthSession(id, entry, targetUrl, storageStatePath, width, height) {
  const playwright = resolvePlaywright();
  const { page, context, cleanup, tempProfileRoot } = await launchAuthContext(playwright, width, height);
  await page.goto(targetUrl, { waitUntil: "load" });

  authSessions.set(id, {
    context,
    page,
    storageStatePath,
    cleanup,
    tempProfileRoot,
    entry,
  });
  console.log(`[auth] Headed browser opened for ${targetUrl} â€” waiting for login`);
}

async function completeAuthSession(id) {
  const session = authSessions.get(id);
  if (!session) throw new Error(`No auth session for capture '${id}'`);

  const { context, storageStatePath, cleanup } = session;

  // Save storageState from the context the user logged into
  ensureDir(path.dirname(storageStatePath));
  await context.storageState({ path: storageStatePath });
  console.log(`[auth] Storage state saved to ${storageStatePath}`);

  if (cleanup) {
    await cleanup();
  } else {
    await context.close();
  }
  authSessions.delete(id);
}

async function deleteCapture(id) {
  const captures = readCaptures();
  const index = captures.findIndex((entry) => entry.id === id);
  if (index < 0) {
    return null;
  }

  const [entry] = captures.splice(index, 1);
  writeCaptures(captures);

  const session = authSessions.get(id);
  if (session) {
    try {
      await (session.cleanup ? session.cleanup() : session.context?.close?.());
    } finally {
      authSessions.delete(id);
    }
  }

  const designLayoutsRoot = path.join(repoRoot, "docs", "design-layouts");
  const outputDirPath = path.join(designLayoutsRoot, entry.outputDir);
  try {
    if (fs.existsSync(outputDirPath)) {
      fs.rmSync(outputDirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`[capture] Failed to remove output dir for ${id}: ${error?.message || error}`);
  }

  const mod = await loadMeasureModule();
  const authStatePath = mod.deriveAuthStatePath({ repoRoot, targetUrl: entry.url });
  try {
    if (fs.existsSync(authStatePath)) {
      fs.rmSync(authStatePath, { force: true });
    }
  } catch (error) {
    console.warn(`[capture] Failed to remove auth state for ${id}: ${error?.message || error}`);
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
    forceAuth = false,
  } = body;
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

  const hasAuth = fs.existsSync(storageStatePath);
  let needsAuth = !hasAuth || forceAuth;
  if (!needsAuth) {
    const playwright = resolvePlaywright();
    needsAuth = !(await validateStorageState(playwright, { url, storageStatePath, width, height }));
    if (needsAuth) {
      try {
        fs.rmSync(storageStatePath, { force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  }

  if (needsAuth) {
    updateCaptureStatus(id, "auth-needed");
    await startAuthSession(id, entry, url, storageStatePath, width, height);
    return {
      id,
      status: "auth-needed",
      message: `Headed browser opened for ${new URL(url).hostname}. Log in, then click "Auth Complete".`,
    };
  }

  return runCapture(id, entry, { url, width, height, theme, storageStatePath, outputDir });
}

async function runCapture(id, entry, options) {
  updateCaptureStatus(id, "capturing");
  console.log(`[capture] Starting ${id} â†’ ${options.url} at ${options.width}x${options.height} theme=${options.theme}`);

  try {
    const mod = await loadMeasureModule();

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
    // GET /captures â€” list all
    if (method === "GET" && pathname === "/captures") {
      sendJson(res, 200, readCaptures());
      return;
    }

    // POST /capture â€” start new capture
    if (method === "POST" && pathname === "/capture") {
      const body = await readBody(req);
      const result = await startCapture(body);
      sendJson(res, 200, result);
      return;
    }

    // POST /captures/delete â€” remove capture and artifacts
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

    // POST /captures/:id/delete â€” remove capture and artifacts
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

    // DELETE /captures/:id â€” remove capture and artifacts
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

    // POST /auth-complete â€” user finished login in headed browser
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

    // GET /status/:id â€” check single capture
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

    // GET /files/* â€” serve captured files (screenshots, reports)
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
  console.log(`  GET  /captures        â€” list all captures`);
  console.log(`  POST /capture         â€” start new { url, width, height, theme, pageType }`);
  console.log(`  POST /captures/delete â€” remove capture and artifacts (payload id)`);
  console.log(`  POST /captures/:id/delete â€” remove capture and artifacts`);
  console.log(`  DELETE /captures/:id    â€” remove capture and artifacts (legacy)`);
  console.log(`  POST /auth-complete  â€” signal login done { id }`);
  console.log(`  GET  /status/:id      â€” check one capture\n`);
});
