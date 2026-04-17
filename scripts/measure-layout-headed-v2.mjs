#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export { deriveCaptureSlug, deriveDefaultOutputDir } from "./measure-layout-headed.mjs";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

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

function normalizeUrl(input) {
  if (!input) {
    throw new Error("Missing required --url argument.");
  }

  if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) {
    return input;
  }

  return pathToFileURL(path.resolve(input)).href;
}

function booleanFlag(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
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

async function waitForPageReady(page, waitMs) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // Some apps never settle fully.
  }

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}

async function resetViewportState(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);

    const scrollables = Array.from(document.querySelectorAll("*")).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const isScrollableY = /(auto|scroll)/.test(style.overflowY);
      const isScrollableX = /(auto|scroll)/.test(style.overflowX);
      return isScrollableY || isScrollableX;
    });

    for (const element of scrollables) {
      element.scrollTop = 0;
      element.scrollLeft = 0;
    }

    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function applyThemeState(page, options, passTheme) {
  const themeToggleSelector = options.themeToggleSelector ?? options["theme-toggle-selector"];
  const themeToggleWaitMs = Number.parseInt(
    options.themeToggleWaitMs ?? options["theme-toggle-wait-ms"] ?? "400",
    10
  );

  if (passTheme === "light" || passTheme === "dark") {
    await page.emulateMedia({ colorScheme: passTheme });
  } else {
    await page.emulateMedia({ colorScheme: null });
  }

  if (themeToggleSelector) {
    const currentTheme = await page.evaluate(() =>
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    );

    if (passTheme !== "system" && currentTheme !== passTheme) {
      const toggle = page.locator(themeToggleSelector).first();
      if (await toggle.count()) {
        await toggle.click();
        await page.waitForTimeout(themeToggleWaitMs);
      }
    }
  }
}

