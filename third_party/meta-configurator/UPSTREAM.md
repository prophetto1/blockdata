# MetaConfigurator (vendored fork)

Upstream:
- Repo: https://github.com/MetaConfigurator/meta-configurator
- Commit pinned (from original clone): `5dc11e4411e66e1662936fe076e79b5b44fa3c82`
- License: MIT (see `third_party/meta-configurator/LICENSE`)

Local changes:
- Added an embed build (`vite.embed.config.js`) and mount API (`src/embed-entry.ts`) to support the React/Mantine "Advanced editor" as a mounted Vue island (no iframe).
- Added a minimal embed wrapper component (`src/embed/EmbeddedSchemaEditor.vue`) and embed CSS entrypoint (`src/embed-style.css`) to avoid global CSS resets.
