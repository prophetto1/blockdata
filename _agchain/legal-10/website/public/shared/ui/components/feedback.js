import { el, cx } from "../core.js";
import { TOKENS } from "./tokens.js";
import { surface } from "./surface.js";

export function errorBox(props = {}) {
  const { title = "Something went wrong", message = "", details = "", class: className } = props;
  return surface(
    {
      class: cx("border-red-200 dark:border-red-900", className),
      padding: "p-6",
      rounded: TOKENS.radius.xl,
      shadow: TOKENS.shadow.sm,
    },
    [
      el("div", { class: "text-sm font-semibold text-red-700 dark:text-red-300 mb-2", text: title }),
      message ? el("div", { class: cx("text-sm", TOKENS.text.muted), text: message }) : null,
      details ? el("pre", { class: "mt-4 text-xs whitespace-pre-wrap", text: details }) : null,
    ].filter(Boolean)
  );
}

