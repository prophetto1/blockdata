#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const measureLayoutPath = path.join(__dirname, "measure-layout.mjs");

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const next = argv[index + 1];

    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return options;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolvePlaywright() {
  const candidates = [
    process.cwd(),
    repoRoot,
    path.join(repoRoot, "web"),
    path.join(repoRoot, "web-docs"),
  ];

  for (const basePath of candidates) {
    try {
      const modulePath = require.resolve("playwright", { paths: [basePath] });
      return require(modulePath);
    } catch {
      // keep trying
    }
  }

  throw new Error(
    "Unable to resolve the 'playwright' package. Install it in the workspace or run from a workspace that already includes it."
  );
}

async function promptForConfirmation(message) {
  const rl = readline.createInterface({ input, output });
  try {
    await rl.question(`${message}\nPress Enter when finished in the browser...`);
  } finally {
    rl.close();
  }
}

export async function prepareAuthState(options) {
  const mod = await import(pathToFileURL(measureLayoutPath).href);
  const { deriveAuthStatePath } = mod;

  const targetUrl = options.url;
  if (!targetUrl) {
    throw new Error("Missing required --url argument.");
  }

  const browserName = options.browser ?? "chromium";
  const storageStatePath =
    options.storageStatePath ??
    options["storage-state-path"] ??
    deriveAuthStatePath({ repoRoot, targetUrl });

  ensureDir(path.dirname(storageStatePath));

  const playwright = resolvePlaywright();
  const browserType = playwright[browserName];
  if (!browserType) {
    throw new Error(`Unsupported browser '${browserName}'.`);
  }

  const browser = await browserType.launch({ headless: false });

  try {
    const context = await browser.newContext({
      viewport: {
        width: Number.parseInt(options.width ?? "1440", 10),
        height: Number.parseInt(options.height ?? "1024", 10),
      },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: "load" });

    await promptForConfirmation(
      `Complete the login flow for ${targetUrl} in the opened browser.`
    );

    await context.storageState({ path: storageStatePath });

    return {
      url: targetUrl,
      storageStatePath: path.resolve(storageStatePath),
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await prepareAuthState(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
