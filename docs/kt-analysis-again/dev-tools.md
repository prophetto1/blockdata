# Kestra `dev-tools` Inventory

Source root: `E:\kestra\dev-tools`

Module purpose: a small collection of developer convenience scripts used outside the main runtime. This directory does not contain production Java/Kotlin services; it contains shell helpers for local plugin deployment and manual GitHub workflow/cache operations across Kestra plugin repositories.

Observed file count: 5 files.

## File Tree

### `/`
- `copy-plugin.sh`: Local developer helper script that builds plugin JARs with Gradle `shadowJar`, prompts/configures `KESTRA_PLUGINS_DIR` if needed, and copies generated plugin artifacts into the local Kestra plugins directory.

### `/rc-manual-utilities`
- `gh_empty-cache.sh`: Manual GitHub CLI utility that lists and deletes GitHub Actions caches for a specified `kestra-io/<repo>` repository.
- `gh_launch-release-workflow.sh`: Manual GitHub CLI helper that triggers the `main.yml` workflow on a specified repository/branch pair.
- `gh_restart-main-build-on-branch.sh`: Convenience wrapper that clears Actions caches and then relaunches the main workflow for a specific repo/branch.
- `gh_run-main-workflow-on-all-plugins.sh`: Bulk GitHub CLI script that enumerates all `kestra-io` repositories whose names start with `plugin-` and triggers the main workflow for each one.

## Notes

- `dev-tools` is operationally useful but not part of the Kestra runtime surface; it is a support/tooling directory for maintainers.
- The `rc-manual-utilities` scripts assume the `gh` CLI is installed and authenticated, and some of them also rely on `jq`.
