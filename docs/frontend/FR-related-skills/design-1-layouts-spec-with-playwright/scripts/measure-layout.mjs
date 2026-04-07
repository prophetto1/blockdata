#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const MAX_CAPTURE_SLUG_LENGTH = 120;

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

function sanitizePathSegment(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "capture";
}

function shortenCaptureSlug(slug) {
  if (slug.length <= MAX_CAPTURE_SLUG_LENGTH) {
    return slug;
  }

  const hash = createHash("sha256").update(slug).digest("hex").slice(0, 12);
  const prefixLength = Math.max(16, MAX_CAPTURE_SLUG_LENGTH - hash.length - 2);
  const prefix = slug.slice(0, prefixLength).replace(/-+$/g, "");
  return `${prefix}--${hash}`;
}

export function deriveCaptureSlug(input) {
  if (!input) {
    return "capture";
  }

  if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) {
    const url = new URL(input);

    if (url.protocol === "file:") {
      const filePath = fileURLToPath(url);
      return shortenCaptureSlug(sanitizePathSegment(path.basename(filePath, path.extname(filePath))));
    }

    const hostname = sanitizePathSegment(url.hostname);
    const pathSegments = url.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => sanitizePathSegment(segment))
      .filter(Boolean);

    const querySegments = [];
    for (const [key, value] of url.searchParams.entries()) {
      querySegments.push(sanitizePathSegment(key));
      querySegments.push(sanitizePathSegment(value));
    }

    return shortenCaptureSlug([hostname, ...pathSegments, ...querySegments].filter(Boolean).join("-"));
  }

  return shortenCaptureSlug(sanitizePathSegment(path.basename(input, path.extname(input))));
}

export function deriveDefaultOutputDir({ repoRoot: baseRoot, targetUrl, width, height }) {
  const captureSlug = deriveCaptureSlug(targetUrl);
  return path.join(baseRoot, "docs", "design-layouts", captureSlug, `${width}x${height}`);
}

