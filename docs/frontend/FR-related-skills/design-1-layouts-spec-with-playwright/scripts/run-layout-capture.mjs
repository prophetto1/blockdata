#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

export async function runLayoutCapture(options) {
  const mod = await import(pathToFileURL(measureLayoutPath).href);
  const {
    measureLayout,
  } = mod;

  const config = await buildRunLayoutCaptureConfig(options);

  const report = await measureLayout(config.measureOptions);

  return {
    ...config.resultMeta,
    report,
  };
}

export async function buildRunLayoutCaptureConfig(options) {
  const mod = await import(pathToFileURL(measureLayoutPath).href);
  const {
    deriveAuthStatePath,
    deriveDefaultOutputDir,
  } = mod;

  const width = Number.parseInt(options.width ?? "1920", 10);
  const height = Number.parseInt(options.height ?? "1080", 10);
  const targetUrl = options.url;

  if (!targetUrl) {
    throw new Error("Missing required --url argument.");
  }

  const storageStatePath =
    options.storageStatePath ??
    options["storage-state-path"] ??
    deriveAuthStatePath({
      repoRoot: path.resolve(__dirname, "..", "..", "..", ".."),
      targetUrl,
    });

  const outputDir =
    options.outputDir ??
    options["output-dir"] ??
    deriveDefaultOutputDir({
      repoRoot: path.resolve(__dirname, "..", "..", "..", ".."),
      targetUrl,
      width,
      height,
    });

  return {
    measureOptions: {
    ...options,
    url: targetUrl,
    width,
    height,
    outputDir,
    storageStatePath,
    },
    resultMeta: {
      url: targetUrl,
      width,
      height,
      outputDir: path.resolve(outputDir),
      storageStatePath: path.resolve(storageStatePath),
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runLayoutCapture(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