async function collectReport(page, capture) {
  return page.evaluate((captureState) => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    function textSnippet(text, limit = 140) {
      return String(text || "").trim().replace(/\s+/g, " ").slice(0, limit);
    }

    function isElement(node) {
      return node instanceof HTMLElement;
    }

    function parsePx(value, fallback = null) {
      if (value === null || value === undefined) return fallback;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const normalized = String(value).trim().toLowerCase();
      if (!normalized || normalized === "normal" || normalized === "none" || normalized === "auto") {
        return fallback;
      }
      const parsed = Number.parseFloat(normalized.replace("px", ""));
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizeNumber(value) {
      return Number(Number(value).toFixed(2));
    }

    function isTransparentColor(value) {
      const normalized = String(value || "").replace(/\s+/g, "").toLowerCase();
      return (
        !normalized ||
        normalized === "transparent" ||
        normalized === "rgba(0,0,0,0)" ||
        normalized === "rgb(0,0,0,0)" ||
        /rgba?\([^)]*,0(?:\.0+)?\)$/.test(normalized)
      );
    }

    function selectorPath(element) {
      if (!element || !(element instanceof Element)) return null;
      if (element === document.body) return "body";

      const parts = [];
      let current = element;

      while (current && current !== document.body && parts.length < 7) {
        let part = current.tagName.toLowerCase();

        if (current.id) {
          part += `#${current.id}`;
          parts.unshift(part);
          break;
        }

        if (current.classList.length > 0) {
          part += `.${Array.from(current.classList).slice(0, 2).join(".")}`;
        }

        parts.unshift(part);
        current = current.parentElement;
      }

      return parts.join(" > ");
    }

    function isVisible(element) {
      if (!isElement(element)) return false;

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

    function isInViewport(element) {
      if (!isVisible(element)) return false;

      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && rect.top < viewport.height && rect.left < viewport.width;
    }

    function rectOf(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: normalizeNumber(rect.x),
        y: normalizeNumber(rect.y),
        width: normalizeNumber(rect.width),
        height: normalizeNumber(rect.height),
      };
    }

    function absoluteRectOf(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: normalizeNumber(rect.x + window.scrollX),
        y: normalizeNumber(rect.y + window.scrollY),
        width: normalizeNumber(rect.width),
        height: normalizeNumber(rect.height),
      };
    }

    function styleSnapshot(element) {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        position: style.position,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        color: style.color,
        backgroundColor: style.backgroundColor,
        border: style.border,
        borderColor: style.borderColor,
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
      };
    }

    function summarizeElement(element, label = null) {
      return {
        label,
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        role: element.getAttribute("role"),
        className: typeof element.className === "string" ? element.className : null,
        selector: selectorPath(element),
        text: textSnippet(element.textContent || ""),
        rect: rectOf(element),
        absoluteRect: absoluteRectOf(element),
        style: styleSnapshot(element),
      };
    }

    function queryVisible(root, selectors) {
      if (!root) return [];

      const seen = new Set();
      const results = [];

      for (const selector of selectors) {
        for (const node of root.querySelectorAll(selector)) {
          if (!seen.has(node) && isVisible(node)) {
            seen.add(node);
            results.push(node);
          }
        }
      }

      return results;
    }

    function firstVisible(root, selectors) {
      if (!root) return null;

      for (const selector of selectors) {
        const node = root.querySelector(selector);
        if (node && isVisible(node)) return node;
      }
      return null;
    }

    function firstVisibleByText(root, selectors, matcher) {
      const nodes = queryVisible(root, selectors);
      return nodes.find((element) => matcher(textSnippet(element.textContent || "", 200).toLowerCase(), element)) || null;
    }

    function classHints(element) {
      const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
      const id = String(element.id || "").toLowerCase();
      return `${element.tagName.toLowerCase()} ${className} ${id}`;
    }

    function area(rect) {
      return rect.width * rect.height;
    }

    function countDescendants(element, selectors) {
      let count = 0;
      for (const selector of selectors) {
        count += element.querySelectorAll(selector).length;
      }
      return count;
    }

    function buildContainerCandidate(element) {
      const rect = element.getBoundingClientRect();
      const hints = classHints(element);
      return {
        element,
        rect,
        area: area(rect),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        widthRatio: rect.width / viewport.width,
        heightRatio: rect.height / viewport.height,
        areaRatio: area(rect) / (viewport.width * viewport.height),
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute("role"),
        selector: selectorPath(element),
        className: typeof element.className === "string" ? element.className : null,
        hints,
        text: textSnippet(element.textContent || "", 200),
        interactiveCount: countDescendants(element, [
          "button",
          "a",
          "input",
          "select",
          "textarea",
          "[role='button']",
          "[role='tab']",
          "[role='link']",
        ]),
        tabCount: countDescendants(element, ["[role='tab']", "[role='tablist']"]),
        searchCount: countDescendants(element, ["input[type='search']", "input[placeholder*='Search']"]),
        listCount: countDescendants(element, ["ul", "ol", "[role='list']", "[role='tree']", "[role='navigation']"]),
        visibleChildCount: Array.from(element.children).filter(isVisible).length,
      };
    }

    function dedupeElements(elements) {
      const seen = new Set();
      const results = [];
      for (const element of elements) {
        if (!element || seen.has(element)) continue;
        seen.add(element);
        results.push(element);
      }
      return results;
    }

    function collectContainerCandidates(root) {
      const rawElements = [
        root,
        ...Array.from(root.querySelectorAll("main, aside, nav, section, article, header, div")),
      ];

      return dedupeElements(rawElements)
        .filter(isVisible)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= viewport.width * 0.08 && rect.height >= viewport.height * 0.08;
        })
        .map(buildContainerCandidate);
    }

    function rankCandidates(candidates, scorer, limit = 5) {
      return candidates
        .map((candidate) => ({ candidate, score: scorer(candidate) }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
    }

    function hintsInclude(candidate, fragments) {
      return fragments.some((fragment) => candidate.hints.includes(fragment));
    }

    function pickCandidate(ranked, excludedElements = []) {
      for (const entry of ranked) {
        const isExcluded = excludedElements.some(
          (element) => element && (element === entry.candidate.element || entry.candidate.element.contains(element))
        );
        if (!isExcluded) {
          return entry.candidate.element;
        }
      }
      return null;
    }

    function collectVisibleNodes(root) {
      if (!root) return [];

      const descendants = Array.from(root.querySelectorAll("*")).filter(isVisible).filter(isInViewport);
      const largeNodes = descendants
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= 24 && rect.height >= 24;
        })
        .sort((left, right) => area(right.getBoundingClientRect()) - area(left.getBoundingClientRect()))
        .slice(0, 200);
      const interactiveNodes = descendants
        .filter((element) => element.matches("button, a, input, select, textarea, [role='button'], [role='tab']"))
        .slice(0, 120);
      const textNodes = descendants
        .filter((element) => textSnippet(element.textContent || "", 80).length > 0)
        .slice(0, 160);

      return dedupeElements([root, ...largeNodes, ...interactiveNodes, ...textNodes]);
    }

    function dominantEntries(map, limit = 8) {
      return [...map.values()]
        .sort((left, right) => right.count - left.count)
        .slice(0, limit)
        .map(({ value, count }) => ({ value, count }));
    }

    function collectStyleSummary(root, actionButtons, tabStrip) {
      const colorMaps = {
        backgrounds: new Map(),
        text: new Map(),
        borders: new Map(),
        accents: new Map(),
        radii: new Map(),
        shadows: new Map(),
        families: new Map(),
      };
      const fontSizes = [];
      const lineHeights = [];
      const fontWeights = [];
      const gapValues = [];
      const paddingValues = [];
      const marginValues = [];
      const typographySamples = [];

      function recordValue(map, value) {
        if (value === null || value === undefined || value === "") return;
        const key = typeof value === "number" ? String(value) : String(value).replace(/\s+/g, " ").trim();
        if (!key) return;
        const entry = map.get(key) ?? { value: typeof value === "number" ? value : key, count: 0 };
        entry.count += 1;
        map.set(key, entry);
      }

      function collectNumericValues(bucket, values) {
        for (const value of values) {
          if (Number.isFinite(value) && value > 0) {
            bucket.push(value);
          }
        }
      }

      const nodes = collectVisibleNodes(root);
      const accentElements = dedupeElements([
        ...(actionButtons || []),
        ...(tabStrip ? Array.from(tabStrip.querySelectorAll("button, [role='tab']")) : []),
      ]);

      for (const element of nodes) {
        const style = getComputedStyle(element);
        const text = textSnippet(element.textContent || "", 120);
        const backgroundColor = style.backgroundColor;
        const color = style.color;
        const borderColor = style.borderColor;
        const borderRadius = parsePx(style.borderRadius);
        const boxShadow = style.boxShadow;
        const fontSize = parsePx(style.fontSize);
        const lineHeight = parsePx(style.lineHeight, fontSize ? fontSize * 1.25 : null);
        const fontWeight = Number.parseInt(style.fontWeight, 10);
        const gap = parsePx(style.gap);
        const paddings = [
          parsePx(style.paddingTop),
          parsePx(style.paddingRight),
          parsePx(style.paddingBottom),
          parsePx(style.paddingLeft),
        ];
        const margins = [
          parsePx(style.marginTop),
          parsePx(style.marginRight),
          parsePx(style.marginBottom),
          parsePx(style.marginLeft),
        ];

        if (!isTransparentColor(backgroundColor)) {
          recordValue(colorMaps.backgrounds, backgroundColor);
        }

        if (text) {
          if (!isTransparentColor(color)) {
            recordValue(colorMaps.text, color);
          }
          if (style.fontFamily) {
            recordValue(colorMaps.families, style.fontFamily);
          }
          if (Number.isFinite(fontSize)) fontSizes.push(fontSize);
          if (Number.isFinite(lineHeight)) lineHeights.push(lineHeight);
          if (Number.isFinite(fontWeight)) fontWeights.push(fontWeight);
          if (typographySamples.length < 20) {
            typographySamples.push({
              selector: selectorPath(element),
              text,
              fontSize: fontSize ? Math.round(fontSize) : null,
              lineHeight: lineHeight ? Math.round(lineHeight) : null,
              fontWeight: Number.isFinite(fontWeight) ? fontWeight : null,
              fontFamily: style.fontFamily,
            });
          }
        }

        if (style.borderStyle && style.borderStyle !== "none" && !isTransparentColor(borderColor)) {
          recordValue(colorMaps.borders, borderColor);
        }

        if (Number.isFinite(borderRadius) && borderRadius > 0) {
          recordValue(colorMaps.radii, Math.round(borderRadius));
        }

        if (boxShadow && boxShadow !== "none") {
          recordValue(colorMaps.shadows, boxShadow);
        }

        collectNumericValues(gapValues, [gap]);
        collectNumericValues(paddingValues, paddings);
        collectNumericValues(marginValues, margins);
      }

      for (const element of accentElements) {
        if (!element || !isVisible(element)) continue;
        const style = getComputedStyle(element);
        if (!isTransparentColor(style.backgroundColor)) {
          recordValue(colorMaps.accents, style.backgroundColor);
        }
        if (!isTransparentColor(style.color)) {
          recordValue(colorMaps.accents, style.color);
        }
      }

      function normalizeScale(values) {
        const sorted = [...values].filter(Number.isFinite).sort((left, right) => left - right);
        const result = [];
        for (const value of sorted) {
          const rounded = Math.round(value);
          if (result.length === 0 || Math.abs(rounded - result[result.length - 1]) > 1) {
            result.push(rounded);
          }
        }
        return result;
      }

      return {
        theme: {
          backgrounds: dominantEntries(colorMaps.backgrounds),
          text: dominantEntries(colorMaps.text),
          borders: dominantEntries(colorMaps.borders),
          accents: dominantEntries(colorMaps.accents),
          radii: dominantEntries(colorMaps.radii),
          shadows: dominantEntries(colorMaps.shadows),
        },
        typography: {
          families: dominantEntries(colorMaps.families, 6),
          scale: {
            fontSizes: normalizeScale(fontSizes),
            lineHeights: normalizeScale(lineHeights),
            fontWeights: normalizeScale(fontWeights),
          },
          samples: typographySamples,
        },
        spacing: {
          gap: normalizeScale(gapValues),
          padding: normalizeScale(paddingValues),
          margin: normalizeScale(marginValues),
        },
      };
    }

    const requestedPageMode = captureState.requestedPageMode;
    const appFrameCandidates = collectContainerCandidates(document.body);
    const rankedAppFrames = rankCandidates(appFrameCandidates, (candidate) => {
      let score = 0;
      if (candidate.widthRatio >= 0.55) score += 35;
      if (candidate.heightRatio >= 0.45) score += 35;
      score += candidate.areaRatio * 140;
      if (candidate.tag === "main" || candidate.role === "main") score += 30;
      if (hintsInclude(candidate, ["app", "shell", "workspace", "frame", "content", "root"])) score += 18;
      if (candidate.interactiveCount >= 4) score += 12;
      if (candidate.visibleChildCount >= 3) score += 10;
      if (candidate.top <= 24) score += 6;
      if (candidate.left <= 24) score += 6;
      if (candidate.heightRatio < 0.2) score -= 40;
      return score;
    });
    const appFrame = rankedAppFrames[0]?.candidate?.element || document.querySelector("main") || document.body;
    if (appFrame) appFrame.setAttribute("data-layout-label", "appFrame");

    const appFrameRect = appFrame.getBoundingClientRect();
    const frameCandidates = collectContainerCandidates(appFrame);
    const rankedTopToolbar = rankCandidates(frameCandidates, (candidate) => {
      let score = 0;
      if (candidate.bottom <= appFrameRect.top + viewport.height * 0.35) score += 20;
      if (candidate.widthRatio >= 0.45) score += 20;
      if (candidate.rect.height >= 36 && candidate.rect.height <= 120) score += 22;
      if (candidate.rect.height > 140) score -= 80;
      if (candidate.areaRatio > 0.35) score -= 60;
      if (candidate.tag === "header" || candidate.role === "banner") score += 30;
      if (hintsInclude(candidate, ["header", "toolbar", "topbar", "nav"])) score += 16;
      if (candidate.interactiveCount >= 2) score += 12;
      if (Math.abs(candidate.top - appFrameRect.top) <= 32) score += 12;
      if (candidate.bottom > appFrameRect.top + 180) score -= 30;
      return score;
    });
    const topToolbar =
      rankedTopToolbar[0]?.candidate?.element ||
      firstVisible(appFrame, ["header", "[role='banner']", ".toolbar", ".topbar", "[data-toolbar]"]);
    if (topToolbar) topToolbar.setAttribute("data-layout-label", "topToolbar");

    const contentTop = topToolbar ? topToolbar.getBoundingClientRect().bottom + 4 : appFrameRect.top;
    const regionCandidates = frameCandidates.filter((candidate) => {
      if (candidate.element === appFrame || candidate.element === topToolbar) return false;
      return candidate.bottom > contentTop && candidate.rect.height >= viewport.height * 0.2;
    });

    const rankedLeftRail = rankCandidates(regionCandidates, (candidate) => {
      let score = 0;
      if (candidate.top >= contentTop - 8) score += 12;
      if (candidate.left <= appFrameRect.left + appFrameRect.width * 0.18) score += 26;
      if (candidate.centerX <= appFrameRect.left + appFrameRect.width * 0.28) score += 18;
      if (candidate.rect.width >= 140 && candidate.rect.width <= appFrameRect.width * 0.38) score += 20;
      if (candidate.rect.height >= appFrameRect.height * 0.45) score += 24;
      if (candidate.tag === "aside" || candidate.tag === "nav" || candidate.role === "navigation") score += 14;
      if (hintsInclude(candidate, ["left", "rail", "sidebar", "explorer", "nav", "panel"])) score += 18;
      if (candidate.searchCount > 0) score += 10;
      if (candidate.listCount > 0 || candidate.interactiveCount >= 3) score += 10;
      if (candidate.right >= appFrameRect.left + appFrameRect.width * 0.7) score -= 30;
      if (candidate.areaRatio > 0.5) score -= 16;
      return score;
    });
    const leftRail = pickCandidate(rankedLeftRail, [topToolbar, appFrame]);
    if (leftRail) leftRail.setAttribute("data-layout-label", "leftRail");

    const rankedRightRail = rankCandidates(regionCandidates, (candidate) => {
      let score = 0;
      if (candidate.top >= contentTop - 8) score += 12;
      if (candidate.right >= appFrameRect.right - appFrameRect.width * 0.18) score += 26;
      if (candidate.centerX >= appFrameRect.left + appFrameRect.width * 0.72) score += 18;
      if (candidate.rect.width >= 160 && candidate.rect.width <= appFrameRect.width * 0.4) score += 20;
      if (candidate.rect.height >= appFrameRect.height * 0.35) score += 20;
      if (candidate.tag === "aside") score += 10;
      if (hintsInclude(candidate, ["right", "inspector", "detail", "config", "panel", "aside"])) score += 18;
      if (candidate.interactiveCount >= 2) score += 8;
      if (candidate.left <= appFrameRect.left + appFrameRect.width * 0.3) score -= 26;
      if (candidate.areaRatio > 0.55) score -= 14;
      return score;
    });
    const rightRail = pickCandidate(rankedRightRail, [topToolbar, appFrame, leftRail]);
    if (rightRail) rightRail.setAttribute("data-layout-label", "rightRail");

    const rankedMainCanvas = rankCandidates(regionCandidates, (candidate) => {
      let score = 0;
      if (candidate.top >= contentTop - 8) score += 12;
      if (
        candidate.centerX >= appFrameRect.left + appFrameRect.width * 0.3 &&
        candidate.centerX <= appFrameRect.left + appFrameRect.width * 0.7
      ) {
        score += 24;
      }
      if (candidate.rect.width >= appFrameRect.width * 0.28) score += 24;
      if (candidate.rect.height >= appFrameRect.height * 0.45) score += 24;
      if (candidate.tabCount > 0) score += 14;
      if (candidate.interactiveCount >= 2) score += 8;
      if (hintsInclude(candidate, ["main", "canvas", "editor", "content", "workspace", "pane"])) score += 16;
      if (leftRail && candidate.left <= leftRail.getBoundingClientRect().right - 12) score -= 18;
      if (rightRail && candidate.right >= rightRail.getBoundingClientRect().left + 12) score -= 18;
      if ((leftRail && candidate.element.contains(leftRail)) || (rightRail && candidate.element.contains(rightRail))) score -= 40;
      if (candidate.element === appFrame) score -= 40;
      if (candidate.areaRatio > 0.9) score -= 24;
      return score;
    });
    const mainCanvas =
      pickCandidate(rankedMainCanvas, [topToolbar, appFrame, leftRail, rightRail]) ||
      firstVisible(appFrame, ["main", "[role='main']", ".main-pane", ".canvas", ".content"]);
    if (mainCanvas) mainCanvas.setAttribute("data-layout-label", "mainCanvas");

    const datasetSelector =
      leftRail &&
      firstVisible(leftRail, ["button[aria-haspopup='listbox']", "[role='combobox']", "select"]);

    const searchInput =
      leftRail &&
      firstVisible(leftRail, [
        "input[type='search']",
        "input[placeholder*='Search']",
        "input",
        "textarea",
      ]);

    const fieldList =
      leftRail &&
      rankCandidates(
        collectContainerCandidates(leftRail).filter((candidate) => candidate.element !== leftRail),
        (candidate) => {
          let score = 0;
          if (candidate.rect.height >= 120) score += 20;
          if (candidate.listCount > 0) score += 16;
          if (candidate.interactiveCount >= 2) score += 14;
          if (hintsInclude(candidate, ["field", "list", "tree", "results", "items"])) score += 18;
          if (candidate.element === searchInput || candidate.element === datasetSelector) score -= 30;
          return score;
        },
        3
      )[0]?.candidate?.element;

    const tabStrip =
      mainCanvas &&
      (firstVisible(mainCanvas, ["[role='tablist']", ".tabs", ".tabstrip", ".tablist"]) ||
        firstVisibleByText(
          mainCanvas,
          ["div", "nav", "section"],
          (text) => text.includes("results") && text.includes("sql")
        ));

    const emptyState =
      mainCanvas &&
      firstVisibleByText(
        mainCanvas,
        ["p", "div", "span"],
        (text) =>
          text.includes("select fields to see results") ||
          text.includes("no data") ||
          text.includes("empty")
      );

    const actionButtons = topToolbar
      ? queryVisible(topToolbar, ["button", "a"])
          .filter((element) => textSnippet(element.textContent || "", 60).length > 0)
          .slice(0, 12)
      : [];

    function componentKind(element) {
      if (!(element instanceof HTMLElement)) return "unknown";

      const role = element.getAttribute("role");
      const tag = element.tagName.toLowerCase();
      const text = textSnippet(element.textContent || "", 120).toLowerCase();
      const hints = classHints(element);

      if (role === "tab" || text === "results" || text === "sql" || text === "component") return "tab";
      if (tag === "input" || tag === "textarea" || role === "textbox" || role === "searchbox") return "input";
      if (tag === "button") return "button";
      if (tag === "a") return "link";
      if (role === "navigation" || tag === "nav") return "navigation";
      if (role === "list" || role === "tree" || tag === "ul" || tag === "ol") return "list";
      if (text.includes("select fields to see results") || text.includes("no fields selected")) return "empty-state";
      if (hints.includes("card")) return "card";
      if (tag === "aside") return "aside";
      if (tag === "header") return "header";
      if (tag === "main") return "main";
      if (tag === "section") return "section";
      return "container";
    }

    function componentInventory(root, limit = 60) {
      if (!root) return [];

      const selectors = [
        "button",
        "a",
        "input",
        "textarea",
        "select",
        "[role='tab']",
        "[role='tablist']",
        "[role='navigation']",
        "[role='list']",
        "[role='tree']",
        "header",
        "nav",
        "aside",
        "section",
        "[data-card]",
        "[class*='card']",
        "[class*='empty']",
      ];

      return queryVisible(root, selectors)
        .filter(isInViewport)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= 16 && rect.height >= 16;
        })
        .slice(0, limit)
        .map((element) => ({
          kind: componentKind(element),
          ...summarizeElement(element),
        }));
    }

    function repeatedItemsInventory(root) {
      if (!root) return [];

      return queryVisible(root, ["button", "a", "li", "div"])
        .filter(isInViewport)
        .map((element) => textSnippet(element.textContent || "", 80))
        .filter(Boolean)
        .filter((text, index, array) => array.indexOf(text) === index)
        .slice(0, 20);
    }

    function visibleSections(root) {
      if (!root) return [];
      return queryVisible(root, ["header", "nav", "main", "section", "aside", "footer"])
        .filter(isInViewport)
        .slice(0, 24)
        .map((element) => summarizeElement(element));
    }

    function themeTokens(elements) {
      return elements
        .filter(Boolean)
        .map((element) => {
          const style = getComputedStyle(element);
          return {
            label: element.getAttribute("data-layout-label") || element.tagName.toLowerCase(),
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            boxShadow: style.boxShadow,
          };
        });
    }

    function collectCoordinateDiagnostics(elements) {
      return elements.filter(Boolean).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: selectorPath(element),
          viewportRect: {
            x: normalizeNumber(rect.x),
            y: normalizeNumber(rect.y),
            width: normalizeNumber(rect.width),
            height: normalizeNumber(rect.height),
          },
          scroll: {
            x: window.scrollX,
            y: window.scrollY,
          },
          offsetTop: element.offsetTop ?? null,
          offsetLeft: element.offsetLeft ?? null,
        };
      });
    }

    function describeRegionCandidates(entries) {
      return entries.map(({ candidate, score }) => ({
        selector: candidate.selector,
        score: normalizeNumber(score),
        rect: {
          x: normalizeNumber(candidate.rect.x),
          y: normalizeNumber(candidate.rect.y),
          width: normalizeNumber(candidate.rect.width),
          height: normalizeNumber(candidate.rect.height),
        },
      }));
    }

    function keyAreaSummary(element, label) {
      if (!element) return null;
      const summary = summarizeElement(element, label);
      return {
        label,
        selector: summary.selector,
        text: summary.text,
        rect: summary.rect,
      };
    }

    let pageMode = "app-shell";
    if (requestedPageMode && requestedPageMode !== "auto") {
      pageMode = requestedPageMode;
    } else if (leftRail && mainCanvas && rightRail) {
      pageMode = "workbench";
    } else if (leftRail && mainCanvas) {
      pageMode = "dashboard";
    } else if (
      queryVisible(document, ["h1", "h2"]).some((element) => parsePx(getComputedStyle(element).fontSize, 0) >= 28)
    ) {
      pageMode = "marketing";
    }

    const styleSummary = collectStyleSummary(document.body, actionButtons, tabStrip);
    const combinedSpacing = [...styleSummary.spacing.gap, ...styleSummary.spacing.padding, ...styleSummary.spacing.margin]
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((left, right) => left - right);

    return {
      summary: {
        pageMode,
        resolvedTheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        keyAreas: {
          appFrame: keyAreaSummary(appFrame, "appFrame"),
          topToolbar: keyAreaSummary(topToolbar, "topToolbar"),
          leftRail: keyAreaSummary(leftRail, "leftRail"),
          mainCanvas: keyAreaSummary(mainCanvas, "mainCanvas"),
          rightRail: keyAreaSummary(rightRail, "rightRail"),
        },
        designSystem: {
          dominantBackgrounds: styleSummary.theme.backgrounds.map((entry) => entry.value),
          accentColors: styleSummary.theme.accents.map((entry) => entry.value),
          typographyScale: styleSummary.typography.scale.fontSizes,
          spacingScale: combinedSpacing,
        },
      },
      capture: {
        ...captureState,
        page: {
          url: location.href,
          title: document.title,
        },
        runtime: {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        resolvedTheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        pageMode,
      },
      measurements: {
        appFrame: appFrame ? summarizeElement(appFrame, "appFrame") : null,
        topToolbar: topToolbar ? summarizeElement(topToolbar, "topToolbar") : null,
        shellRow: mainCanvas?.parentElement ? summarizeElement(mainCanvas.parentElement, "shellRow") : null,
        leftRail: leftRail ? summarizeElement(leftRail, "leftRail") : null,
        rightRail: rightRail ? summarizeElement(rightRail, "rightRail") : null,
        datasetSelector: datasetSelector ? summarizeElement(datasetSelector, "datasetSelector") : null,
        searchInput: searchInput ? summarizeElement(searchInput, "searchInput") : null,
        fieldList: fieldList
          ? {
              ...summarizeElement(fieldList, "fieldList"),
              itemsPreview: repeatedItemsInventory(fieldList).slice(0, 12),
            }
          : null,
        mainCanvas: mainCanvas ? summarizeElement(mainCanvas, "mainCanvas") : null,
        tabStrip: tabStrip ? summarizeElement(tabStrip, "tabStrip") : null,
        emptyState: emptyState ? summarizeElement(emptyState, "emptyState") : null,
        actionButtons: actionButtons.map((element) => summarizeElement(element, "actionButton")),
        visibleSections: visibleSections(appFrame),
      },
      components: {
        appFrameInventory: componentInventory(appFrame),
        leftRailInventory: componentInventory(leftRail),
        mainCanvasInventory: componentInventory(mainCanvas),
        rightRailInventory: componentInventory(rightRail),
        repeatedItems: {
          fieldList: repeatedItemsInventory(fieldList),
        },
      },
      theme: {
        tokens: themeTokens([document.body, appFrame, topToolbar, leftRail, mainCanvas, rightRail, ...actionButtons.slice(0, 2)]),
        summary: styleSummary.theme,
      },
      typography: styleSummary.typography,
      spacing: {
        scale: {
          core: combinedSpacing,
          gap: styleSummary.spacing.gap,
          padding: styleSummary.spacing.padding,
          margin: styleSummary.spacing.margin,
        },
      },
      diagnostics: {
        coordinates: collectCoordinateDiagnostics([appFrame, topToolbar, leftRail, mainCanvas, rightRail]),
        regionCandidates: {
          appFrame: describeRegionCandidates(rankedAppFrames),
          topToolbar: describeRegionCandidates(rankedTopToolbar),
          leftRail: describeRegionCandidates(rankedLeftRail),
          mainCanvas: describeRegionCandidates(rankedMainCanvas),
          rightRail: describeRegionCandidates(rankedRightRail),
        },
      },
      notes: {
        measuredState: "visible-rendered-state-only",
        themeRule: "Each theme is a separate measured pass. Do not merge light and dark observations.",
        captureOrder: "DOM measured before screenshots.",
        v2Rule: "Regions are inferred from scored visible descendants, and design scales are normalized from rendered styles.",
      },
    };
  }, capture);
}