export function deriveAuthStatePath({ repoRoot: baseRoot, targetUrl }) {
  const normalized = normalizeUrl(targetUrl);
  const url = new URL(normalized);
  const hostSlug = sanitizePathSegment(url.hostname);
  return path.join(baseRoot, "docs", "design-layouts", ".auth", `${hostSlug}.json`);
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
    function textSnippet(text, limit = 140) {
      return String(text || "").trim().replace(/\s+/g, " ").slice(0, limit);
    }

    function isElement(node) {
      return node instanceof HTMLElement;
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
      return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
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

    function absoluteRectOf(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: Number((rect.x + window.scrollX).toFixed(2)),
        y: Number((rect.y + window.scrollY).toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    }

    function styleSnapshot(element) {
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        fontStyle: style.fontStyle,
        textTransform: style.textTransform,
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

    function selectorPath(element) {
      if (!element || !(element instanceof Element)) return null;

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

        if (current.parentElement) {
          const siblings = Array.from(current.parentElement.children).filter(
            (s) => s.tagName === current.tagName && s.className === current.className
          );
          if (siblings.length > 1) {
            const idx = Array.from(current.parentElement.children).indexOf(current) + 1;
            part += `:nth-child(${idx})`;
          }
        }

        parts.unshift(part);
        current = current.parentElement;
      }

      return parts.join(" > ");
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

    function largestByArea(elements) {
      if (elements.length === 0) return null;

      return [...elements].sort((left, right) => {
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        return b.width * b.height - a.width * a.height;
      })[0];
    }

    function detectPageMode() {
      if (captureState.requestedPageMode && captureState.requestedPageMode !== "auto") {
        return captureState.requestedPageMode;
      }

      const hasAside = !!document.querySelector("aside");
      const hasTablist = !!document.querySelector("[role='tablist']");
      const hasSearch = !!document.querySelector("input[type='search'], input[placeholder*='Search'], input");
      const hasDenseControls = queryVisible(document, ["button", "a", "input", "[role='tab']"]).length > 12;
      const hasLargeHeading = !!Array.from(document.querySelectorAll("h1,h2")).find((element) => {
        if (!isVisible(element)) return false;
        const size = Number.parseFloat(getComputedStyle(element).fontSize);
        return Number.isFinite(size) && size >= 28;
      });

      if (hasAside && hasTablist) return "app-shell";
      if (hasAside && hasSearch && hasDenseControls) return "workbench";
      if (hasTablist && hasDenseControls) return "dashboard";
      if (hasLargeHeading) return "marketing";
      return "app-shell";
    }

    function pickAppFrame(pageMode) {
      const candidates = queryVisible(document, [
        "main",
        "[role='main']",
        ".app",
        ".app-shell",
        "[data-app-frame]",
        "[data-panel-group]",
        "body > div",
      ]).filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < window.innerWidth * 0.45 || rect.height < window.innerHeight * 0.45) {
          return false;
        }

        const style = getComputedStyle(element);
        const hasSurface =
          style.borderRadius !== "0px" ||
          style.boxShadow !== "none" ||
          (style.borderStyle && style.borderStyle !== "none");

        if (pageMode === "marketing") return true;
        return hasSurface || element.tagName.toLowerCase() === "main";
      });

      return largestByArea(candidates) || document.querySelector("main") || document.body;
    }

    function pickTopToolbar(appFrame) {
      return (
        firstVisible(appFrame, [
          ":scope > header",
          ":scope > [role='banner']",
          ":scope > .toolbar",
          ":scope > .topbar",
          ":scope > [data-toolbar]",
        ]) ||
        firstVisible(appFrame, ["header", "[role='banner']", ".toolbar", ".topbar", "[data-toolbar]"])
      );
    }

    function pickShellRow(appFrame, topToolbar) {
      const children = Array.from(appFrame.children).filter(isVisible);

      if (topToolbar) {
        const toolbarIndex = children.indexOf(topToolbar);
        if (toolbarIndex >= 0 && toolbarIndex + 1 < children.length) {
          return children[toolbarIndex + 1];
        }
      }

      return children[0] || null;
    }

    function pickSplitChildren(shellRow) {
      if (!shellRow) return { leftRail: null, mainCanvas: null, rightRail: null };

      const minRailWidth = 40;

      function assignFromChildren(kids) {
        if (kids.length === 0) return { leftRail: null, mainCanvas: null, rightRail: null };

        const widest = [...kids].sort((a, b) =>
          b.getBoundingClientRect().width - a.getBoundingClientRect().width
        )[0];
        const mainIndex = kids.indexOf(widest);

        const leftCandidates = kids.slice(0, mainIndex).filter(
          (el) => el.getBoundingClientRect().width >= minRailWidth
        );
        const rightCandidates = kids.slice(mainIndex + 1).filter(
          (el) => el.getBoundingClientRect().width >= minRailWidth
        );

        return {
          leftRail: leftCandidates[leftCandidates.length - 1] || null,
          mainCanvas: widest,
          rightRail: rightCandidates[0] || null,
        };
      }

      const children = Array.from(shellRow.children).filter(isVisible);

      if (children.length >= 2) {
        return assignFromChildren(children);
      }

      const nested = firstVisible(shellRow, [":scope > div", ":scope > section", ":scope > main"]);
      if (!nested) {
        return { leftRail: null, mainCanvas: null, rightRail: null };
      }

      const nestedChildren = Array.from(nested.children).filter(isVisible);
      return assignFromChildren(nestedChildren);
    }

    function pickDatasetSelector(leftRail) {
      if (!leftRail) return null;
      return firstVisible(leftRail, [
        "button[aria-haspopup='listbox']",
        "[role='combobox']",
        "select",
        "button",
      ]);
    }

    function pickSearchInput(leftRail) {
      if (!leftRail) return null;
      return firstVisible(leftRail, [
        "input[type='search']",
        "input[placeholder*='Search']",
        "input",
        "textarea",
      ]);
    }

    function pickFieldList(leftRail, datasetSelector, searchInput) {
      if (!leftRail) return null;

      const candidates = queryVisible(leftRail, [
        ":scope > div",
        "[role='list']",
        "[role='tree']",
        "ul",
        ".list",
      ]).filter((element) => {
        if (element === datasetSelector || element === searchInput) return false;
        const rect = element.getBoundingClientRect();
        return rect.height > 120;
      });

      return largestByArea(candidates);
    }

    function pickTabStrip(mainCanvas) {
      if (!mainCanvas) return null;

      return (
        firstVisible(mainCanvas, ["[role='tablist']", ".tabs", ".tablist"]) ||
        firstVisibleByText(
          mainCanvas,
          ["div", "nav", "section"],
          (text) => text.includes("results") && text.includes("sql")
        )
      );
    }

    function pickEmptyState(mainCanvas) {
      if (!mainCanvas) return null;

      return firstVisibleByText(
        mainCanvas,
        ["p", "div", "span"],
        (text) =>
          text.includes("select fields to see results") ||
          text.includes("no data") ||
          text.includes("empty")
      );
    }

    function pickActionButtons(topToolbar) {
      if (!topToolbar) return [];

      return queryVisible(topToolbar, ["button", "a"])
        .filter((element) => textSnippet(element.textContent || "", 60).length > 0)
        .slice(0, 12);
    }

    function componentKind(element) {
      if (!(element instanceof HTMLElement)) return "unknown";

      const role = element.getAttribute("role");
      const tag = element.tagName.toLowerCase();
      const text = textSnippet(element.textContent || "", 120).toLowerCase();

      if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
        return "heading";
      }
      if (tag === "p") return "paragraph";
      if (tag === "pre" || tag === "code") return "code";
      if (tag === "blockquote") return "blockquote";
      if (tag === "figcaption") return "figcaption";
      if (tag === "label" || tag === "legend") return "form-label";
      if (tag === "dt" || tag === "dd") return "definition";
      if (tag === "li") return "list-item";
      if (tag === "th" || tag === "td") return "table-cell";
      if (role === "tab" || text === "results" || text === "sql" || text === "component") return "tab";
      if (tag === "input" || tag === "textarea" || role === "textbox" || role === "searchbox") return "input";
      if (tag === "button") return "button";
      if (tag === "a") return "link";
      if (role === "navigation" || tag === "nav") return "navigation";
      if (role === "list" || role === "tree" || tag === "ul" || tag === "ol") return "list";
      if (text.includes("select fields to see results") || text.includes("no fields selected")) return "empty-state";
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
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "pre",
        "code",
        "blockquote",
        "figcaption",
        "label",
        "legend",
        "dt",
        "dd",
        "li",
        "th",
        "td",
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

    function repeatedItemsInventory(fieldList) {
      if (!fieldList) return [];

      return queryVisible(fieldList, ["button", "a", "li", "div"])
        .filter(isInViewport)
        .map((element) => textSnippet(element.textContent || "", 80))
        .filter(Boolean)
        .filter((text, index, array) => array.indexOf(text) === index)
        .slice(0, 20);
    }

    function typographyScale(root) {
      const selectors = [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "pre",
        "code",
        "blockquote",
        "figcaption",
        "label",
        "legend",
        "dt",
        "dd",
        "li",
        "th",
        "td",
        "span",
      ];

      const buckets = new Map();
      for (const element of queryVisible(root, selectors)) {
        const text = textSnippet(element.textContent || "", 120);
        if (!text) continue;

        const style = getComputedStyle(element);
        const key = [
          style.fontFamily,
          style.fontSize,
          style.fontWeight,
          style.lineHeight,
          style.letterSpacing,
          style.fontStyle,
          style.textTransform,
        ].join("|");

        const tag = element.tagName.toLowerCase();
        const entry = buckets.get(key);
        if (entry) {
          entry.occurrences += 1;
          if (!entry.tags.includes(tag)) entry.tags.push(tag);
          if (!entry.sampleText && text) entry.sampleText = text;
        } else {
          buckets.set(key, {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            fontWeight: style.fontWeight,
            letterSpacing: style.letterSpacing,
            fontStyle: style.fontStyle,
            textTransform: style.textTransform,
            color: style.color,
            sampleText: text,
            sampleTag: tag,
            occurrences: 1,
            tags: [tag],
          });
        }
      }

      const scale = [...buckets.values()].sort((left, right) =>
        Number.parseFloat(right.fontSize || "0") - Number.parseFloat(left.fontSize || "0")
      );

      const fontSizes = scale
        .map((entry) => Number.parseFloat(entry.fontSize))
        .filter((value) => Number.isFinite(value));
      const uniqueFontSizes = new Set(scale.map((entry) => entry.fontSize));
      const fontFamilies = [
        ...new Set(
          scale.map((entry) => entry.fontFamily).map((family) => {
            const [primary] = family.split(",");
            return primary?.trim();
          }),
        ),
      ]
        .filter(Boolean)
        .map((value) => value.replace(/^"|"$/g, ""));

      return {
        scale,
        fontFamilies,
        fontSizeRange: {
          min: fontSizes.length ? `${Math.min(...fontSizes)}px` : "0px",
          max: fontSizes.length ? `${Math.max(...fontSizes)}px` : "0px",
          distinct: uniqueFontSizes.size,
        },
      };
    }

    function visibleSections(appFrame) {
      return queryVisible(appFrame, ["header", "nav", "main", "section", "aside", "footer"])
        .filter(isInViewport)
        .slice(0, 24)
        .map((element) => summarizeElement(element));
    }

    function themeTokens(elements) {
      const seen = new Set();
      const tokens = [];

      function pushToken(element, labelOverride) {
        if (!element) return;

        const style = getComputedStyle(element);
        const label = labelOverride || element.getAttribute("data-layout-label") || element.tagName.toLowerCase();
        const token = {
          label,
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          boxShadow: style.boxShadow,
          outlineColor: style.outlineColor,
          textDecorationColor: style.textDecorationColor,
        };

        const signature = `${label}|${token.color}|${token.backgroundColor}|${token.borderColor}|${token.boxShadow}|${token.outlineColor}|${token.textDecorationColor}`;
        if (seen.has(signature)) return;
        seen.add(signature);
        tokens.push(token);
      }

      for (const element of elements.filter(Boolean)) {
        pushToken(element);
      }

      const body = document.body;
      if (body) {
        pushToken(firstVisible(body, ["a"]), "link");
        pushToken(firstVisible(body, ["input", "textarea", "select"]), "input");
      }

      const bodyStyle = body ? getComputedStyle(body) : null;
      const bodyBg = bodyStyle ? bodyStyle.backgroundColor : "rgba(0, 0, 0, 0)";
      const surfaceCandidates = Array.from(document.querySelectorAll("main, section, article, aside, div, header, footer, nav"))
        .filter(isVisible)
        .map((element) => ({
          element,
          rect: element.getBoundingClientRect(),
          style: getComputedStyle(element),
        }))
        .filter(({ element, rect, style }) => {
          if (rect.width * rect.height < 8000) return false;
          if (!style.backgroundColor || style.backgroundColor === "rgba(0, 0, 0, 0)") return false;
          if (style.backgroundColor === "transparent") return false;
          const parentStyle = element.parentElement ? getComputedStyle(element.parentElement) : null;
          if (parentStyle && style.backgroundColor === parentStyle.backgroundColor) return false;
          return bodyBg ? style.backgroundColor !== bodyBg : true;
        })
        .sort((left, right) => right.rect.width * right.rect.height - left.rect.width * left.rect.height)
        .slice(0, 6);

      for (const { element } of surfaceCandidates) {
        pushToken(element, `surface`);
      }

      return tokens;
    }

    function collectCoordinateDiagnostics(elements) {
      return elements.filter(Boolean).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: selectorPath(element),
          viewportRect: {
            x: Number(rect.x.toFixed(2)),
            y: Number(rect.y.toFixed(2)),
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
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

    const pageMode = detectPageMode();
    const appFrame = pickAppFrame(pageMode);
    if (appFrame) appFrame.setAttribute("data-layout-label", "appFrame");

    const topToolbar = pickTopToolbar(appFrame);
    if (topToolbar) topToolbar.setAttribute("data-layout-label", "topToolbar");

    const shellRow = pickShellRow(appFrame, topToolbar);
    const { leftRail, mainCanvas, rightRail } = pickSplitChildren(shellRow);

    if (leftRail) leftRail.setAttribute("data-layout-label", "leftRail");
    if (mainCanvas) mainCanvas.setAttribute("data-layout-label", "mainCanvas");
    if (rightRail) rightRail.setAttribute("data-layout-label", "rightRail");

    const datasetSelector = pickDatasetSelector(leftRail);
    const searchInput = pickSearchInput(leftRail);
    const fieldList = pickFieldList(leftRail, datasetSelector, searchInput);
    const tabStrip = pickTabStrip(mainCanvas);
    const emptyState = pickEmptyState(mainCanvas);
    const actionButtons = pickActionButtons(topToolbar);

    const report = {
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
        shellRow: shellRow ? summarizeElement(shellRow, "shellRow") : null,
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
      typography: typographyScale(document),
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
        tokens: themeTokens([document.body, appFrame, topToolbar, leftRail, mainCanvas, rightRail]),
      },
      diagnostics: {
        coordinates: collectCoordinateDiagnostics([appFrame, topToolbar, leftRail, mainCanvas, rightRail]),
      },
      notes: {
        measuredState: "visible-rendered-state-only",
        themeRule: "Each theme is a separate measured pass. Do not merge light and dark observations.",
        captureOrder: "DOM measured before screenshots.",
      },
    };

    return report;
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

  const capture = {
    browser: options.browser ?? "chromium",
    capturedAt: new Date().toISOString(),
    viewport: {
      width: page.viewportSize().width,
      height: page.viewportSize().height,
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
  if (requestedTheme === "both") return ["light", "dark"];
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
  const headless = booleanFlag(options.headless, true) && !booleanFlag(options.headed, false);
  const storageStatePath = options.storageStatePath ?? options["storage-state-path"] ?? null;
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
  const jsonOut = path.resolve(
    options.jsonOut ?? options["json-out"] ?? path.join(outputDir, "report.json")
  );

  ensureDir(outputDir);
  ensureDir(path.dirname(jsonOut));

  const playwright = resolvePlaywright();
  const browserType = playwright[browserName];
  if (!browserType) {
    throw new Error(`Unsupported browser '${browserName}'.`);
  }

  if (storageStatePath && !fs.existsSync(path.resolve(storageStatePath))) {
    throw new Error(
      `Storage state file not found: ${path.resolve(storageStatePath)}`
    );
  }

  const browser = await browserType.launch({ headless });

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      colorScheme: "light",
      ...(storageStatePath ? { storageState: path.resolve(storageStatePath) } : {}),
    });

    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "load" });
    await waitForPageReady(page, Number.parseInt(options.waitMs ?? options["wait-ms"] ?? "0", 10));

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
