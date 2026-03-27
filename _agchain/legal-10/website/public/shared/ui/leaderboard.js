/**
 * Leaderboard UI kit (config-driven renderers).
 * Intended targets:
 * - leaderboard:home
 * - leaderboard:drilldown
 * - leaderboard:compare
 */

import { el, cx, clear } from "./core.js";
import { TOKENS, pageHeader, surface } from "./components/index.js";

export function renderLBHeader(root, props) {
  root.appendChild(
    pageHeader({
      title: props?.title || "Leaderboard",
      subtitle: props?.subtitle || "",
    })
  );
}

export function renderLBModelCard(root, props) {
  const items = props?.items || [];
  const grid = el("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" });
  for (const it of items) {
    grid.appendChild(
      el("div", { class: "border border-gray-200 dark:border-gray-800 rounded-lg p-3" }, [
        el("div", { class: "text-xs text-gray-500 dark:text-gray-400", text: it.label }),
        el("div", { class: "font-medium", text: it.value }),
      ])
    );
  }

  root.appendChild(
    surface(
      { padding: "p-5", rounded: "rounded-lg" },
      [
        el("div", { class: "text-sm font-semibold", text: props?.title || "Model profile" }),
        props?.subtitle ? el("div", { class: cx("text-sm mt-1", TOKENS.text.muted), text: props.subtitle }) : null,
        grid,
      ].filter(Boolean)
    )
  );
}

export function renderLBFilters(root, props) {
  const container = el("div", { class: "flex flex-wrap items-center gap-4 mb-6" });

  if (props?.search) {
    container.appendChild(
      el("input", {
        type: "text",
        id: props.search.id || "search-input",
        placeholder: props.search.placeholder || "Search…",
        title: props.search.title || "Search",
        class: cx(TOKENS.control.input, "w-64"),
      })
    );
  }

  for (const sel of props?.selects || []) {
    const options = (sel.options || []).map((opt) =>
      el("option", { value: opt, text: opt })
    );
    if (sel.includeAll !== false) {
      options.unshift(el("option", { value: "", text: sel.allLabel || `All ${sel.label}s` }));
    }
    container.appendChild(
      el("select", {
        id: sel.id,
        title: sel.title || sel.label,
        class: TOKENS.control.select,
      }, options)
    );
  }

  if (props?.rightNote) {
    container.appendChild(
      el("span", { class: "text-sm text-gray-500 dark:text-gray-400", id: props.rightNoteId || "result-count", text: props.rightNote })
    );
  }

  root.appendChild(container);
}

export function renderLBTable(root, props) {
  const columns = props?.columns || [];
  const rows = props?.rows || [];

  const table = el("table", { class: "w-full text-sm" });
  const thead = el("thead", {
    class: "bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700",
  });
  const tr = el("tr");
  for (const col of columns) {
    tr.appendChild(
      el("th", {
        class: cx(
          "py-3 px-4 font-semibold text-neutral-700 dark:text-neutral-300",
          col.align === "center" ? "text-center" : "text-left",
          col.sortable ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700" : ""
        ),
        "data-sort": col.sortable ? col.key : undefined,
      }, [
        el("span", { text: col.title }),
        col.subtitle
          ? el("br")
          : null,
        col.subtitle
          ? el("span", { class: cx("font-normal text-xs", TOKENS.text.subtle), text: col.subtitle })
          : null,
      ])
    );
  }
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = el("tbody", { class: "divide-y divide-neutral-200 dark:divide-neutral-700", id: props.tbodyId || "table-body" });
  for (const row of rows) {
    const r = el("tr", { class: "hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" });
    if (props?.rowHrefKey && row[props.rowHrefKey]) {
      r.style.cursor = "pointer";
      r.addEventListener("click", () => {
        window.location.href = String(row[props.rowHrefKey]);
      });
    }
    for (const col of columns) {
      const val = row[col.key];
      r.appendChild(
        el("td", { class: cx("py-3 px-4", col.align === "center" ? "text-center" : "text-left") }, [
          el("span", { text: val === undefined ? "" : String(val) }),
        ])
      );
    }
    tbody.appendChild(r);
  }
  table.appendChild(tbody);

  root.appendChild(
    surface(
      { padding: "p-0", rounded: "rounded-lg", class: "overflow-hidden" },
      [el("div", { class: "overflow-x-auto" }, [table])]
    )
  );
}

export function renderLeaderboardHome(root, config) {
  clear(root);
  renderLBHeader(root, config.header);
  if (config.filters) renderLBFilters(root, config.filters);
  if (config.table) renderLBTable(root, config.table);
  if (config.footnote) {
    root.appendChild(
      el("p", { class: "text-xs text-gray-500 dark:text-gray-400 mt-4" }, [
        config.footnote.text || "",
      ])
    );
  }
}

export function renderLeaderboardModel(root, config) {
  clear(root);
  const back = el("a", { class: "text-sm text-blue-600 dark:text-blue-400 hover:underline", href: config.backHref || "/leaderboard.html", text: "← Back to leaderboard" });
  root.appendChild(el("div", { class: "mb-4" }, [back]));
  renderLBHeader(root, config.header);
  if (config.modelCard) renderLBModelCard(root, config.modelCard);
  if (config.table) {
    root.appendChild(el("h2", { class: "text-lg font-semibold mt-8 mb-3", text: "Scores" }));
    renderLBTable(root, config.table);
  }
}
