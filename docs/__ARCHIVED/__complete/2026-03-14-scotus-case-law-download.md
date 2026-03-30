# SCOTUS Case Law Corpus Download Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Download all 341 volumes of U.S. Supreme Court opinions from static.case.law into a local directory structure compatible with the existing `import-case-law-to-arango.mjs` script, with automated verification so nothing is missed.

**Architecture:** A single Node.js download script that fetches volume metadata + individual case JSON files for all 341 volumes, tracks progress in a manifest file, and can be resumed/re-run safely (idempotent). A separate verify command confirms completeness by comparing downloaded cases against each volume's `CasesMetadata.json`.

**Tech Stack:** Node.js (no dependencies beyond stdlib — `node:fs`, `node:path`, `node:https`)

---

## What Gets Downloaded

Per volume (1–341), from `https://static.case.law/us/{vol}/`:

| File | Purpose | Used by import script? |
|------|---------|----------------------|
| `CasesMetadata.json` | Array of case summaries (id, name, date, citations, court, etc.) | Yes — discovery |
| `VolumeMetadata.json` | Volume-level info (title, publisher, year) | Yes — volume record |
| `cases/*.json` | Individual case files with full casebody + opinions | Yes — case + opinion records |

**NOT downloaded:** `html/`, `case-pdfs/`, `.zip`, `.tar`, `.pdf` — not needed for the ArangoDB import pipeline.

## Expected Output Directory

```
data/case-law/
  us/
    1/
      CasesMetadata.json
      VolumeMetadata.json
      cases/
        0001-01.json
        0002-01.json
        ...
    2/
      CasesMetadata.json
      VolumeMetadata.json
      cases/
        ...
    ...
    341/
      ...
```

Then run the existing import: `node scripts/import-case-law-to-arango.mjs --root data/case-law --reporters us`

---

### Task 1: Create the download script skeleton

**Files:**
- Create: `scripts/download-case-law.mjs`

**Step 1: Write the script with CLI arg parsing and constants**

```js
#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

const BASE_URL = 'https://static.case.law';
const REPORTER = 'us';
const FIRST_VOLUME = 1;
const LAST_VOLUME = 341;
const CONCURRENCY = 5;
const DEFAULT_OUTPUT = 'data/case-law';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const outputDir = path.resolve(readArg('--output') ?? DEFAULT_OUTPUT);
const startVol = Number(readArg('--start') ?? FIRST_VOLUME);
const endVol = Number(readArg('--end') ?? LAST_VOLUME);
const verifyOnly = hasFlag('--verify');
const concurrency = Number(readArg('--concurrency') ?? CONCURRENCY);

console.log(`Output:      ${outputDir}`);
console.log(`Volumes:     ${startVol}–${endVol}`);
console.log(`Concurrency: ${concurrency}`);
console.log(`Mode:        ${verifyOnly ? 'VERIFY ONLY' : 'DOWNLOAD'}`);
console.log();
```

**Step 2: Run to confirm it parses args**

Run: `node scripts/download-case-law.mjs --output /tmp/test-caselaw`
Expected: Prints config summary with output path `/tmp/test-caselaw`, volumes 1–341

**Step 3: Commit**

```bash
git add scripts/download-case-law.mjs
git commit -m "feat: scaffold SCOTUS case law download script"
```

---

### Task 2: Add HTTP fetch helper with retries

**Files:**
- Modify: `scripts/download-case-law.mjs`

**Step 1: Add fetchJson and fetchToFile helpers after the CLI section**

```js
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchBuffer(url);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.warn(`  Retry ${attempt}/${maxRetries} for ${url} (waiting ${delay}ms): ${err.message}`);
      await wait(delay);
    }
  }
}

async function downloadJson(url) {
  const buf = await fetchWithRetry(url);
  return JSON.parse(buf.toString('utf8'));
}

async function downloadToFile(url, destPath) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const buf = await fetchWithRetry(url);
  await fs.writeFile(destPath, buf);
  return buf.length;
}
```

**Step 2: Commit**

```bash
git add scripts/download-case-law.mjs
git commit -m "feat: add HTTP fetch with retry to download script"
```

---

### Task 3: Add volume download logic

**Files:**
- Modify: `scripts/download-case-law.mjs`

**Step 1: Add the core download function**

