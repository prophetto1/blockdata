#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function resolvePlaywright(repoRoot) {
  const candidates = [process.cwd(), repoRoot, path.join(repoRoot, 'web'), path.join(repoRoot, 'web-docs')];
  for (const basePath of candidates) {
    try {
      return require(require.resolve('playwright', { paths: [basePath] }));
    } catch {
      // keep trying
    }
  }
  throw new Error("Unable to resolve 'playwright'. Install dependencies in the workspace.");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toTextCandidates(input) {
  return Array.isArray(input)
    ? input
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : [];
}

async function waitForPageReady(page) {
  await page.waitForLoadState('load');
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // best effort
  }
}

function candidateButtonText(overlayOptions = {}) {
  const fromRequest = toTextCandidates(overlayOptions.triggerTextCandidates);
  return fromRequest.length > 0
    ? fromRequest
    : ['Add New', 'Add new', 'Create New', 'Create new', 'New', 'Add', 'Create'];
}

async function findPrimaryActionButton(page, overlayOptions = {}) {
  const names = candidateButtonText(overlayOptions);
  for (const name of names) {
    const locator = page.getByRole('button', { name, exact: false });
    const count = await locator.count();
    if (count > 0) {
      const first = locator.first();
      if (await first.isVisible().catch(() => false)) return first;
    }
  }

  const selector = String(overlayOptions.triggerSelector || '').trim();
  if (selector) {
    const bySelector = page.locator(selector);
    if ((await bySelector.count()) > 0 && (await bySelector.first().isVisible().catch(() => false))) {
      return bySelector.first();
    }
  }

  const generic = page.locator('button, [role="button"], [role="link"], [role="menuitem"]');
  const count = await generic.count();
  for (let i = 0; i < count; i += 1) {
    const el = generic.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;

    const label = ((await el.getAttribute('aria-label')) || '').toLowerCase();
    if (/(add|new|create|open|upload|import|configure|add new|create new)/i.test(label)) {
      return el;
    }
  }

  return null;
}

function resolveDialogSelector(overlayOptions = {}) {
  const forced = String(overlayOptions.overlaySelector || '').trim();
  if (forced) return forced;

  const dialogSelector = String(overlayOptions.dialogSelector || '').trim();
  if (dialogSelector) return dialogSelector;

  return '[role="dialog"]';
}

export async function measureOverlay(options) {
  const {
    url,
    width = 1920,
    height = 1080,
    storageStatePath,
    outputDir,
    repoRoot = process.cwd(),
    overlayOptions = {},
  } = options;

  const playwright = resolvePlaywright(repoRoot);
  const dialogSelector = resolveDialogSelector(overlayOptions);
  const contextOptions = {
    viewport: { width: Number(width), height: Number(height) },
    deviceScaleFactor: 1,
  };

  if (storageStatePath && fs.existsSync(storageStatePath)) {
    contextOptions.storageState = path.resolve(storageStatePath);
  }

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await waitForPageReady(page);

    const trigger = await findPrimaryActionButton(page, overlayOptions);
    if (!trigger) {
      throw new Error(
        `No primary action button found on ${url}. Provide overlayOptions.triggerTextCandidates for deterministic capture.`,
      );
    }

    const triggerText = (await trigger.innerText().catch(() => 'unknown')).trim() || 'unknown';
    await trigger.click();

    const hasDialog = await page.isVisible(dialogSelector).catch(() => false);
    if (!hasDialog) {
      await page.waitForSelector(dialogSelector, { state: 'visible', timeout: 10000 });
    }

    const dialogElement = page.locator(dialogSelector).first();
    const boundingBox = await dialogElement.boundingBox();
    const computedStyles = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        padding: style.padding,
      };
    }, dialogSelector);

    const report = {
      capture: {
        type: 'overlay',
        url,
        triggerText,
        dialogSelector,
        capturedAt: new Date().toISOString(),
        viewport: { width: Number(width), height: Number(height) },
      },
      dialog: {
        rect: boundingBox,
        style: computedStyles,
      },
      options: {
        triggerTextCandidates: toTextCandidates(overlayOptions.triggerTextCandidates),
        triggerSelector: overlayOptions.triggerSelector,
        overlaySelector: overlayOptions.overlaySelector,
        dialogSelector: overlayOptions.dialogSelector,
      },
    };

    ensureDir(outputDir);
    const reportPath = path.join(outputDir, 'overlay-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    await context.close();
    return { reportPath };
  } finally {
    await browser.close();
  }
}
