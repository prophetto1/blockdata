/**
 * Charts UI kit (config-driven renderers).
 * Charts themselves can be rendered by ECharts or other libs; this module
 * standardizes the layout and captions.
 */

import { el, cx, clear } from "./core.js";
import { pageHeader, surface } from "./components/index.js";

export function renderCHHeader(root, props) {
  root.appendChild(
    pageHeader({
      title: props?.title || "Charts",
      subtitle: props?.subtitle || "",
    })
  );
}

export function renderChartPanel(root, panel) {
  const header = el("div", { class: "mb-4" }, [
    el("h3", { class: "font-semibold", text: panel.title }),
    panel.subtitle ? el("p", { class: "text-sm text-gray-500 dark:text-gray-400", text: panel.subtitle }) : null,
  ]);

  const mount = el("div", { id: panel.mountId, style: `width: 100%; height: ${panel.height || 400}px;` });

  const caption = panel.caption
    ? el("div", { class: "mt-3 text-xs text-gray-500 dark:text-gray-400" }, [
        panel.caption.note ? el("div", { text: panel.caption.note }) : null,
        panel.caption.source ? el("div", { text: `Source: ${panel.caption.source}` }) : null,
      ])
    : null;

  root.appendChild(
    surface(
      { padding: "p-6", rounded: "rounded-lg" },
      [header, mount, caption].filter(Boolean)
    )
  );
}

export function renderChartGrid(root, props) {
  const cols = props?.columns || 2;
  const gridClass =
    cols === 1
      ? "grid grid-cols-1 gap-6"
      : cols === 3
        ? "grid grid-cols-1 lg:grid-cols-3 gap-6"
        : "grid grid-cols-1 lg:grid-cols-2 gap-6";

  const grid = el("div", { class: gridClass });
  for (const panel of props?.panels || []) {
    renderChartPanel(grid, panel);
  }
  root.appendChild(grid);
}

export function renderChartsOverview(root, config) {
  clear(root);
  renderCHHeader(root, config.header);
  renderChartGrid(root, config.grid);
}
