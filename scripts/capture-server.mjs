#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import net from "node:net";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const layoutCaptureWrapperPath = path.join(__dirname, "measure-layout-headed-v2.mjs");

const PORT = Number(process.env.CAPTURE_SERVER_PORT || "4488");
const DEFAULT_CHROME_URL = "about:blank";
const DEFAULT_WINDOW_SIZE = "1920,1080";
const DESIGN_LAYOUT_CAPTURE_SESSION_TYPE = "design-layout-capture-session";

let chromeExecutableCache = null;

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getDefaultCaptureSessionsRoot() {
  const override = process.env.CAPTURE_SESSIONS_ROOT;
  if (override && override.trim()) {
    return path.resolve(override.trim());
  }
  return path.join(os.homedir(), "Downloads", "CaptureSessions");
}

function getSessionRegistryPath() {
  return path.join(getDefaultCaptureSessionsRoot(), "session-registry.json");
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readSessionRegistry() {
  return readJsonFile(getSessionRegistryPath(), []);
}

function writeSessionRegistry(entries) {
  writeJsonFile(getSessionRegistryPath(), entries);
}

function sessionFilePath(sessionDir) {
  return path.join(sessionDir, "session.json");
}

function temporaryWorkerDir(captureId) {
  return path.join(os.tmpdir(), "writing-system-capture-worker", captureId);
}

function readSessionFile(sessionDir) {
  return readJsonFile(sessionFilePath(sessionDir), null);
}

function writeSessionFile(session) {
  session.updatedAt = nowIso();
  writeJsonFile(sessionFilePath(session.sessionDir), session);
}

function normalizeRegistryEntries(entries) {
  return entries
    .filter((entry) => entry && typeof entry.id === "string" && typeof entry.sessionDir === "string")
    .map((entry) => ({
      id: entry.id,
      sessionDir: path.resolve(entry.sessionDir),
      createdAt: entry.createdAt ?? null,
    }));
}

function syncRegistryEntry(session) {
  const entries = normalizeRegistryEntries(readSessionRegistry());
  const nextEntry = {
    id: session.id,
    sessionDir: path.resolve(session.sessionDir),
    createdAt: session.createdAt,
  };
  const index = entries.findIndex((entry) => entry.id === session.id);
  if (index >= 0) {
    entries[index] = nextEntry;
  } else {
    entries.push(nextEntry);
  }
  writeSessionRegistry(entries);
}

function removeRegistryEntry(sessionId) {
  const entries = normalizeRegistryEntries(readSessionRegistry()).filter((entry) => entry.id !== sessionId);
  writeSessionRegistry(entries);
}

function makeTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function sanitizeName(input) {
  return String(input || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function makeSessionId() {
  const random = Math.random().toString(36).slice(2, 6);
  return `session-${makeTimestamp()}-${random}`;
}

function makeBrowserProfileId() {
  const random = Math.random().toString(36).slice(2, 6);
  return `browser-${makeTimestamp()}-${random}`;
}

function makeCaptureId(sessionDir) {
  const base = makeTimestamp();
  let counter = 0;
  while (true) {
    const suffix = counter === 0 ? "" : `-${String(counter).padStart(2, "0")}`;
    const candidate = `${base}${suffix}`;
    const candidateDir = path.join(sessionDir, "captures", candidate);
    if (!fs.existsSync(candidateDir)) {
      return candidate;
    }
    counter += 1;
  }
}

function buildDefaultSessionName() {
  return `Capture Session ${makeTimestamp().replace("-", " ")}`;
}

function encodePathSegments(relativePath) {
  return relativePath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function logEvent(event, payload = {}) {
  console.log(JSON.stringify({ ts: nowIso(), event, ...payload }));
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
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function findChromeExecutable() {
  if (chromeExecutableCache !== null) {
    return chromeExecutableCache;
  }

  const envCandidates = [process.env.CHROME_PATH].filter(Boolean);
  const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
  const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");

  const candidates = [
    ...envCandidates,
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      chromeExecutableCache = candidate;
      return chromeExecutableCache;
    }
  }

  try {
    if (process.platform === "win32") {
      const output = execFileSync("where.exe", ["chrome.exe"], { encoding: "utf8" }).trim();
      const first = output.split(/\r?\n/).find(Boolean);
      if (first && fs.existsSync(first)) {
        chromeExecutableCache = first;
        return chromeExecutableCache;
      }
    }
  } catch {
    // ignore fallback failure
  }

  chromeExecutableCache = null;
  return null;
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        if (typeof port !== "number") {
          reject(new Error("Failed to allocate a free port."));
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitForHttpReady(url, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        return true;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}${lastError ? ` (${lastError.message})` : ""}`);
}

async function launchChromeSession({ debugPort, userDataDir, launchUrl }) {
  const chromeExecutable = findChromeExecutable();
  if (!chromeExecutable) {
    throw new Error("Chrome executable not found. Install Google Chrome or set CHROME_PATH.");
  }

  ensureDir(userDataDir);

  const args = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--new-window",
    `--window-size=${DEFAULT_WINDOW_SIZE}`,
    launchUrl || DEFAULT_CHROME_URL,
  ];

  const child = spawn(chromeExecutable, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await waitForHttpReady(`http://127.0.0.1:${debugPort}/json/version`);

  return {
    chromeExecutable,
    browserPid: child.pid ?? null,
  };
}

function normalizeLaunchUrl(launchUrl) {
  return typeof launchUrl === "string" && launchUrl.trim() ? launchUrl.trim() : DEFAULT_CHROME_URL;
}

function normalizeUserDataDir(userDataDir) {
  if (!userDataDir || typeof userDataDir !== "string") {
    throw new Error("userDataDir is required");
  }
  return path.resolve(userDataDir);
}

function normalizeDebugPort(debugPort) {
  const parsed = Number(debugPort);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("debugPort must be a positive integer");
  }
  return parsed;
}

export function isBrowserInternalUrl(url) {
  if (!url) return true;
  return [
    "about:blank",
    "chrome://",
    "devtools://",
    "chrome-extension://",
    "edge://",
    "brave://",
    "data:",
  ].some((prefix) => url.startsWith(prefix));
}

function isCaptureControlUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const pathname = new URL(url).pathname || "";
    return pathname.startsWith("/app/superuser/design-layout-captures");
  } catch {
    return false;
  }
}

function isCaptureEligibleTarget(target) {
  return (
    target?.type === "page" &&
    !isBrowserInternalUrl(target?.url || "") &&
    !isCaptureControlUrl(target?.url || "")
  );
}

function toCaptureBrowserTarget(target) {
  return {
    id: String(target?.id || ""),
    url: target?.url ?? null,
    title: target?.title ?? null,
  };
}

export function chooseCaptureTarget(targets, options = {}) {
  const eligibleTargets = Array.isArray(targets) ? targets.filter(isCaptureEligibleTarget) : [];
  if (options?.targetId) {
    return eligibleTargets.find((target) => String(target?.id || "") === String(options.targetId)) || null;
  }
  return eligibleTargets[0] || null;
}

async function listChromeTargets(cdpEndpoint) {
  const response = await fetch(`${cdpEndpoint.replace(/\/+$/, "")}/json`, {
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) {
    throw new Error(`Unable to list Chrome targets (HTTP ${response.status})`);
  }
  return response.json();
}

function readBinaryArtifact(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const extension = path.extname(filePath).toLowerCase();
  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : extension === ".webp"
          ? "image/webp"
          : "application/octet-stream";

  return {
    fileName: path.basename(filePath),
    mimeType,
    base64: fs.readFileSync(filePath).toString("base64"),
  };
}

async function probeCaptureBrowser({ cdpEndpoint }) {
  if (!cdpEndpoint || typeof cdpEndpoint !== "string") {
    throw new Error("cdpEndpoint is required");
  }

  try {
    const targets = await listChromeTargets(cdpEndpoint);
    const target = chooseCaptureTarget(targets);
    return {
      reachable: true,
      currentTargetUrl: target?.url ?? null,
      currentTargetTitle: target?.title ?? null,
    };
  } catch {
    return {
      reachable: false,
      currentTargetUrl: null,
      currentTargetTitle: null,
    };
  }
}

async function buildCaptureBrowserState({
  debugPort,
  userDataDir,
  launchUrl,
  browserPid,
  chromeExecutable,
  launchedAt,
}) {
  const cdpEndpoint = `http://127.0.0.1:${debugPort}`;
  const probe = await probeCaptureBrowser({ cdpEndpoint });

  return {
    cdpEndpoint,
    debugPort,
    reachable: probe.reachable,
    currentTargetUrl: probe.currentTargetUrl,
    currentTargetTitle: probe.currentTargetTitle,
    lastError: null,
    browserPid: browserPid ?? null,
    userDataDir,
    launchUrl,
    chromeExecutable: chromeExecutable ?? null,
    launchedAt,
  };
}

async function launchManagedCaptureBrowser({ debugPort, userDataDir, launchUrl }) {
  const normalizedDebugPort = normalizeDebugPort(debugPort);
  const normalizedUserDataDir = normalizeUserDataDir(userDataDir);
  const normalizedLaunchUrl = normalizeLaunchUrl(launchUrl);
  const launchedAt = nowIso();
  const launched = await launchChromeSession({
    debugPort: normalizedDebugPort,
    userDataDir: normalizedUserDataDir,
    launchUrl: normalizedLaunchUrl,
  });

  return buildCaptureBrowserState({
    debugPort: normalizedDebugPort,
    userDataDir: normalizedUserDataDir,
    launchUrl: normalizedLaunchUrl,
    browserPid: launched.browserPid,
    chromeExecutable: launched.chromeExecutable,
    launchedAt,
  });
}

async function launchCaptureBrowser({ launchUrl } = {}) {
  const debugPort = await getFreePort();
  const userDataDir = path.join(os.tmpdir(), "writing-system-capture-browser", makeBrowserProfileId());
  return launchManagedCaptureBrowser({ debugPort, userDataDir, launchUrl });
}

async function recoverCaptureBrowser({ debugPort, userDataDir, launchUrl } = {}) {
  return launchManagedCaptureBrowser({ debugPort, userDataDir, launchUrl });
}

async function listCaptureTargets({ cdpEndpoint }) {
  if (!cdpEndpoint || typeof cdpEndpoint !== "string") {
    throw new Error("cdpEndpoint is required");
  }

  const targets = await listChromeTargets(cdpEndpoint);
  return targets.filter(isCaptureEligibleTarget).map(toCaptureBrowserTarget);
}

async function runCaptureWorker({ cdpEndpoint, targetId }) {
  if (!cdpEndpoint || typeof cdpEndpoint !== "string") {
    throw new Error("cdpEndpoint is required");
  }
  if (!targetId || typeof targetId !== "string") {
    throw new Error("No target tab selected for this session.");
  }

  const targets = await listChromeTargets(cdpEndpoint);
  const target = chooseCaptureTarget(targets, { targetId });
  if (!target?.url) {
    throw new Error("Selected target tab is no longer available. Choose Target Tab again.");
  }

  const captureId = makeTimestamp();
  const workerDir = temporaryWorkerDir(captureId);
  const reportPath = path.join(workerDir, "report.json");

  ensureDir(workerDir);

  try {
    const mod = await loadMeasureModule();
    const report = await mod.measureLayout({
      url: target.url,
      cdpEndpoint,
      waitForUrlContains: target.url,
      outputDir: workerDir,
      jsonOut: reportPath,
      waitMs: "1000",
    });

    const finalReport = readJsonFile(reportPath, report);
    const captureTimestamp = finalReport?.capture?.capturedAt || nowIso();

    return {
      captureId,
      capturedAt: captureTimestamp,
      pageUrl: finalReport?.capture?.page?.url || target.url,
      pageTitle: finalReport?.capture?.page?.title || target.title || null,
      viewportWidth: finalReport?.capture?.viewport?.width || null,
      viewportHeight: finalReport?.capture?.viewport?.height || null,
      currentTargetUrl: target.url,
      currentTargetTitle: target.title || null,
      report: finalReport,
      reportFileName: "report.json",
      viewportScreenshot: readBinaryArtifact(finalReport?.capture?.artifacts?.viewportScreenshot),
      fullPageScreenshot: readBinaryArtifact(finalReport?.capture?.artifacts?.fullPageScreenshot),
    };
  } finally {
    fs.rmSync(workerDir, { recursive: true, force: true });
  }
}

function normalizeSessionShape(session) {
  return {
    ...session,
    sessionType: typeof session?.sessionType === "string" ? session.sessionType : null,
    captures: Array.isArray(session?.captures) ? session.captures : [],
    browser: session?.browser || {},
  };
}

function isDesignLayoutCaptureSession(session) {
  return normalizeSessionShape(session).sessionType === DESIGN_LAYOUT_CAPTURE_SESSION_TYPE;
}

function buildCaptureFileUrl(sessionId, relativePath) {
  return `http://127.0.0.1:${PORT}/capture-sessions/${encodeURIComponent(sessionId)}/files/${encodePathSegments(relativePath)}`;
}

function captureSummaryForResponse(sessionId, capture) {
  return {
    ...capture,
    reportUrl: capture.reportRelativePath ? buildCaptureFileUrl(sessionId, capture.reportRelativePath) : null,
    viewportUrl: capture.viewportRelativePath ? buildCaptureFileUrl(sessionId, capture.viewportRelativePath) : null,
    fullPageUrl: capture.fullPageRelativePath ? buildCaptureFileUrl(sessionId, capture.fullPageRelativePath) : null,
  };
}

function sessionSummaryForResponse(session) {
  const normalized = normalizeSessionShape(session);
  const lastCapture = normalized.captures[normalized.captures.length - 1] || null;
  return {
    id: normalized.id,
    name: normalized.name,
    status: normalized.status,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    lastCapturedAt: normalized.lastCapturedAt || lastCapture?.capturedAt || null,
    saveRoot: normalized.saveRoot,
    sessionDir: normalized.sessionDir,
    captureCount: normalized.captures.length,
    debugPort: normalized.browser?.debugPort ?? null,
    cdpEndpoint: normalized.browser?.cdpEndpoint ?? null,
    browserPid: normalized.browser?.browserPid ?? null,
  };
}

async function sessionDetailForResponse(session) {
  const normalized = normalizeSessionShape(session);
  let browserReachable = false;
  let currentTarget = null;

  if (normalized.browser?.cdpEndpoint) {
    try {
      const targets = await listChromeTargets(normalized.browser.cdpEndpoint);
      currentTarget = chooseCaptureTarget(targets);
      browserReachable = true;
    } catch {
      browserReachable = false;
    }
  }

  return {
    ...sessionSummaryForResponse(normalized),
    saveRoot: normalized.saveRoot,
    sessionDir: normalized.sessionDir,
    browser: {
      ...normalized.browser,
      reachable: browserReachable,
      currentTargetUrl: currentTarget?.url ?? null,
      currentTargetTitle: currentTarget?.title ?? null,
    },
    captures: normalized.captures.map((capture) => captureSummaryForResponse(normalized.id, capture)),
  };
}

function readAllSessions() {
  const entries = normalizeRegistryEntries(readSessionRegistry());
  const liveSessions = [];
  const liveRegistry = [];

  for (const entry of entries) {
    const session = readSessionFile(entry.sessionDir);
    if (!session) continue;
    const normalized = normalizeSessionShape(session);
    if (!isDesignLayoutCaptureSession(normalized)) continue;
    liveSessions.push(normalized);
    liveRegistry.push(entry);
  }

  if (liveRegistry.length !== entries.length) {
    writeSessionRegistry(liveRegistry);
  }

  return liveSessions.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function flattenLegacyCaptures() {
  return readAllSessions().flatMap((session) =>
    normalizeSessionShape(session).captures.map((capture) => ({
      id: `${session.id}:${capture.id}`,
      name: session.name,
      url: capture.pageUrl || "",
      viewport:
        capture.viewportWidth && capture.viewportHeight
          ? `${capture.viewportWidth}x${capture.viewportHeight}`
          : "--",
      theme: "light",
      pageType: "workbench",
      capturedAt: capture.capturedAt,
      outputDir: capture.reportRelativePath ? path.dirname(capture.reportRelativePath).replace(/\\/g, "/") : "",
      status: capture.status,
    })),
  );
}

async function loadMeasureModule() {
  return import(pathToFileURL(layoutCaptureWrapperPath).href);
}

function relativeToSessionDir(sessionDir, filePath) {
  return path.relative(sessionDir, filePath).replace(/\\/g, "/");
}

function copyIfExists(sourcePath, destinationPath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return false;
  fs.copyFileSync(sourcePath, destinationPath);
  return true;
}

async function createSession({ name, saveRoot, launchUrl }) {
  const resolvedSaveRoot = path.resolve(saveRoot || getDefaultCaptureSessionsRoot());
  ensureDir(resolvedSaveRoot);

  const sessionId = makeSessionId();
  const sessionDir = path.join(resolvedSaveRoot, sessionId);
  const capturesDir = path.join(sessionDir, "captures");
  const userDataDir = path.join(sessionDir, "chrome-profile");

  ensureDir(sessionDir);
  ensureDir(capturesDir);

  const debugPort = await getFreePort();

  logEvent("capture.session.create.start", {
    sessionId,
    saveRoot: resolvedSaveRoot,
    debugPort,
  });

  const browser = await launchManagedCaptureBrowser({
    debugPort,
    userDataDir,
    launchUrl,
  });

  const session = {
    id: sessionId,
    sessionType: DESIGN_LAYOUT_CAPTURE_SESSION_TYPE,
    name: sanitizeName(name) || buildDefaultSessionName(),
    status: "ready",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastCapturedAt: null,
    saveRoot: resolvedSaveRoot,
    sessionDir,
    captures: [],
    browser,
  };

  writeSessionFile(session);
  syncRegistryEntry(session);

  logEvent("capture.browser.launch.success", {
    sessionId,
    debugPort,
    browserPid: browser.browserPid,
    chromeExecutable: browser.chromeExecutable,
  });

  return session;
}

async function captureSessionPage(sessionId) {
  const session = readAllSessions().find((entry) => entry.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const normalized = normalizeSessionShape(session);
  const cdpEndpoint = normalized.browser?.cdpEndpoint;
  if (!cdpEndpoint) {
    normalized.status = "browser-missing";
    writeSessionFile(normalized);
    throw new Error("Session has no stored CDP endpoint.");
  }

  logEvent("capture.session.capture.start", { sessionId });

  const targets = await listChromeTargets(cdpEndpoint);
  const target = chooseCaptureTarget(targets);
  if (!target?.url) {
    normalized.status = "browser-missing";
    writeSessionFile(normalized);
    throw new Error("No capture-eligible page target found in the session browser.");
  }

  logEvent("capture.session.capture.target_selected", {
    sessionId,
    targetUrl: target.url,
    targetTitle: target.title ?? null,
  });

  const mod = await loadMeasureModule();
  const captureId = makeCaptureId(normalized.sessionDir);
  const captureDir = path.join(normalized.sessionDir, "captures", captureId);
  const reportPath = path.join(captureDir, "report.json");
  const viewportPath = path.join(captureDir, "viewport.png");
  const fullPagePath = path.join(captureDir, "full-page.png");

  ensureDir(captureDir);

  normalized.status = "capturing";
  writeSessionFile(normalized);

  try {
    const report = await mod.measureLayout({
      url: target.url,
      cdpEndpoint,
      waitForUrlContains: target.url,
      outputDir: captureDir,
      jsonOut: reportPath,
      waitMs: "1000",
    });

    const viewportSource = report?.capture?.artifacts?.viewportScreenshot;
    const fullPageSource = report?.capture?.artifacts?.fullPageScreenshot;
    copyIfExists(viewportSource, viewportPath);
    copyIfExists(fullPageSource, fullPagePath);

    const finalReport = readJsonFile(reportPath, report);
    const captureTimestamp = finalReport?.capture?.capturedAt || nowIso();
    const captureArtifact = {
      id: captureId,
      status: "complete",
      capturedAt: captureTimestamp,
      pageUrl: finalReport?.capture?.page?.url || target.url,
      pageTitle: finalReport?.capture?.page?.title || target.title || null,
      viewportWidth: finalReport?.capture?.viewport?.width || null,
      viewportHeight: finalReport?.capture?.viewport?.height || null,
      reportRelativePath: relativeToSessionDir(normalized.sessionDir, reportPath),
      viewportRelativePath: fs.existsSync(viewportPath)
        ? relativeToSessionDir(normalized.sessionDir, viewportPath)
        : null,
      fullPageRelativePath: fs.existsSync(fullPagePath)
        ? relativeToSessionDir(normalized.sessionDir, fullPagePath)
        : null,
    };

    normalized.status = "ready";
    normalized.lastCapturedAt = captureTimestamp;
    normalized.browser.lastTargetUrl = target.url;
    normalized.browser.lastTargetTitle = target.title || null;
    normalized.captures = [...normalized.captures, captureArtifact];
    writeSessionFile(normalized);

    logEvent("capture.session.capture.success", {
      sessionId,
      captureId,
      pageUrl: captureArtifact.pageUrl,
      reportPath,
    });

    return captureSummaryForResponse(sessionId, captureArtifact);
  } catch (error) {
    normalized.status = "capture-failed";
    normalized.lastError = error?.message || String(error);
    writeSessionFile(normalized);

    logEvent("capture.session.capture.failure", {
      sessionId,
      error: normalized.lastError,
    });

    throw error;
  }
}

function deleteLegacyCapture() {
  return { error: "Legacy capture deletion is no longer supported. Use capture sessions." };
}

function sendFile(res, filePath) {
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
}

async function handleRequest(req, res, options = {}) {
  const { method } = req;
  const urlObj = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = urlObj.pathname;
  const runWorker = options.runCaptureWorker || runCaptureWorker;
  const probeBrowser = options.probeCaptureBrowser || probeCaptureBrowser;
  const fetchTargets = options.listCaptureTargets || listCaptureTargets;
  const launchBrowser = options.launchCaptureBrowser || launchCaptureBrowser;
  const recoverBrowser = options.recoverCaptureBrowser || recoverCaptureBrowser;

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
    if (method === "GET" && pathname === "/capture-worker/status") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === "POST" && pathname === "/capture-worker/probe") {
      const body = await readBody(req);
      const probe = await probeBrowser(body || {});
      sendJson(res, 200, { probe });
      return;
    }

    if (method === "POST" && pathname === "/capture-worker/targets") {
      const body = await readBody(req);
      const targets = await fetchTargets(body || {});
      sendJson(res, 200, { targets });
      return;
    }

    if (method === "POST" && pathname === "/capture-worker/run") {
      const body = await readBody(req);
      const capture = await runWorker(body || {});
      sendJson(res, 200, { capture });
      return;
    }

    if (method === "POST" && pathname === "/capture-browser/launch") {
      const body = await readBody(req);
      const browser = await launchBrowser(body || {});
      sendJson(res, 200, { browser });
      return;
    }

    if (method === "POST" && pathname === "/capture-browser/recover") {
      const body = await readBody(req);
      const browser = await recoverBrowser(body || {});
      sendJson(res, 200, { browser });
      return;
    }

    if (method === "GET" && pathname === "/capture-sessions/defaults") {
      sendJson(res, 200, {
        defaultSaveRoot: getDefaultCaptureSessionsRoot(),
        chromeExecutableDetected: Boolean(findChromeExecutable()),
      });
      return;
    }

    if (method === "GET" && pathname === "/capture-sessions") {
      const sessions = readAllSessions().map(sessionSummaryForResponse);
      sendJson(res, 200, { sessions });
      return;
    }

    if (method === "POST" && pathname === "/capture-sessions") {
      const body = await readBody(req);
      const session = await createSession(body || {});
      sendJson(res, 200, { session: sessionSummaryForResponse(session) });
      return;
    }

    if (method === "GET") {
      const detailMatch = pathname.match(/^\/capture-sessions\/([^/]+)$/);
      if (detailMatch) {
        const sessionId = decodeURIComponent(detailMatch[1]);
        const session = readAllSessions().find((entry) => entry.id === sessionId);
        if (!session) {
          sendJson(res, 404, { error: `Session ${sessionId} not found` });
          return;
        }
        sendJson(res, 200, { session: await sessionDetailForResponse(session) });
        return;
      }
    }

    if (method === "POST") {
      const captureMatch = pathname.match(/^\/capture-sessions\/([^/]+)\/captures$/);
      if (captureMatch) {
        const sessionId = decodeURIComponent(captureMatch[1]);
        const capture = await captureSessionPage(sessionId);
        sendJson(res, 200, { capture });
        return;
      }
    }

    if (method === "GET") {
      const fileMatch = pathname.match(/^\/capture-sessions\/([^/]+)\/files\/(.+)$/);
      if (fileMatch) {
        const sessionId = decodeURIComponent(fileMatch[1]);
        const relativePath = decodeURIComponent(fileMatch[2]);
        const session = readAllSessions().find((entry) => entry.id === sessionId);
        if (!session) {
          sendJson(res, 404, { error: `Session ${sessionId} not found` });
          return;
        }
        const root = path.resolve(session.sessionDir);
        const filePath = path.resolve(root, relativePath);
        if (!filePath.startsWith(root) || relativePath.includes("..")) {
          sendJson(res, 403, { error: "Forbidden" });
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          sendJson(res, 404, { error: "File not found" });
          return;
        }
        sendFile(res, filePath);
        return;
      }
    }

    if (method === "GET" && pathname === "/captures") {
      sendJson(res, 200, flattenLegacyCaptures());
      return;
    }

    if (method === "POST" && pathname === "/capture") {
      sendJson(res, 410, {
        error: "Legacy one-off capture is no longer supported. Create a capture session instead.",
      });
      return;
    }

    if (
      (method === "POST" && pathname === "/captures/delete") ||
      (method === "POST" && /^\/captures\/.+\/delete\/?$/.test(pathname)) ||
      (method === "DELETE" && pathname.startsWith("/captures/"))
    ) {
      sendJson(res, 410, deleteLegacyCapture());
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error?.message || String(error);
    if (message.includes("Session") && message.includes("not found")) {
      sendJson(res, 404, { error: message });
      return;
    }
    sendJson(res, 500, { error: message });
  }
}

export function createServer(options = {}) {
  return http.createServer((req, res) => {
    void handleRequest(req, res, options);
  });
}

export function startServer(port = PORT) {
  const server = createServer();
  server.listen(port, () => {
    console.log(`\nCapture server running on http://127.0.0.1:${port}`);
    console.log(`  GET  /capture-worker/status        - worker readiness`);
    console.log(`  POST /capture-worker/probe         - inspect current browser target`);
    console.log(`  POST /capture-worker/targets       - list eligible browser tabs`);
    console.log(`  POST /capture-worker/run           - run the layout-capture worker`);
    console.log(`  POST /capture-browser/launch       - launch a browser-owned capture Chrome`);
    console.log(`  POST /capture-browser/recover      - relaunch an unreachable capture Chrome`);
    console.log(`  GET  /capture-sessions/defaults     - defaults and browser detection`);
    console.log(`  GET  /capture-sessions              - list sessions`);
    console.log(`  POST /capture-sessions              - create session and launch Chrome`);
    console.log(`  GET  /capture-sessions/:id          - read session detail`);
    console.log(`  POST /capture-sessions/:id/captures - append a capture to a session`);
    console.log(`  GET  /capture-sessions/:id/files/*  - serve session artifacts`);
    console.log(`  GET  /captures                      - legacy readiness/list endpoint\n`);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
