# Layout Spec Template

Use this structure when turning a live page into a measured reference.

Start from the JSON emitted by `scripts/measure-layout.mjs`. Do not replace measured values with visual guesses.

## Capture Metadata

- Source URL:
- Capture date:
- Browser:
- Viewport:
- Device scale factor or zoom:
- Captured state (theme):
- Raw report path:
- Screenshot paths:

## Structure Map

- Top-level sections in visual order
- Main container width and page padding
- Major regions such as nav, hero, filters, grid, cards, footer
- Shell layout: toolbar, left rail, main canvas, right rail (when present)

## Layout System

- Max widths
- Column count
- Gutters, gaps, padding, margins
- Repeated row or column steps
- Notable alignment rules

## Typography

Pull from `report.typography.scale`. Each entry in the scale is a unique typographic treatment.

For each distinct treatment:

- Font family (first family from stack)
- Font size
- Line height
- Font weight
- Font style
- Text transform
- Letter spacing (when not `normal`)
- Color
- Sample text and tag
- Occurrence count

Summary from `report.typography`:

- Font families in use: `fontFamilies[]`
- Size range: `fontSizeRange.min` to `fontSizeRange.max` (`fontSizeRange.distinct` sizes)

## Surfaces And Effects

- Backgrounds (from `theme.tokens` surface entries)
- Borders
- Radii
- Shadows
- Opacity or blur

## Theme Tokens

Pull from `report.theme.tokens`. Includes structural elements, links, inputs, and surface elevations.

- Body / app frame colors
- Link color
- Input field styling
- Surface elevation backgrounds (distinct from body)

## Components

Repeat this section for each important component. Pull from `report.components` inventories.

- Component name:
- Kind (heading, button, link, input, paragraph, code, etc.):
- Selector:
- Width:
- Height:
- Position:
- Internal padding:
- Gap:
- Typography (reference scale entry):
- Border, radius, background:
- Notes:

## Responsive Notes

- What is confirmed at this viewport
- What likely changes at other breakpoints
- What still needs a second capture

## Similar Layout Guidance

- Preserve:
- Safe adaptations:
- Unknowns or follow-up measurements:
