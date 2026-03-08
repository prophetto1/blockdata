---
title: Markdown Extended Syntax
description: All supported Markdown syntax — GFM, math, emoji, and more.
---

Every syntax below is supported out of the box. No MDX imports needed — these work in plain `.md` files.

## GFM — GitHub Flavored Markdown

Built into Astro via `remark-gfm`. Always enabled.

### Tables

| Feature | Status | Notes |
|:--------|:------:|------:|
| Left-aligned | Center | Right |
| Tables | Yes | Built-in |
| Strikethrough | Yes | `~~text~~` |

### Strikethrough

~~This text is deleted.~~

### Task lists

- [x] Install dependencies
- [x] Configure plugins
- [ ] Write documentation
- [ ] Deploy

### Autolinks

Visit the docs home page for the full docs.

### Footnotes

Here is a sentence with a footnote[^1] and another[^2].

[^1]: This is the first footnote content.
[^2]: This is the second footnote with more detail.

---

## Math — KaTeX

Powered by `remark-math` + `rehype-katex`.

### Inline math

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ and it solves any second-degree polynomial.

### Block math

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### Matrix

$$
\mathbf{A} = \begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

### Summation

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

---

## Emoji

Powered by `remark-emoji`. Use GitHub-style shortcodes.

| Shortcode | Renders |
|-----------|---------|
| `:rocket:` | :rocket: |
| `:white_check_mark:` | :white_check_mark: |
| `:warning:` | :warning: |
| `:x:` | :x: |
| `:gear:` | :gear: |
| `:memo:` | :memo: |
| `:zap:` | :zap: |
| `:lock:` | :lock: |
| `:tada:` | :tada: |
| `:package:` | :package: |

---

## Standard Markdown (always supported)

### Headings

```md
# H1
## H2
### H3
#### H4
```

### Emphasis

**Bold**, *italic*, ***bold italic***, `inline code`

### Blockquote

> This is a blockquote.
>
> It can span multiple paragraphs.

### Ordered list

1. First item
2. Second item
3. Third item

### Unordered list

- Item one
- Item two
  - Nested item
  - Another nested
- Item three

### Horizontal rule

---

### Code blocks

```python title="example.py"
def greet(name: str) -> str:
    """Return a greeting."""
    return f"Hello, {name}!"
```

```json title="config.json"
{
  "key": "value",
  "nested": {
    "enabled": true,
    "count": 42
  }
}
```

```sql title="query.sql"
SELECT service_name, health_status
FROM registry_services
WHERE enabled = true
ORDER BY service_name;
```

### Code with line highlights

```typescript title="api.ts" {3-4}
async function loadServices() {
  const result = await supabase
    .from('registry_services')
    .select('*');
  return result.data;
}
```

### Diff

```diff
- const old = require('old-package');
+ import { newThing } from 'new-package';
```

### HTML (inline)

Astro passes through inline HTML:

<details>
<summary>Click to expand</summary>

This content is hidden by default. Markdown **works** inside `<details>`.

</details>

---

## Starlight Markdown extensions

These are Starlight-specific and work without imports.

### Asides (callouts)

:::note
This is a **note** aside.
:::

:::tip
This is a **tip** aside.
:::

:::caution
This is a **caution** aside.
:::

:::danger
This is a **danger** aside.
:::

:::tip[Custom title]
Asides can have custom titles.
:::

---

## Summary

| Syntax | Source | Plugin |
|--------|--------|--------|
| Tables | GFM | Built-in (`remark-gfm`) |
| Strikethrough | GFM | Built-in |
| Task lists | GFM | Built-in |
| Autolinks | GFM | Built-in |
| Footnotes | GFM | Built-in |
| Inline math `$...$` | KaTeX | `remark-math` + `rehype-katex` |
| Block math `$$...$$` | KaTeX | `remark-math` + `rehype-katex` |
| Emoji shortcodes | GitHub | `remark-emoji` |
| Asides `:::note` | Starlight | Built-in |
| Code titles | Expressive Code | Built-in |
| Line highlights | Expressive Code | Built-in |
| Diff blocks | Expressive Code | Built-in |
