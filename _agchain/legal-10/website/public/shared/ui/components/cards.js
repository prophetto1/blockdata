import { el, cx } from "../core.js";
import { TOKENS } from "./tokens.js";
import { surface, surfaceLink } from "./surface.js";

export function statCard(props = {}) {
  const { label, value, valueClass, class: className } = props;
  return surface(
    { padding: "p-4", rounded: TOKENS.radius.lg, class: className },
    [
      el("div", { class: cx("text-xs mb-1", TOKENS.text.subtle), text: label || "" }),
      el("div", { class: cx("text-2xl font-semibold", valueClass), text: value ?? "-" }),
    ]
  );
}

export function infoCard(props = {}) {
  const { title, body, class: className } = props;
  return surface(
    { padding: "p-5", rounded: TOKENS.radius.lg, class: className },
    [
      el("div", { class: "font-medium mb-2", text: title || "" }),
      body ? el("div", { class: cx("text-sm", TOKENS.text.muted), text: body }) : null,
    ].filter(Boolean)
  );
}

export function cardLink(props = {}) {
  const { href, eyebrow, title, body, icon, class: className, accentClass } = props;
  return surfaceLink(
    { href, class: cx("group", className) },
    [
      el("div", { class: "flex items-start gap-4" }, [
        icon
          ? el(
              "div",
              {
                class: cx(
                  "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                  accentClass || "bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50"
                ),
              },
              [icon]
            )
          : null,
        el("div", {}, [
          eyebrow ? el("div", { class: cx("text-sm font-medium mb-1", TOKENS.text.subtle), text: eyebrow }) : null,
          el("div", { class: cx("text-lg font-semibold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"), text: title || "" }),
          body ? el("div", { class: cx("text-sm leading-relaxed", TOKENS.text.muted), text: body }) : null,
        ].filter(Boolean)),
      ]),
    ].filter(Boolean)
  );
}

export function cardGrid(props = {}) {
  const { columns = 2, class: className, cards = [] } = props;
  const gridClass =
    columns === 1
      ? "grid grid-cols-1 gap-6"
      : columns === 3
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "grid grid-cols-1 sm:grid-cols-2 gap-6";

  const grid = el("div", { class: cx(gridClass, className) });
  for (const c of cards) grid.appendChild(c);
  return grid;
}
