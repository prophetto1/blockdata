import { el, cx } from "../core.js";
import { TOKENS } from "./tokens.js";

export function pageHeader(props = {}) {
  const {
    title,
    subtitle,
    eyebrow,
    right,
    class: className,
    titleClass = "text-3xl font-semibold mb-2",
  } = props;

  const left = el("div", {}, [
    eyebrow ? el("div", { class: cx("text-sm mb-2", TOKENS.text.subtle), text: eyebrow }) : null,
    el("h1", { class: titleClass, text: title || "" }),
    subtitle ? el("p", { class: TOKENS.text.muted, text: subtitle }) : null,
  ].filter(Boolean));

  const wrap = el(
    "div",
    { class: cx("mb-8 flex items-start justify-between gap-4 flex-wrap", className) },
    [left, right].filter(Boolean)
  );

  return wrap;
}

