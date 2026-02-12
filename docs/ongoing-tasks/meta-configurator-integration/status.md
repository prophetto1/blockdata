# MetaConfigurator Integration - Status (2026-02-11)

Spec authority: `docs/ongoing-tasks/meta-configurator-integration/spec.md`
Priority 7 execution authority: `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`

## Direction Lock (2026-02-11)

1. The right-side assistant panel is for the platform's internal customized assistant.
2. It is intentionally separate from user-key worker AI that processes run overlays after schema definition.
3. The Databricks screenshot is used as a spacing/density/layout reference only, not a strict geometric clone target.
4. The left-nav/top-bar geometry can differ as long as density and visual consistency goals are met.
5. System-wide tighter spacing and typography should be implemented now while UI surface area is still manageable.

## Scope

This status covers the v1 "Advanced editor" integration pathway (MetaConfigurator embed) plus the build/copy plumbing required to serve the embed from the React app.

## Implemented

### Advanced editor UI (React/Mantine)

- Routes:
  - `/app/schemas/advanced`
  - `/app/schemas/advanced/:schemaId`
- Entry points:
  - Schemas page header button: "Advanced editor"
  - Per-schema row action: pencil icon
- Behavior:
  - Optional load by `schema_id` (Supabase select on `schemas`)
  - Fork-by-default: defaults `schema_ref` to `<existing>_v2` when editing
  - Save: `POST /schemas` via `edgeFetch` (`application/json`)
  - Conflict: surfaces HTTP `409` as rename-required
  - Compatibility warnings:
    - `schema_jsonb` must be an object
    - v0 worker/grid compatibility expects top-level `properties` to be an object

Files:
- `web/src/pages/SchemaAdvancedEditor.tsx`
- `web/src/pages/Schemas.tsx`
- `web/src/router.tsx`

### MetaConfigurator embed (Vue island, no iframe)

- Build type: Vite IIFE library -> `window.MetaConfiguratorEmbed` global.
- Mount API: `mountSchemaEditor(el, { initialSchema, onChange }) -> { getSchemaJson, setSchemaJson, destroy }`.
- CSS strategy: Tailwind `components` + `utilities` only (no `@tailwind base;` / preflight).

Files (tracked fork in `third_party/`):
- `third_party/meta-configurator/meta_configurator/vite.embed.config.js` (sets `base: '/meta-configurator-embed/'`)
- `third_party/meta-configurator/meta_configurator/src/embed-entry.ts`
- `third_party/meta-configurator/meta_configurator/src/embed/EmbeddedSchemaEditor.vue`
- `third_party/meta-configurator/meta_configurator/src/embed-style.css`
- `third_party/meta-configurator/meta_configurator/package.json` (script: `build:embed`)

### Serving and lazy-load contract

- Static asset URLs (per `spec.md` Section 5.4.1):
  - `/meta-configurator-embed/meta-configurator-embed.css`
  - `/meta-configurator-embed/meta-configurator-embed.js`
- Additional embed runtime assets:
  - `/meta-configurator-embed/assets/validationWorker-296995c3.js`
  - `/meta-configurator-embed/validation-templates/*`
- Lazy loader injects `<link>` + `<script>` once and returns `window.MetaConfiguratorEmbed`.

Files:
- `web/src/lib/metaConfiguratorEmbed.ts`
- `web/public/meta-configurator-embed/*`

### Build/copy plumbing (dist -> web/public)

- `scripts/build-meta-configurator-embed.mjs`:
  - Runs `npm ci` (only if needed) and `npm run build:embed` inside `third_party/meta-configurator/meta_configurator/`
  - Copies `dist-embed/` -> `web/public/meta-configurator-embed/`
- `web/package.json` script:
  - `build:meta-configurator-embed` -> `node ../scripts/build-meta-configurator-embed.mjs`

Files:
- `scripts/build-meta-configurator-embed.mjs`
- `web/package.json`

## Verified (2026-02-11)

- Ran `node scripts/build-meta-configurator-embed.mjs`: build succeeded and copied output.
- Vite-reported outputs:
  - `dist-embed/meta-configurator-embed.js`: 2,146.18 kB (gzip 584.14 kB)
  - `dist-embed/meta-configurator-embed.css`: 986.52 kB (gzip 408.03 kB)
  - `dist-embed/assets/validationWorker-ccf3499f.js`: 149.56 kB
- Verified `dist-embed/` and `web/public/` copies are byte-identical for JS and CSS (SHA256 matches at the time of this report).
- Verified embed output loads its validation worker under `/meta-configurator-embed/assets/...` (not `/assets/...`), matching the hosting prefix.

## Not implemented yet (gaps vs `spec.md`)

- Schema Creation Wizard (spec Sections 5.1-5.3)
- Platform co-pilot edge function `schema-assist` (spec Section 6)
- Host-controlled theming bridge for the embed (spec Section 5.4.2 host-controlled primary color)
- Any AG Grid replacement inside MetaConfigurator (explicitly post-v0 in spec)

## Repo hygiene / capture status

- `third_party/meta-configurator/` is now the tracked fork location used by the embed build.
- `ref-repos/` remains gitignored scratch space and is no longer required for the embed build.
