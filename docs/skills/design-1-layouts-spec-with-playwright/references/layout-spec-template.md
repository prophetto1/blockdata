# Layout Spec Template

Use this structure when turning a live page into a measured reference.

Start from the JSON emitted by `scripts/measure-layout.mjs`. Do not replace measured values with visual guesses.

## Capture Metadata

- Source URL:
- Capture date:
- Browser:
- Viewport:
- Device scale factor or zoom:
- Captured state:
- Raw report path:
- Screenshot paths:

## Structure Map

- Top-level sections in visual order
- Main container width and page padding
- Major regions such as nav, hero, filters, grid, cards, footer

## Layout System

- Max widths
- Column count
- Gutters, gaps, padding, margins
- Repeated row or column steps
- Notable alignment rules

## Typography

- Family
- Size
- Line height
- Weight
- Color
- Letter spacing when relevant

## Surfaces And Effects

- Backgrounds
- Borders
- Radii
- Shadows
- Opacity or blur

## Components

Repeat this section for each important component:

- Component name:
- Selector or description:
- Width:
- Height:
- Position:
- Internal padding:
- Gap:
- Typography:
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
