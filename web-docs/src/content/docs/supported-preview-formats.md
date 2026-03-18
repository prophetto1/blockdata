---
title: Supported Preview Formats
description: File formats supported for in-app preview on the Assets page.
---

When you upload files to a project's Assets page, the preview panel renders them based on their format. Here's what's supported.

## Document Viewers

These formats use specialized renderers.

| Format | Extensions | Renderer |
|--------|-----------|----------|
| PDF | `.pdf` | pdf.js viewer with parsed-view toggle |
| Image | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.svg`, `.tif`, `.tiff` | Inline image viewer |
| Word | `.docx`, `.docm`, `.dotx`, `.dotm` | Document renderer |
| PowerPoint | `.pptx`, `.pptm`, `.ppsx` | Slide renderer |
| Excel | `.xlsx` | Download only (no inline preview) |

## Markdown

| Format | Extensions | Renderer |
|--------|-----------|----------|
| Markdown | `.md`, `.markdown`, `.mdx` | Rendered markdown with GFM support |

## JSON

| Format | Extensions | Renderer |
|--------|-----------|----------|
| JSON | `.json` | Interactive tree view |

## Plain Text

| Format | Extensions | Renderer |
|--------|-----------|----------|
| Text | `.txt`, `.csv`, `.html`, `.xml`, `.rst`, `.tex`, `.org`, `.vtt` | Monospace text viewer |

## Code and Data Files

These formats render in a read-only code viewer with syntax highlighting (where a language pack is available) or monospace with line numbers.

### With Syntax Highlighting

| Language | Extensions |
|----------|-----------|
| Python | `.py` |
| JavaScript | `.js`, `.jsx` |
| TypeScript | `.ts`, `.tsx` |
| Go | `.go` |
| Rust | `.rs` |
| HTML | `.html`, `.htm`, `.vue`, `.svelte` |
| CSS | `.css` |
| YAML | `.yaml`, `.yml` |
| JSON | `.json` |

### Monospace (No Highlighting)

These are displayed with line numbers but without syntax colors.

| Category | Extensions |
|----------|-----------|
| JVM | `.java`, `.kt`, `.scala` |
| .NET | `.cs` |
| C/C++ | `.c`, `.cpp`, `.h`, `.hpp` |
| Scripting | `.rb`, `.php`, `.lua`, `.pl`, `.r` |
| Shell | `.sh`, `.bash`, `.zsh` |
| Systems | `.swift`, `.zig`, `.ex`, `.exs` |
| SQL | `.sql` |
| Config | `.toml`, `.ini`, `.env`, `.conf`, `.cfg` |
| Logs | `.log`, `.tsv` |

## Unsupported Formats

Files not matching any of the above display a download link. They can still be stored and managed as project assets.
