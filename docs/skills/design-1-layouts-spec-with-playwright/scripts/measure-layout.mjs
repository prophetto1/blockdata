import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

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

function resolvePlaywright() {
  const candidates = [
    process.cwd(),
    repoRoot,
    path.join(repoRoot, "web-docs"),
    path.join(repoRoot, "web"),
  ];

  for (const basePath of candidates) {
    try {
      const modulePath = require.resolve("playwright", { paths: [basePath] });
      return require(modulePath);
    } catch {
      // Try the next location.
    }
  }

  throw new Error(
    "Unable to resolve the 'playwright' package. Install it in the current workspace or provide a workspace that already includes it."
  );
}

function normalizeUrl(input) {
  if (!input) {
    throw new Error("Missing required --url argument.");
  }

  if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) {
    return input;
  }

  return pathToFileURL(path.resolve(input)).href;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function numberFrom(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

async function collectReport(page, capture) {
  return page.evaluate((captureState) => {
    function isVisible(element) {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function rectOf(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    }

    function summarizeElement(element) {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        className: element.className || null,
        text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
        rect: rectOf(element),
        style: {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          color: style.color,
          backgroundColor: style.backgroundColor,
          border: style.border,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          marginTop: style.marginTop,
          marginRight: style.marginRight,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          gap: style.gap,
          maxWidth: style.maxWidth,
        },
      };
    }

    function pickShell() {
      const candidates = Array.from(document.querySelectorAll("body *"))
        .filter(isVisible)
        .map((element) => ({
          element,
          rect: element.getBoundingClientRect(),
          style: getComputedStyle(element),
        }))
        .filter(({ rect, style }) => style.maxWidth !== "none" && rect.width >= window.innerWidth * 0.5)
        .map((entry) => ({
          ...entry,
          maxWidth: Number.parseFloat(entry.style.maxWidth),
          centeredness: Math.abs((window.innerWidth - entry.rect.width) / 2 - entry.rect.x),
        }))
        .filter(({ maxWidth }) => Number.isFinite(maxWidth));

      candidates.sort((left, right) => {
        if (left.centeredness !== right.centeredness) {
          return left.centeredness - right.centeredness;
        }
        return right.maxWidth - left.maxWidth;
      });

      return candidates[0]?.element || document.body;
    }

    function pickHero() {
      const candidates = Array.from(document.querySelectorAll("section, header, main > div, main > section"))
        .filter(isVisible)
        .filter((element) => element.querySelector("h1"));

      return candidates[0] || document.querySelector("h1")?.closest("section, header, main, div") || document.body;
    }

    function pickSearch() {
      return (
        document.querySelector('input[type="search"]') ||
        document.querySelector("input") ||
        document.querySelector("textarea")
      );
    }

    function pickCards() {
      const selector = [
        "[class*='card']",
        "[data-card]",
        "article",
        "li",
      ].join(", ");

      const unique = new Map();
      for (const element of document.querySelectorAll(selector)) {
        if (isVisible(element)) {
          unique.set(element, element);
        }
      }

      return Array.from(unique.values());
    }

    const shell = pickShell();
    const shellStyle = getComputedStyle(shell);
    const hero = pickHero();
    const heading = hero.querySelector("h1, h2, h3");
    const paragraph = hero.querySelector("p");
    const search = pickSearch();
    const cards = pickCards();

    return {
      capture: {
        page: {
          url: location.href,
          title: document.title,
        },
        viewport: captureState.viewport,
      },
      measurements: {
        shell: {
          ...rectOf(shell),
          maxWidth: Number.parseFloat(shellStyle.maxWidth),
          paddingLeft: Number.parseFloat(shellStyle.paddingLeft),
          paddingRight: Number.parseFloat(shellStyle.paddingRight),
        },
        hero: hero
          ? {
              ...rectOf(hero),
              heading: heading ? summarizeElement(heading).style : null,
              paragraph: paragraph ? summarizeElement(paragraph).style : null,
            }
          : null,
        search: search
          ? {
              ...rectOf(search),
              fontSize: getComputedStyle(search).fontSize,
              lineHeight: getComputedStyle(search).lineHeight,
              borderRadius: getComputedStyle(search).borderRadius,
              borderColor: getComputedStyle(search).borderColor,
              paddingLeft: Number.parseFloat(getComputedStyle(search).paddingLeft),
            }
          : null,
        cards: {
          count: cards.length,
          first: cards[0]
            ? {
                ...rectOf(cards[0]),
                radius: getComputedStyle(cards[0]).borderRadius,
                borderColor: getComputedStyle(cards[0]).borderColor,
              }
            : null,
        },
        sections: Array.from(document.querySelectorAll("header, nav, main, section, aside, footer"))
          .filter(isVisible)
          .slice(0, 20)
          .map((element) => summarizeElement(element)),
      },
    };
  }, capture);
}

export async function measureLayout(options) {
  const width = Number.parseInt(options.width ?? "1440", 10);
  const height = Number.parseInt(options.height ?? "1024", 10);
  const waitMs = Number.parseInt(options.waitMs ?? options["wait-ms"] ?? "0", 10);
  const browserName = options.browser ?? "chromium";
  const outputDir = path.resolve(options.outputDir ?? options["output-dir"] ?? path.join(repoRoot, "output", "playwright", "layout-measurements"));
  const jsonOut = path.resolve(options.jsonOut ?? options["json-out"] ?? path.join(outputDir, "report.json"));
  const targetUrl = normalizeUrl(options.url);

  ensureDir(outputDir);
  ensureDir(path.dirname(jsonOut));

  const playwright = resolvePlaywright();
  const browserType = playwright[browserName];
  if (!browserType) {
    throw new Error(`Unsupported browser '${browserName}'.`);
  }

  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    await page.goto(targetUrl, { waitUntil: "load" });
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // Some pages never reach networkidle. Keep the capture deterministic and continue.
    }

    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }

    const viewportScreenshot = path.join(outputDir, "viewport.png");
    const fullPageScreenshot = path.join(outputDir, "full-page.png");
    await page.screenshot({ path: viewportScreenshot, fullPage: false });
    await page.screenshot({ path: fullPageScreenshot, fullPage: true });

    const capture = {
      browser: browserName,
      capturedAt: new Date().toISOString(),
      viewport: { width, height, deviceScaleFactor: 1 },
      artifacts: {
        viewportScreenshot,
        fullPageScreenshot,
      },
    };

    const report = await collectReport(page, capture);
    const finalReport = {
      capture: {
        ...capture,
        page: report.capture.page,
      },
      measurements: report.measurements,
    };

    fs.writeFileSync(jsonOut, `${JSON.stringify(finalReport, null, 2)}\n`, "utf8");
    return finalReport;
  } finally {
    await browser.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await measureLayout(options);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