This downloads `CasesMetadata.json`, `VolumeMetadata.json`, then discovers case filenames from the metadata and downloads each `cases/{filename}.json`.

```js
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadVolume(vol) {
  const volDir = path.join(outputDir, REPORTER, String(vol));
  const casesDir = path.join(volDir, 'cases');
  await fs.mkdir(casesDir, { recursive: true });

  const volUrl = `${BASE_URL}/${REPORTER}/${vol}`;

  // Download metadata files (always re-download to stay current)
  const casesMetaPath = path.join(volDir, 'CasesMetadata.json');
  const volMetaPath = path.join(volDir, 'VolumeMetadata.json');

  let casesMetadata;
  try {
    casesMetadata = await downloadJson(`${volUrl}/CasesMetadata.json`);
    await fs.writeFile(casesMetaPath, JSON.stringify(casesMetadata, null, 2));
  } catch (err) {
    console.error(`  ✗ Volume ${vol}: failed to fetch CasesMetadata.json — ${err.message}`);
    return { vol, ok: false, error: err.message, expected: 0, downloaded: 0, skipped: 0 };
  }

  try {
    await downloadToFile(`${volUrl}/VolumeMetadata.json`, volMetaPath);
  } catch (err) {
    console.warn(`  ⚠ Volume ${vol}: no VolumeMetadata.json — ${err.message}`);
  }

  // Download individual case files
  const expectedFiles = casesMetadata.map((c) => c.file_name);
  let downloaded = 0;
  let skipped = 0;

  for (const fileName of expectedFiles) {
    const destPath = path.join(casesDir, `${fileName}.json`);
    if (await fileExists(destPath)) {
      skipped++;
      continue;
    }
    try {
      await downloadToFile(`${volUrl}/cases/${fileName}.json`, destPath);
      downloaded++;
    } catch (err) {
      console.error(`  ✗ Volume ${vol} case ${fileName}: ${err.message}`);
    }
  }

  return { vol, ok: true, expected: expectedFiles.length, downloaded, skipped };
}
```

**Step 2: Commit**

```bash
git add scripts/download-case-law.mjs
git commit -m "feat: add volume download logic with skip-existing"
```

---

### Task 4: Add concurrency-limited batch runner and main entrypoint

**Files:**
- Modify: `scripts/download-case-law.mjs`

**Step 1: Add the batch runner and main function**

```js
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

async function main() {
  if (verifyOnly) {
    await verify();
    return;
  }

  const volumes = [];
  for (let v = startVol; v <= endVol; v++) volumes.push(v);

  const tasks = volumes.map((vol) => async () => {
    console.log(`Downloading volume ${vol}...`);
    const result = await downloadVolume(vol);
    if (result.ok) {
      console.log(`  ✓ Volume ${vol}: ${result.downloaded} downloaded, ${result.skipped} skipped, ${result.expected} total cases`);
    }
    return result;
  });

  const results = await runWithConcurrency(tasks, concurrency);

  // Summary
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const totalCases = succeeded.reduce((sum, r) => sum + r.expected, 0);
  const totalDownloaded = succeeded.reduce((sum, r) => sum + r.downloaded, 0);
  const totalSkipped = succeeded.reduce((sum, r) => sum + r.skipped, 0);

  console.log();
  console.log('=== SUMMARY ===');
  console.log(`Volumes:    ${succeeded.length} ok, ${failed.length} failed`);
  console.log(`Cases:      ${totalCases} expected, ${totalDownloaded} downloaded, ${totalSkipped} already existed`);

  if (failed.length > 0) {
    console.log();
    console.log('Failed volumes:');
    for (const f of failed) {
      console.log(`  Volume ${f.vol}: ${f.error}`);
    }
    process.exit(1);
  }

  // Write manifest for verification
  const manifestPath = path.join(outputDir, REPORTER, 'download-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify({
    completedAt: new Date().toISOString(),
    volumeRange: [startVol, endVol],
    totalVolumes: succeeded.length,
    totalCases,
    results: succeeded.map((r) => ({ vol: r.vol, cases: r.expected })),
  }, null, 2));
  console.log(`\nManifest written to ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 2: Test with a single volume**

Run: `node scripts/download-case-law.mjs --output data/case-law --start 1 --end 1`
Expected: Downloads volume 1 metadata + ~10 case JSON files into `data/case-law/us/1/`

