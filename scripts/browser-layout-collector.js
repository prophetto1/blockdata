/*
Usage:
1. Open an authenticated page in your browser.
2. Paste this file into DevTools Console and press Enter.
3. It will measure the current page, download a JSON report, and expose:
   - window.__wsMeasureLayout(options)
   - window.__wsLastLayoutReport
*/

(function bootstrapBrowserLayoutCollector(globalScope) {
  const MAX_CAPTURE_SLUG_LENGTH = 120;

  function sanitizePathSegment(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'capture';
  }

  function hashString(value) {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) + hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function shortenCaptureSlug(slug) {
    if (slug.length <= MAX_CAPTURE_SLUG_LENGTH) {
      return slug;
    }

    const hash = hashString(slug).slice(0, 12);
    const prefixLength = Math.max(16, MAX_CAPTURE_SLUG_LENGTH - hash.length - 2);
    const prefix = slug.slice(0, prefixLength).replace(/-+$/g, '');
    return `${prefix}--${hash}`;
  }

  function deriveCaptureSlug(input) {
    if (!input) {
      return 'capture';
    }

    if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) {
      const url = new URL(input, globalScope.location?.href);

      if (url.protocol === 'file:') {
        const pathPart = url.pathname.split('/').filter(Boolean).pop() || 'capture';
        return shortenCaptureSlug(sanitizePathSegment(pathPart.replace(/\.[^.]+$/, '')));
      }

      const hostname = sanitizePathSegment(url.hostname);
      const pathSegments = url.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => sanitizePathSegment(segment))
        .filter(Boolean);

      const querySegments = [];
      for (const [key, value] of url.searchParams.entries()) {
        querySegments.push(sanitizePathSegment(key));
        querySegments.push(sanitizePathSegment(value));
      }

      return shortenCaptureSlug([hostname, ...pathSegments, ...querySegments].filter(Boolean).join('-'));
    }

    return shortenCaptureSlug(sanitizePathSegment(input));
  }

  function deriveDownloadFilename({ url, capturedAt }) {
    const slug = deriveCaptureSlug(url || globalScope.location?.href || 'capture');
    const timestamp = String(capturedAt || new Date().toISOString()).replace(/[:.]/g, '-');
    return `${slug}--${timestamp}.json`;
  }

  function downloadJson(filename, content) {
    const blob = new Blob([`${JSON.stringify(content, null, 2)}\n`], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = globalScope.document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    globalScope.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    globalScope.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }

  function collectLayoutReport(targetWindow, options = {}) {
    const win = targetWindow;
    const doc = win.document;

    function textSnippet(text, limit = 140) {
      return String(text || '').trim().replace(/\s+/g, ' ').slice(0, limit);
    }

    function isElement(node) {
      return node instanceof win.HTMLElement;
    }

    function isVisible(element) {
      if (!isElement(element)) return false;

      const style = win.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number.parseFloat(style.opacity || '1') > 0 &&
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
        rect.top < win.innerHeight &&
        rect.left < win.innerWidth
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
        x: Number((rect.x + win.scrollX).toFixed(2)),
        y: Number((rect.y + win.scrollY).toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    }

    function styleSnapshot(element) {
      const style = win.getComputedStyle(element);
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
      if (!element || !(element instanceof win.Element)) return null;

      const parts = [];
      let current = element;

      while (current && current !== doc.body && parts.length < 7) {
        let part = current.tagName.toLowerCase();

        if (current.id) {
          part += `#${current.id}`;
          parts.unshift(part);
          break;
        }

        if (current.classList.length > 0) {
          part += `.${Array.from(current.classList).slice(0, 2).join('.')}`;
        }

        if (current.parentElement) {
          const siblings = Array.from(current.parentElement.children).filter(
            (sibling) => sibling.tagName === current.tagName && sibling.className === current.className,
          );
          if (siblings.length > 1) {
            const idx = Array.from(current.parentElement.children).indexOf(current) + 1;
            part += `:nth-child(${idx})`;
          }
        }

        parts.unshift(part);
        current = current.parentElement;
      }

      return parts.join(' > ');
    }

    function summarizeElement(element, label = null) {
      return {
        label,
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        role: element.getAttribute('role'),
        className: typeof element.className === 'string' ? element.className : null,
        selector: selectorPath(element),
        text: textSnippet(element.textContent || ''),
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
      return nodes.find((element) => matcher(textSnippet(element.textContent || '', 200).toLowerCase(), element)) || null;
    }

    function largestByArea(elements) {
      if (elements.length === 0) return null;

      return [...elements].sort((left, right) => {
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        return (b.width * b.height) - (a.width * a.height);
      })[0];
    }

    const captureState = {
      browser: 'live-browser',
      capturedAt: options.capturedAt || new Date().toISOString(),
      viewport: {
        width: win.innerWidth,
        height: win.innerHeight,
        deviceScaleFactor: win.devicePixelRatio || 1,
      },
      requestedTheme: options.requestedTheme || 'current',
      requestedPageMode: options.pageMode || 'auto',
    };

    function detectPageMode() {
      if (captureState.requestedPageMode && captureState.requestedPageMode !== 'auto') {
        return captureState.requestedPageMode;
      }

      const hasAside = !!doc.querySelector('aside');
      const hasTablist = !!doc.querySelector("[role='tablist']");
      const hasSearch = !!doc.querySelector("input[type='search'], input[placeholder*='Search'], input");
      const hasDenseControls = queryVisible(doc, ['button', 'a', 'input', "[role='tab']"]).length > 12;
      const hasLargeHeading = !!Array.from(doc.querySelectorAll('h1,h2')).find((element) => {
        if (!isVisible(element)) return false;
        const size = Number.parseFloat(win.getComputedStyle(element).fontSize);
        return Number.isFinite(size) && size >= 28;
      });

      if (hasAside && hasTablist) return 'app-shell';
      if (hasAside && hasSearch && hasDenseControls) return 'workbench';
      if (hasTablist && hasDenseControls) return 'dashboard';
      if (hasLargeHeading) return 'marketing';
      return 'app-shell';
    }

    function pickAppFrame(pageMode) {
      const candidates = queryVisible(doc, [
        'main',
        "[role='main']",
        '.app',
        '.app-shell',
        '[data-app-frame]',
        '[data-panel-group]',
        'body > div',
      ]).filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < win.innerWidth * 0.45 || rect.height < win.innerHeight * 0.45) {
          return false;
        }

        const style = win.getComputedStyle(element);
        const hasSurface =
          style.borderRadius !== '0px' ||
          style.boxShadow !== 'none' ||
          (style.borderStyle && style.borderStyle !== 'none');

        if (pageMode === 'marketing') return true;
        return hasSurface || element.tagName.toLowerCase() === 'main';
      });

      return largestByArea(candidates) || doc.querySelector('main') || doc.body;
    }

    function pickTopToolbar(appFrame) {
      return (
        firstVisible(appFrame, [
          ':scope > header',
          ":scope > [role='banner']",
          ':scope > .toolbar',
          ':scope > .topbar',
          ':scope > [data-toolbar]',
        ]) ||
        firstVisible(appFrame, ['header', "[role='banner']", '.toolbar', '.topbar', '[data-toolbar]'])
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

      function assignFromChildren(children) {
        if (children.length === 0) return { leftRail: null, mainCanvas: null, rightRail: null };

        const widest = [...children].sort((a, b) =>
          b.getBoundingClientRect().width - a.getBoundingClientRect().width,
        )[0];
        const mainIndex = children.indexOf(widest);

        const leftCandidates = children.slice(0, mainIndex).filter(
          (element) => element.getBoundingClientRect().width >= minRailWidth,
        );
        const rightCandidates = children.slice(mainIndex + 1).filter(
          (element) => element.getBoundingClientRect().width >= minRailWidth,
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

      const nested = firstVisible(shellRow, [':scope > div', ':scope > section', ':scope > main']);
      if (!nested) {
        return { leftRail: null, mainCanvas: null, rightRail: null };
      }

      return assignFromChildren(Array.from(nested.children).filter(isVisible));
    }

    function pickDatasetSelector(leftRail) {
      if (!leftRail) return null;
      return firstVisible(leftRail, [
        "button[aria-haspopup='listbox']",
        "[role='combobox']",
        'select',
        'button',
      ]);
    }

    function pickSearchInput(leftRail) {
      if (!leftRail) return null;
      return firstVisible(leftRail, [
        "input[type='search']",
        "input[placeholder*='Search']",
        'input',
        'textarea',
      ]);
    }

    function pickFieldList(leftRail, datasetSelector, searchInput) {
      if (!leftRail) return null;

      const candidates = queryVisible(leftRail, [
        ':scope > div',
        "[role='list']",
        "[role='tree']",
        'ul',
        '.list',
      ]).filter((element) => {
        if (element === datasetSelector || element === searchInput) return false;
        return element.getBoundingClientRect().height > 120;
      });

      return largestByArea(candidates);
    }

    function pickTabStrip(mainCanvas) {
      if (!mainCanvas) return null;

      return (
        firstVisible(mainCanvas, ["[role='tablist']", '.tabs', '.tablist']) ||
        firstVisibleByText(
          mainCanvas,
          ['div', 'nav', 'section'],
          (text) => text.includes('results') && text.includes('sql'),
        )
      );
    }

    function pickEmptyState(mainCanvas) {
      if (!mainCanvas) return null;

      return firstVisibleByText(
        mainCanvas,
        ['p', 'div', 'span'],
        (text) => text.includes('select fields to see results') || text.includes('no data') || text.includes('empty'),
      );
    }

    function pickActionButtons(topToolbar) {
      if (!topToolbar) return [];

      return queryVisible(topToolbar, ['button', 'a'])
        .filter((element) => textSnippet(element.textContent || '', 60).length > 0)
        .slice(0, 12);
    }

    function componentKind(element) {
      if (!(element instanceof win.HTMLElement)) return 'unknown';

      const role = element.getAttribute('role');
      const tag = element.tagName.toLowerCase();
      const text = textSnippet(element.textContent || '', 120).toLowerCase();

      if (/^h[1-6]$/.test(tag)) return 'heading';
      if (tag === 'p') return 'paragraph';
      if (tag === 'pre' || tag === 'code') return 'code';
      if (tag === 'blockquote') return 'blockquote';
      if (tag === 'figcaption') return 'figcaption';
      if (tag === 'label' || tag === 'legend') return 'form-label';
      if (tag === 'dt' || tag === 'dd') return 'definition';
      if (tag === 'li') return 'list-item';
      if (tag === 'th' || tag === 'td') return 'table-cell';
      if (role === 'tab' || text === 'results' || text === 'sql' || text === 'component') return 'tab';
      if (tag === 'input' || tag === 'textarea' || role === 'textbox' || role === 'searchbox') return 'input';
      if (tag === 'button') return 'button';
      if (tag === 'a') return 'link';
      if (role === 'navigation' || tag === 'nav') return 'navigation';
      if (role === 'list' || role === 'tree' || tag === 'ul' || tag === 'ol') return 'list';
      if (text.includes('select fields to see results') || text.includes('no fields selected')) return 'empty-state';
      if (tag === 'aside') return 'aside';
      if (tag === 'header') return 'header';
      if (tag === 'main') return 'main';
      if (tag === 'section') return 'section';
      return 'container';
    }

    function componentInventory(root, limit = 60) {
      if (!root) return [];

      const selectors = [
        'button', 'a', 'input', 'textarea', 'select',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'pre', 'code', 'blockquote', 'figcaption', 'label', 'legend',
        'dt', 'dd', 'li', 'th', 'td',
        "[role='tab']", "[role='tablist']", "[role='navigation']", "[role='list']", "[role='tree']",
        'header', 'nav', 'aside', 'section', '[data-card]', "[class*='card']", "[class*='empty']",
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

      return queryVisible(fieldList, ['button', 'a', 'li', 'div'])
        .filter(isInViewport)
        .map((element) => textSnippet(element.textContent || '', 80))
        .filter(Boolean)
        .filter((text, index, array) => array.indexOf(text) === index)
        .slice(0, 20);
    }

    function typographyScale(root) {
      const selectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'code', 'blockquote',
        'figcaption', 'label', 'legend', 'dt', 'dd', 'li', 'th', 'td', 'span',
      ];

      const buckets = new Map();
      for (const element of queryVisible(root, selectors)) {
        const text = textSnippet(element.textContent || '', 120);
        if (!text) continue;

        const style = win.getComputedStyle(element);
        const key = [
          style.fontFamily,
          style.fontSize,
          style.fontWeight,
          style.lineHeight,
          style.letterSpacing,
          style.fontStyle,
          style.textTransform,
        ].join('|');

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

      const scale = [...buckets.values()].sort(
        (left, right) => Number.parseFloat(right.fontSize || '0') - Number.parseFloat(left.fontSize || '0'),
      );

      const fontSizes = scale
        .map((entry) => Number.parseFloat(entry.fontSize))
        .filter((value) => Number.isFinite(value));
      const uniqueFontSizes = new Set(scale.map((entry) => entry.fontSize));
      const fontFamilies = [
        ...new Set(scale.map((entry) => entry.fontFamily).map((family) => family.split(',')[0]?.trim())),
      ]
        .filter(Boolean)
        .map((value) => value.replace(/^"|"$/g, ''));

      return {
        scale,
        fontFamilies,
        fontSizeRange: {
          min: fontSizes.length ? `${Math.min(...fontSizes)}px` : '0px',
          max: fontSizes.length ? `${Math.max(...fontSizes)}px` : '0px',
          distinct: uniqueFontSizes.size,
        },
      };
    }

    function visibleSections(appFrame) {
      return queryVisible(appFrame, ['header', 'nav', 'main', 'section', 'aside', 'footer'])
        .filter(isInViewport)
        .slice(0, 24)
        .map((element) => summarizeElement(element));
    }

    function themeTokens(elements) {
      const seen = new Set();
      const tokens = [];

      function pushToken(element, labelOverride) {
        if (!element) return;

        const style = win.getComputedStyle(element);
        const label = labelOverride || element.getAttribute('data-layout-label') || element.tagName.toLowerCase();
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

      const body = doc.body;
      if (body) {
        pushToken(firstVisible(body, ['a']), 'link');
        pushToken(firstVisible(body, ['input', 'textarea', 'select']), 'input');
      }

      const bodyStyle = body ? win.getComputedStyle(body) : null;
      const bodyBg = bodyStyle ? bodyStyle.backgroundColor : 'rgba(0, 0, 0, 0)';
      const surfaceCandidates = Array.from(doc.querySelectorAll('main, section, article, aside, div, header, footer, nav'))
        .filter(isVisible)
        .map((element) => ({
          element,
          rect: element.getBoundingClientRect(),
          style: win.getComputedStyle(element),
        }))
        .filter(({ element, rect, style }) => {
          if (rect.width * rect.height < 8000) return false;
          if (!style.backgroundColor || style.backgroundColor === 'rgba(0, 0, 0, 0)') return false;
          if (style.backgroundColor === 'transparent') return false;
          const parentStyle = element.parentElement ? win.getComputedStyle(element.parentElement) : null;
          if (parentStyle && style.backgroundColor === parentStyle.backgroundColor) return false;
          return bodyBg ? style.backgroundColor !== bodyBg : true;
        })
        .sort((left, right) => (right.rect.width * right.rect.height) - (left.rect.width * left.rect.height))
        .slice(0, 6);

      for (const { element } of surfaceCandidates) {
        pushToken(element, 'surface');
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
            x: win.scrollX,
            y: win.scrollY,
          },
          offsetTop: element.offsetTop ?? null,
          offsetLeft: element.offsetLeft ?? null,
        };
      });
    }

    const pageMode = detectPageMode();
    const appFrame = pickAppFrame(pageMode);
    if (appFrame) appFrame.setAttribute('data-layout-label', 'appFrame');

    const topToolbar = pickTopToolbar(appFrame);
    if (topToolbar) topToolbar.setAttribute('data-layout-label', 'topToolbar');

    const shellRow = pickShellRow(appFrame, topToolbar);
    const { leftRail, mainCanvas, rightRail } = pickSplitChildren(shellRow);

    if (leftRail) leftRail.setAttribute('data-layout-label', 'leftRail');
    if (mainCanvas) mainCanvas.setAttribute('data-layout-label', 'mainCanvas');
    if (rightRail) rightRail.setAttribute('data-layout-label', 'rightRail');

    const datasetSelector = pickDatasetSelector(leftRail);
    const searchInput = pickSearchInput(leftRail);
    const fieldList = pickFieldList(leftRail, datasetSelector, searchInput);
    const tabStrip = pickTabStrip(mainCanvas);
    const emptyState = pickEmptyState(mainCanvas);
    const actionButtons = pickActionButtons(topToolbar);

    return {
      capture: {
        ...captureState,
        page: {
          url: win.location.href,
          title: doc.title,
        },
        runtime: {
          scrollX: win.scrollX,
          scrollY: win.scrollY,
          innerWidth: win.innerWidth,
          innerHeight: win.innerHeight,
          devicePixelRatio: win.devicePixelRatio,
        },
        resolvedTheme: win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        pageMode,
      },
      measurements: {
        appFrame: appFrame ? summarizeElement(appFrame, 'appFrame') : null,
        topToolbar: topToolbar ? summarizeElement(topToolbar, 'topToolbar') : null,
        shellRow: shellRow ? summarizeElement(shellRow, 'shellRow') : null,
        leftRail: leftRail ? summarizeElement(leftRail, 'leftRail') : null,
        rightRail: rightRail ? summarizeElement(rightRail, 'rightRail') : null,
        datasetSelector: datasetSelector ? summarizeElement(datasetSelector, 'datasetSelector') : null,
        searchInput: searchInput ? summarizeElement(searchInput, 'searchInput') : null,
        fieldList: fieldList ? {
          ...summarizeElement(fieldList, 'fieldList'),
          itemsPreview: repeatedItemsInventory(fieldList).slice(0, 12),
        } : null,
        mainCanvas: mainCanvas ? summarizeElement(mainCanvas, 'mainCanvas') : null,
        tabStrip: tabStrip ? summarizeElement(tabStrip, 'tabStrip') : null,
        emptyState: emptyState ? summarizeElement(emptyState, 'emptyState') : null,
        actionButtons: actionButtons.map((element) => summarizeElement(element, 'actionButton')),
        visibleSections: visibleSections(appFrame),
      },
      typography: typographyScale(doc),
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
        tokens: themeTokens([doc.body, appFrame, topToolbar, leftRail, mainCanvas, rightRail]),
      },
      diagnostics: {
        coordinates: collectCoordinateDiagnostics([appFrame, topToolbar, leftRail, mainCanvas, rightRail]),
      },
      notes: {
        measuredState: 'visible-rendered-state-only',
        themeRule: 'This collector measures the current live theme only.',
        captureOrder: 'DOM measured from the already-open page.',
      },
    };
  }

  function installBrowserLayoutCollector(targetWindow) {
    if (!targetWindow || !targetWindow.document) {
      return null;
    }

    targetWindow.__wsMeasureLayout = function __wsMeasureLayout(options = {}) {
      const report = collectLayoutReport(targetWindow, options);
      const filename = options.filename || deriveDownloadFilename({
        url: report.capture.page.url,
        capturedAt: report.capture.capturedAt,
      });

      targetWindow.__wsLastLayoutReport = report;
      if (options.download !== false) {
        downloadJson(filename, report);
      }

      targetWindow.console.info(`[layout] measured ${report.capture.page.url}`);
      targetWindow.console.info(`[layout] saved ${filename}`);
      return report;
    };

    return targetWindow.__wsMeasureLayout;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      sanitizePathSegment,
      shortenCaptureSlug,
      deriveCaptureSlug,
      deriveDownloadFilename,
      installBrowserLayoutCollector,
    };
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const runner = installBrowserLayoutCollector(window);
    if (!window.__WS_MEASURE_LAYOUT_NO_AUTORUN__) {
      try {
        runner();
      } catch (error) {
        console.error('[layout] browser collector failed', error);
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
