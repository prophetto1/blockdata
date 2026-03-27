/**
 * Reports UI kit (config-driven renderers).
 * Longform reading pages should use:
 *   data-l10-layout="two-col" data-l10-sidenav="toc" data-l10-typography="report"
 */

import { el, clear } from "./core.js";

export function renderReportHero(root, props) {
  root.appendChild(
    el("div", {}, [
      props?.kind ? el("div", { class: "text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400", text: props.kind }) : null,
      el("h1", { text: props?.title || "Report" }),
      props?.deck ? el("p", { class: "text-gray-600 dark:text-gray-400", text: props.deck }) : null,
    ].filter(Boolean))
  );
}

export function renderReportCallout(root, props) {
  const tone =
    props?.tone === "warn"
      ? "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20"
      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900";

  root.appendChild(
    el("div", { class: `my-6 border rounded-xl p-4 ${tone}` }, [
      el("div", { class: "font-semibold mb-2", text: props?.title || "Note" }),
      el(
        "ul",
        { class: "list-disc pl-6" },
        (props?.items || []).map((it) => el("li", { text: it }))
      ),
    ])
  );
}

export function renderReportSection(root, props) {
  root.appendChild(el("h2", { text: props.heading }));
  const wrapper = el("div");
  wrapper.innerHTML = props.bodyHtml || "";
  root.appendChild(wrapper);
}

export function renderReportOpen(root, config) {
  clear(root);
  if (config.hero) renderReportHero(root, config.hero);
  for (const block of config.blocks || []) {
    if (block.type === "callout") renderReportCallout(root, block);
    if (block.type === "section") renderReportSection(root, block);
  }
}

