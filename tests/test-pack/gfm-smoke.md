# GFM smoke

This file exists to validate block extraction for GitHub-flavored Markdown (GFM).

## Table

| Column | Meaning |
|---|---|
| doc_uid | Document identifier |
| source_uid | Source blob identifier |

## Code

```ts
export function add(a: number, b: number) {
  return a + b;
}
```

## Footnote

This sentence has a footnote.[^1]

[^1]: Footnote definition should be captured as its own block (footnote_definition).

