# Ark UI Dark Mode Token Map (Extracted from ark-ui.com)

Extracted 2026-04-03 from `https://ark-ui.com/docs/components/select` via `getComputedStyle(document.documentElement)`.

## Token Values

| Ark Token | Computed Value | Purpose |
|-----------|---------------|---------|
| `--demo-border-emphasized` | `#3b3a37` | Borders on inputs, triggers, floating content |
| `--demo-border` | `#2a2a28` | Subtle borders, separators |
| `--demo-neutral-fg` | `#eeeeec` | Primary foreground text |
| `--demo-neutral-fg-muted` | `#a9a9a3` | Muted/secondary text |
| `--demo-neutral-emphasized` | `#7c7b74` | Placeholder text, disabled text, icon color |
| `--demo-neutral-subtle` | `#222221` | Hover/highlight backgrounds |
| `--demo-neutral-muted` | `#31312e` | Track/container backgrounds (switch, segment) |
| `--demo-neutral-solid` | `#6f6d66` | Scrollbar thumbs |
| `--demo-coral-solid` | `#eb5e41` | Primary action: checked fills, solid buttons |
| `--demo-coral-fg` | `#f47a5c` | Primary text: selected items, checked text |
| `--demo-coral-subtle` | `#55221e` | Primary subtle: selected tab bg, indicator bg |
| `--demo-coral-contrast` | `white` | Text on coral-solid backgrounds |
| `--demo-coral-focus-ring` | `#e2503f` | Focus ring/outline color |
| `--demo-bg-popover` | `#111110` | Dropdown/popover/dialog background |
| `--demo-bg-thumb` | `#111110` | Switch thumb |
| `--demo-shadow-md` | `0 4px 6px -1px rgb(0 0 0/0.2), 0 2px 4px -2px rgb(0 0 0/0.12)` | Floating content shadow |
| `--demo-shadow-sm` | `0 1px 3px 0 rgb(0 0 0/0.2), 0 1px 2px -1px rgb(0 0 0/0.15)` | Indicator/thumb shadow |
| `--demo-shadow-xl` | `0 20px 25px -5px rgb(0 0 0/0.25), 0 8px 10px -6px rgb(0 0 0/0.1)` | Dialog shadow |
| `--demo-error` | `#ff4444` | Error states |
| `--demo-popover-z-index` | `50` | Z-index for floating content |

## Tailwind Translation

| Ark Token | Tailwind Class |
|-----------|---------------|
| `--demo-border-emphasized` | `border-[#3b3a37]` |
| `--demo-border` | `border-[#2a2a28]` |
| `--demo-neutral-fg` | `text-[#eeeeec]` |
| `--demo-neutral-fg-muted` | `text-[#a9a9a3]` |
| `--demo-neutral-emphasized` | `text-[#7c7b74]` |
| `--demo-neutral-subtle` | `bg-[#222221]` |
| `--demo-neutral-muted` | `bg-[#31312e]` |
| `--demo-neutral-solid` | `bg-[#6f6d66]` |
| `--demo-coral-solid` | `bg-[#eb5e41]` |
| `--demo-coral-fg` | `text-[#f47a5c]` |
| `--demo-coral-subtle` | `bg-[#55221e]` |
| `--demo-coral-contrast` | `text-white` |
| `--demo-coral-focus-ring` | `outline-[#e2503f]` |
| `--demo-bg-popover` | `bg-[#111110]` |
| `--demo-bg-thumb` | `bg-[#111110]` |
| `--demo-shadow-md` | `shadow-[0_4px_6px_-1px_rgb(0_0_0/0.2),0_2px_4px_-2px_rgb(0_0_0/0.12)]` |
| `--demo-shadow-sm` | `shadow-[0_1px_3px_0_rgb(0_0_0/0.2),0_1px_2px_-1px_rgb(0_0_0/0.15)]` |
| `--demo-shadow-xl` | `shadow-[0_20px_25px_-5px_rgb(0_0_0/0.25),0_8px_10px_-6px_rgb(0_0_0/0.1)]` |

## Previous Wrong Translations

| Ark Token | Wrong Translation | Actual Value |
|-----------|-------------------|-------------|
| `--demo-coral-subtle` | `bg-primary/10` (~`#25150f`) | `#55221e` (2x brighter) |
| `--demo-neutral-subtle` | `bg-white/5` (~`#0d0d0d`) | `#222221` (3x brighter) |
| `--demo-neutral-muted` | `bg-white/5` (~`#0d0d0d`) | `#31312e` (4x brighter) |
| `--demo-bg-thumb` | `bg-white` | `#111110` (match popover bg) |