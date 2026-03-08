---
title: keystatic
description: Complete inventory of Keystatic CMS functionalities.
---

## Storage Modes

| Mode | Config Key | Description |
|------|-----------|-------------|
| Local | kind: 'local' | File-based, reads/writes directly to disk |
| GitHub | kind: 'github' | GitHub API, requires repo config + auth |
| Cloud | kind: 'cloud' | Keystatic Cloud, requires project ID |

GitHub and Cloud support pathPrefix and branchPrefix options.

## Content Structures

### Collections

Multi-entry content directories. Each entry is a separate file.

| Option | Type | Description |
|--------|------|-------------|
| label | string | Display name in the editor |
| path | string | File path pattern (docs/\* or docs/\*\*) |
| slugField | string | Schema field used as the entry slug |
| entryLayout | 'content' or 'form' | Editor UI mode |
| format | 'json' or 'yaml' or object | Serialization format |
| previewUrl | string | URL template for live preview |
| columns | string[] | Fields shown in list view |
| template | string | Default template for new entries |
| parseSlugForSort | function | Custom sort key from slug |

### Singletons

Single-entry content (e.g. site settings, homepage).

| Option | Type | Description |
|--------|------|-------------|
| label | string | Display name |
| path | string | File path |
| entryLayout | 'content' or 'form' | Editor UI mode |
| format | 'json' or 'yaml' or object | Serialization format |
| previewUrl | string | URL template for live preview |

## Field Types

### Text & Input

| Field | Import | Produces | Key Options |
|-------|--------|----------|-------------|
| text | fields.text | string | multiline, defaultValue, validation: isRequired, length, pattern |
| slug | fields.slug | name + slug | name.label, slug.generate, validation per sub-field |
| url | fields.url | string or null | defaultValue, validation: isRequired |
| integer | fields.integer | number or null | defaultValue, validation: isRequired, min, max |
| number | fields.number | number or null | defaultValue, step, validation: isRequired, min, max, step |

### Selection

| Field | Import | Produces | Key Options |
|-------|--------|----------|-------------|
| select | fields.select | string | options[], defaultValue (required) |
| multiselect | fields.multiselect | string[] | options[], defaultValue |
| checkbox | fields.checkbox | boolean | defaultValue |

### Date & Time

| Field | Import | Produces | Key Options |
|-------|--------|----------|-------------|
| date | fields.date | string or null | defaultValue (or kind:'today'), validation: isRequired, min, max |
| datetime | fields.datetime | string or null | defaultValue (or kind:'now'), validation: isRequired, min, max |

### Assets

| Field | Import | Produces | Key Options |
|-------|--------|----------|-------------|
| image | fields.image | image object or null | directory, publicPath, transformFilename, validation: isRequired |
| file | fields.file | file object or null | directory, publicPath, transformFilename, validation: isRequired |
| cloudImage | fields.cloudImage | cloud image object | validation: isRequired |

### Relationships

| Field | Import | Produces | Key Options |
|-------|--------|----------|-------------|
| relationship | fields.relationship | string or null | collection (target), validation: isRequired |
| multiRelationship | fields.multiRelationship | string[] | collection (target), validation: length |
| pathReference | fields.pathReference | string or null | pattern (glob), validation: isRequired |

### Rich Content

| Field | Import | Produces | Key Options |
|-------|--------|----------|-------------|
| mdx | fields.mdx | editor state | extension (mdx or md), options, components |
| mdx.inline | fields.mdx.inline | editor state | options, components |
| markdoc | fields.markdoc | editor state | extension (mdoc or md), options, components |
| markdoc.inline | fields.markdoc.inline | editor state | options, components |
| document | fields.document | DocumentElement[] | componentBlocks, formatting config (deprecated) |

#### Editor Options (MDX / Markdoc)

| Option | Type | Description |
|--------|------|-------------|
| bold | boolean | Enable bold formatting |
| italic | boolean | Enable italic formatting |
| strikethrough | boolean | Enable strikethrough |
| code | boolean | Enable inline code |
| heading | boolean or object | Enable headings, optionally restrict levels |
| blockquote | boolean | Enable blockquotes |
| orderedList | boolean | Enable numbered lists |
| unorderedList | boolean | Enable bullet lists |
| table | boolean | Enable tables |
| link | boolean | Enable links |
| image | boolean or object | Enable images with directory, publicPath, schema |
| divider | boolean | Enable horizontal rules |
| codeBlock | boolean or object | Enable code blocks, optionally with schema |

### Structural

| Field | Import | Produces | Key Options |
|-------|--------|----------|-------------|
| object | fields.object | object | fields, layout (12-column grid: [6,6], [12,8,4]) |
| array | fields.array | array | element, itemLabel, slugField, validation: length |
| blocks | fields.blocks | discriminated array | Named block schemas, validation: length |
| conditional | fields.conditional | union | discriminant (select/checkbox), values per branch |
| child | fields.child | nested editor | kind (block or inline), inheritable formatting |

### Utility

| Field | Import | Produces | Description |
|-------|--------|----------|-------------|
| empty | fields.empty | null | Placeholder, no UI |
| emptyContent | fields.emptyContent | null | Content placeholder with file extension |
| emptyDocument | fields.emptyDocument | null | Deprecated, use emptyContent |
| ignored | fields.ignored | stored value | Preserves existing data without UI |

## Content Components

Custom components for use inside MDX/Markdoc editors.

| Builder | Kind | Description |
|---------|------|-------------|
| wrapper() | wrapper | Wraps child content with schema-driven props |
| block() | block | Block-level component, supports file drop handling |
| inline() | inline | Inline component within text, toolbar editing |
| mark() | mark | Text mark/formatting with custom tag, style, className |
| repeating() | repeating | Repeating wrapper with min/max child validation |
| cloudImage() | block | Pre-built cloud image component (src, alt, width, height) |

All support label, description, icon, schema, and forSpecificLocations.
View modes: ContentView (read-only) or NodeView (editable with onChange/onRemove).

## Reader API

Programmatic access to content from server-side code.

Import: createReader from @keystatic/core/reader

| Method | Returns | Description |
|--------|---------|-------------|
| collections.{name}.read(slug) | entry or null | Read single entry |
| collections.{name}.readOrThrow(slug) | entry | Read or throw if missing |
| collections.{name}.all() | entry[] with slugs | Read all entries |
| collections.{name}.list() | string[] | List all slugs |
| singletons.{name}.read() | entry or null | Read singleton |
| singletons.{name}.readOrThrow() | entry | Read or throw |

Options: resolveLinkedFiles for deep resolution of linked file references.

GitHub variant: createGitHubReader() with ref, pathPrefix, token.

## Document Renderer

Renders Keystatic document fields to React.

Import: DocumentRenderer from @keystatic/core/renderer

Customizable renderers for:
- **Inline**: link, bold, italic, underline, strikethrough, code, superscript, subscript, keyboard
- **Block**: paragraph, blockquote, code, layout, divider, heading, list, image, table

## UI Configuration

| Option | Description |
|--------|-------------|
| ui.brand.name | App name shown in editor |
| ui.brand.mark | Custom React component for logo |
| ui.navigation | Flat array or grouped sections of collection/singleton keys |
| --- divider | Navigation section divider |
| locale | Editor locale (36 supported languages) |

## Integrations

| Package | Purpose |
|---------|---------|
| @keystatic/core | CMS engine, fields, reader, renderer |
| @keystatic/astro | Astro framework integration |
| @markdoc/markdoc | Re-exported via @keystatic/core/markdoc |
