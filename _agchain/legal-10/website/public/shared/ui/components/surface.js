import { el, cx } from "../core.js";
import { TOKENS } from "./tokens.js";

export function surface(props = {}, children = []) {
  const {
    as = "div",
    class: className,
    padding = "p-6",
    rounded = TOKENS.radius.xl,
    shadow = TOKENS.shadow.sm,
    tone = "base", // "base" | "soft"
  } = props;

  return el(
    as,
    {
      class: cx(TOKENS.surface[tone] || TOKENS.surface.base, rounded, shadow, padding, className),
    },
    children
  );
}

export function surfaceLink(props = {}, children = []) {
  const {
    href,
    class: className,
    padding = "p-6",
    rounded = TOKENS.radius.xl,
    shadow = TOKENS.shadow.sm,
    tone = "base",
    hover = true,
    rel,
    target,
  } = props;

  return el(
    "a",
    {
      href: href || "#",
      rel,
      target,
      class: cx(
        "block",
        TOKENS.surface[tone] || TOKENS.surface.base,
        rounded,
        shadow,
        padding,
        hover ? TOKENS.hover.card : "",
        className
      ),
    },
    children
  );
}