async function savePassArtifacts(page, passDir, report) {
  ensureDir(passDir);

  const viewportScreenshot = path.join(passDir, "viewport.png");
  const fullPageScreenshot = path.join(passDir, "full-page.png");
  const reportPath = path.join(passDir, "report.json");

  await page.screenshot({ path: viewportScreenshot, fullPage: false, scale: "css" });
  await page.screenshot({ path: fullPageScreenshot, fullPage: true, scale: "css" });

  const reportWithArtifacts = {
    ...report,
    capture: {
      ...report.capture,
      artifacts: {
        viewportScreenshot,
        fullPageScreenshot,
        reportPath,
      },
    },
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(reportWithArtifacts, null, 2)}\n`, "utf8");

  return {
    reportPath,
    viewportScreenshot,
    fullPageScreenshot,
  };
}

async function runPass(page, options, passTheme, outputDir) {
  await applyThemeState(page, options, passTheme);
  await waitForPageReady(page, Number.parseInt(options.waitMs ?? options["wait-ms"] ?? "0", 10));
  await resetViewportState(page);

  const vp = page.viewportSize();
  const innerSize = vp || (await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })));
  const capture = {
    browser: options.browser ?? "chromium",
    capturedAt: new Date().toISOString(),
    viewport: {
      width: innerSize.width,
      height: innerSize.height,
      deviceScaleFactor: 1,
    },
    requestedTheme: passTheme,
    requestedPageMode: options.pageMode ?? options["page-mode"] ?? "auto",
  };

  const report = await collectReport(page, capture);

  const passDir = path.join(outputDir, passTheme);
  const artifacts = await savePassArtifacts(page, passDir, report);

  return {
    theme: passTheme,
    dir: passDir,
    artifacts,
    report: {
      ...report,
      capture: {
        ...report.capture,
        artifacts,
      },
    },
  };
}

function determineThemes(options) {
  if (booleanFlag(options.captureBothThemes ?? options["capture-both-themes"], false)) {
    return ["light", "dark"];
  }

  const requestedTheme = options.theme ?? "system";
  if (requestedTheme === "light" || requestedTheme === "dark" || requestedTheme === "system") {
    return [requestedTheme];
  }

  return ["system"];
}

export async function measureLayout(options) {
  const width = Number.parseInt(options.width ?? "1920", 10);
  const height = Number.parseInt(options.height ?? "1080", 10);
  const browserName = options.browser ?? "chromium";
  const targetUrl = normalizeUrl(options.url);
  const { deriveDefaultOutputDir } = await import("./measure-layout-headed.mjs");
  const outputDir = path.resolve(
    options.outputDir ??
      options["output-dir"] ??
      deriveDefaultOutputDir({
        repoRoot,
        targetUrl,
        width,
        height,
      })
  );
  const jsonOut = path.resolve(options.jsonOut ?? options["json-out"] ?? path.join(outputDir, "report.json"));

  ensureDir(outputDir);
  ensureDir(path.dirname(jsonOut));

  const playwright = resolvePlaywright();
  const browserType = playwright[browserName];
  if (!browserType) {
    throw new Error(`Unsupported browser '${browserName}'.`);
  }

  const cdpEndpoint = options.cdpEndpoint ?? options["cdp-endpoint"];
  let browser;

  if (cdpEndpoint) {
    process.stderr.write(`Connecting via CDP to ${cdpEndpoint}...\n`);
    browser = await browserType.connectOverCDP(cdpEndpoint, {
      isLocal: /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(cdpEndpoint),
    });
  } else {
    const headed = booleanFlag(options.headed, false);
    const channel = options.channel ?? options["browser-channel"];
    const stealth = booleanFlag(options.stealth, true);
    const launchOptions = { headless: !headed };
    if (channel) launchOptions.channel = channel;
    if (stealth) {
      launchOptions.ignoreDefaultArgs = ["--enable-automation"];
      launchOptions.args = ["--disable-blink-features=AutomationControlled"];
    }
    browser = await browserType.launch(launchOptions);
  }

  try {
    let page;
    if (cdpEndpoint) {
      const ctx = browser.contexts()[0];
      if (!ctx) throw new Error("No browser context found over CDP");
      const pages = ctx.pages();
      const matchSubstr = options.waitForUrlContains ?? options["wait-for-url-contains"];
      page = (matchSubstr ? pages.find((candidate) => candidate.url().includes(matchSubstr)) : pages[0]) || pages[0];
      if (!page) throw new Error("No open page found via CDP");
      process.stderr.write(`Attached to page: ${page.url()}\n`);
      await waitForPageReady(page, Number.parseInt(options.waitMs ?? options["wait-ms"] ?? "2000", 10));
    } else {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        colorScheme: "light",
      });
      page = await context.newPage();
      await page.goto(targetUrl, { waitUntil: "load" });
      await waitForPageReady(page, Number.parseInt(options.waitMs ?? options["wait-ms"] ?? "0", 10));

      const waitForUrlContains = options.waitForUrlContains ?? options["wait-for-url-contains"];
      if (waitForUrlContains) {
        const timeoutMs = Number.parseInt(options.loginTimeoutMs ?? options["login-timeout-ms"] ?? "600000", 10);
        const deadline = Date.now() + timeoutMs;
        process.stderr.write(`Waiting for URL to contain "${waitForUrlContains}" (log in and navigate to that page)...\n`);
        while (!page.url().includes(waitForUrlContains)) {
          if (Date.now() > deadline) {
            throw new Error(`Timeout waiting for URL to contain "${waitForUrlContains}" (last URL: ${page.url()})`);
          }
          await page.waitForTimeout(500);
        }
        process.stderr.write(`URL matched: ${page.url()}\n`);
        await waitForPageReady(page, 2000);
      }
    }

    const themes = determineThemes(options);
    const passes = [];

    for (const passTheme of themes) {
      const passResult = await runPass(page, options, passTheme, outputDir);
      passes.push(passResult);
    }

    const finalReport =
      passes.length === 1
        ? passes[0].report
        : {
            summary: {
              passCount: passes.length,
              themes: passes.map((pass) => ({
                theme: pass.theme,
                resolvedTheme: pass.report.capture.resolvedTheme,
                pageMode: pass.report.capture.pageMode,
                typographyScale: pass.report.typography?.scale?.fontSizes ?? [],
                spacingScale: pass.report.spacing?.scale?.core ?? [],
              })),
            },
            capture: {
              browser: browserName,
              page: {
                url: targetUrl,
                title: passes[0].report.capture.page.title,
              },
              viewport: {
                width,
                height,
                deviceScaleFactor: 1,
              },
              passCount: passes.length,
            },
            passes: passes.map((pass) => ({
              theme: pass.theme,
              dir: pass.dir,
              artifacts: pass.artifacts,
              resolvedTheme: pass.report.capture.resolvedTheme,
            })),
            notes: {
              themeRule: "Light and dark are captured as separate measured passes.",
            },
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
