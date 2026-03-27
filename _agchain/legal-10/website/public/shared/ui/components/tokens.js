// Shared Tailwind class tokens for consistent UI across pages.

export const TOKENS = {
  text: {
    muted: "text-neutral-600 dark:text-neutral-400",
    subtle: "text-neutral-500 dark:text-neutral-400",
    heading: "text-neutral-900 dark:text-neutral-100",
    link: "text-blue-600 dark:text-blue-400 hover:underline",
  },
  surface: {
    base: "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700",
    soft: "bg-neutral-50/80 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm",
  },
  radius: {
    lg: "rounded-lg",
    xl: "rounded-xl",
  },
  shadow: {
    sm: "shadow-sm",
    md: "shadow-md",
  },
  hover: {
    card: "hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md transition-all",
  },
  control: {
    input:
      "px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500",
    select:
      "px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500",
    button:
      "inline-flex items-center justify-center px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium",
    buttonPrimary:
      "inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm font-medium",
  },
};