**Step 3: Commit**

```bash
git add scripts/download-case-law.mjs
git commit -m "feat: add concurrent batch runner and main entrypoint"
```

---

### Task 5: Add verification command

**Files:**
- Modify: `scripts/download-case-law.mjs`

The `--verify` flag checks every downloaded volume against its `CasesMetadata.json` to confirm all case files exist locally. This is the key piece — you run this after download and it tells you exactly what's missing.

**Step 1: Add the verify function (before `main()`)**

```js
async function verify() {
  console.log('Verifying downloaded corpus...\n');

  let totalExpected = 0;
  let totalPresent = 0;
  const missing = [];

  for (let vol = startVol; vol <= endVol; vol++) {
    const volDir = path.join(outputDir, REPORTER, String(vol));
    const casesMetaPath = path.join(volDir, 'CasesMetadata.json');

    if (!(await fileExists(casesMetaPath))) {
      missing.push({ vol, file: 'CasesMetadata.json' });
      continue;
    }

    const casesMetadata = JSON.parse(await fs.readFile(casesMetaPath, 'utf8'));
    const expectedFiles = casesMetadata.map((c) => c.file_name);
    totalExpected += expectedFiles.length;

    const missingCases = [];
    for (const fileName of expectedFiles) {
      const casePath = path.join(volDir, 'cases', `${fileName}.json`);
      if (await fileExists(casePath)) {
        totalPresent++;
      } else {
        missingCases.push(fileName);
      }
    }

    if (missingCases.length > 0) {
      missing.push({ vol, file: 'cases', missingCases });
      console.log(`  ✗ Volume ${vol}: missing ${missingCases.length}/${expectedFiles.length} cases`);
    } else {
      console.log(`  ✓ Volume ${vol}: ${expectedFiles.length} cases OK`);
    }
  }

  console.log();
  console.log('=== VERIFICATION ===');
  console.log(`Cases: ${totalPresent}/${totalExpected} present`);

  if (missing.length === 0) {
    console.log('Status: COMPLETE — all files accounted for');
  } else {
    console.log(`Status: INCOMPLETE — ${missing.length} volumes have issues`);
    console.log();
    const reportPath = path.join(outputDir, REPORTER, 'verification-report.json');
    await fs.writeFile(reportPath, JSON.stringify({ missing, totalExpected, totalPresent }, null, 2));
    console.log(`Details written to ${reportPath}`);
    process.exit(1);
  }
}
```

**Step 2: Test verification after the volume 1 download from Task 4**

Run: `node scripts/download-case-law.mjs --output data/case-law --start 1 --end 1 --verify`
Expected: Reports volume 1 as complete

**Step 3: Commit**

```bash
git add scripts/download-case-law.mjs
git commit -m "feat: add --verify mode to confirm download completeness"
```

---

### Task 6: Add data/case-law to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add the data directory exclusion**

Append to `.gitignore`:
```
# Case law corpus (downloaded from static.case.law)
data/case-law/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore case law download directory"
```

---

### Task 7: Full download + verify

**Step 1: Run the full download**

Run: `node scripts/download-case-law.mjs --output data/case-law`

This downloads all 341 volumes with concurrency 5. Expect it to take a while (thousands of case files across all volumes). The script is idempotent — if interrupted, re-run and it skips already-downloaded files.

**Step 2: Verify completeness**

Run: `node scripts/download-case-law.mjs --output data/case-law --verify`

Expected: `Status: COMPLETE — all files accounted for`

If incomplete, re-run the download (step 1) — it only fetches what's missing. Then verify again.

**Step 3: Import to ArangoDB**

Run: `node scripts/import-case-law-to-arango.mjs --root data/case-law --reporters us`

---

## Usage Reference

```bash
# Download all volumes (idempotent, skips existing files)
node scripts/download-case-law.mjs --output data/case-law

# Download specific range
node scripts/download-case-law.mjs --output data/case-law --start 100 --end 200

# Verify completeness (no network requests for case files)
node scripts/download-case-law.mjs --output data/case-law --verify

# Adjust concurrency (default 5)
node scripts/download-case-law.mjs --output data/case-law --concurrency 10

# Import to ArangoDB after download
node scripts/import-case-law-to-arango.mjs --root data/case-law --reporters us
```
