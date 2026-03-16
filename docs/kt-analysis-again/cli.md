# Kestra `cli` Inventory

Source root: `E:\kestra\cli`

Module purpose: the Picocli + Micronaut command-line entrypoint for Kestra. This module wires top-level CLI commands, local/standalone server launchers, plugin management commands, namespace/flow/template sync commands, migration helpers, and the supporting listeners/services used by the CLI runtime.

Observed file count: 145 files.

## File Tree

### `/`
- `build.gradle`: Gradle module file for the CLI app; wires Picocli, Micronaut server dependencies, OTLP metrics, local storage/JDBC modules, and server components, and defines `runLocal` / `runStandalone` tasks that boot `io.kestra.cli.App`.

### `/src/main/java/io/kestra/cli`
- `AbstractApiCommand.java`: Base command for CLI actions that talk to a running Kestra API; centralizes server URL/auth-related HTTP request setup.
- `AbstractCommand.java`: Common command base that bootstraps the Micronaut application context, plugin system, configuration loading, and shared command lifecycle behavior.
- `AbstractValidateCommand.java`: Shared validation-oriented command base used by flow/template commands; handles validation payload assembly and HTTP/local validation helpers.
- `App.java`: Root Picocli application entrypoint that registers the top-level `configs`, `flow`, `migrate`, `namespace`, `plugins`, `server`, `sys`, and `template` command groups.
- `BaseCommand.java`: Lowest-level CLI base class that defines shared Picocli options like verbosity/help and standard output/log behavior.
- `StandAloneRunner.java`: Helper that starts and supervises embedded Kestra services for standalone/local CLI server modes.
- `VersionProvider.java`: Picocli version provider used to print CLI version information.

### `/src/main/java/io/kestra/cli/commands`
- `AbstractServiceNamespaceUpdateCommand.java`: Shared parameter holder for namespace sync/update commands that upload directory contents into a namespace-backed service.

### `/src/main/java/io/kestra/cli/commands/configs/sys`
- `ConfigCommand.java`: Parent `configs` command group for configuration-related CLI actions.
- `ConfigPropertiesCommand.java`: Prints the currently resolved Micronaut/Kestra configuration properties from the running context.

### `/src/main/java/io/kestra/cli/commands/flows`
- `FlowCommand.java`: Parent `flow` command group for flow CRUD, validation, export, test, and namespace sync operations.
- `FlowCreateCommand.java`: Creates a single flow from a file through the API/validation path.
- `FlowDeleteCommand.java`: Deletes a single flow identified by namespace/id.
- `FlowDotCommand.java`: Parses a flow and emits a DOT graph representation of its task graph.
- `FlowExpandCommand.java`: Deprecated helper that expands a flow file after parsing and validation.
- `FlowExportCommand.java`: Exports flows to a ZIP archive.
- `FlowsSyncFromSourceCommand.java`: Syncs repository/source-backed flows into storage, updating existing records from source definitions.
- `FlowTestCommand.java`: Executes flow test logic against a flow definition and supporting repositories/queues.
- `FlowUpdateCommand.java`: Updates a single existing flow from a file.
- `FlowUpdatesCommand.java`: Bulk create/update command for a folder of flows, with optional deletion of missing remote flows.
- `FlowValidateCommand.java`: Validates a flow definition and reports model/service validation errors.
- `IncludeHelperExpander.java`: Deprecated include-expansion helper that inlines external helper files into flow text.

### `/src/main/java/io/kestra/cli/commands/flows/namespaces`
- `FlowNamespaceCommand.java`: Parent command group for namespace-scoped flow synchronization.
- `FlowNamespaceUpdateCommand.java`: Updates all flow files in a namespace from a local directory using multipart upload and validation logic.

### `/src/main/java/io/kestra/cli/commands/migrations`
- `MigrationCommand.java`: Parent `migrate` command group for CLI-driven migration utilities.
- `TenantMigrationCommand.java`: Migrates records without a tenant into the main/default tenant.
- `TenantMigrationService.java`: Service logic behind tenant migration; moves flows and related entities into the target tenant and republishes queue state as needed.

### `/src/main/java/io/kestra/cli/commands/migrations/metadata`
- `KvMetadataMigrationCommand.java`: Runs metadata backfill for namespace KV records.
- `MetadataMigrationCommand.java`: Parent command group for metadata backfill commands.
- `MetadataMigrationService.java`: Shared implementation for rebuilding metadata for KV, namespace files, secrets, and related persisted entities.
- `NsFilesMetadataMigrationCommand.java`: Runs metadata backfill for namespace files.
- `SecretsMetadataMigrationCommand.java`: Runs metadata backfill for stored secrets metadata.

### `/src/main/java/io/kestra/cli/commands/namespaces`
- `NamespaceCommand.java`: Parent `namespace` command group for namespace-scoped resources.

### `/src/main/java/io/kestra/cli/commands/namespaces/files`
- `NamespaceFilesCommand.java`: Parent command group for namespace file management.
- `NamespaceFilesUpdateCommand.java`: Uploads/synchronizes local files into a namespace, honoring `.kestraignore` patterns and multipart uploads.

### `/src/main/java/io/kestra/cli/commands/namespaces/kv`
- `KvCommand.java`: Parent command group for namespace KV store management.
- `KvUpdateCommand.java`: Updates a namespace KV key/value entry from the CLI.

### `/src/main/java/io/kestra/cli/commands/plugins`
- `PluginCommand.java`: Parent `plugins` command group for plugin catalog/install/doc actions.
- `PluginDocCommand.java`: Generates plugin documentation, schemas, and optional icons for installed plugins.
- `PluginInstallCommand.java`: Installs one or more plugins from the catalog/repository into the configured plugin location.
- `PluginListCommand.java`: Lists currently installed plugins.
- `PluginSearchCommand.java`: Searches the available Kestra plugin catalog via HTTP.
- `PluginUninstallCommand.java`: Removes installed plugins from the configured plugin location.

### `/src/main/java/io/kestra/cli/commands/servers`
- `AbstractServerCommand.java`: Base class for server-launching commands; defines shared server CLI options like ports, plugins, and startup overrides.
- `ExecutorCommand.java`: Starts the Kestra executor service from the CLI.
- `IndexerCommand.java`: Starts the Kestra indexer service from the CLI.
- `LocalCommand.java`: Starts the local development all-in-one server with local storage and H2-backed defaults.
- `SchedulerCommand.java`: Starts the Kestra scheduler service from the CLI.
- `ServerCommand.java`: Parent `server` command group for all server launch modes.
- `ServerCommandInterface.java`: Marker/interface used by startup hooks and shared command wiring for server commands.
- `StandAloneCommand.java`: Starts the standalone all-in-one server and wires file watching, ignored executions, and embedded service startup.
- `WebServerCommand.java`: Starts the Kestra webserver service from the CLI.
- `WorkerCommand.java`: Starts the Kestra worker service from the CLI.

### `/src/main/java/io/kestra/cli/commands/sys`
- `ReindexCommand.java`: Reindexes persisted records by re-reading and updating them through repository/index services.
- `SubmitQueuedCommand.java`: Submits queued executions back into the executor pipeline from JDBC-backed queue storage.
- `SysCommand.java`: Parent `sys` command group for system maintenance actions.

### `/src/main/java/io/kestra/cli/commands/sys/database`
- `DatabaseCommand.java`: Parent command group for database maintenance commands.
- `DatabaseMigrateCommand.java`: Forces Flyway-backed database schema migration, then exits.

### `/src/main/java/io/kestra/cli/commands/sys/statestore`
- `StateStoreCommand.java`: Parent command group for state store maintenance.
- `StateStoreMigrateCommand.java`: Migrates older state-store files into the newer KV-store-backed implementation.

### `/src/main/java/io/kestra/cli/commands/templates`
- `TemplateCommand.java`: Parent `template` command group for template management.
- `TemplateExportCommand.java`: Exports templates to a ZIP archive.
- `TemplateValidateCommand.java`: Validates a template definition.

### `/src/main/java/io/kestra/cli/commands/templates/namespaces`
- `TemplateNamespaceCommand.java`: Parent command group for namespace template synchronization.
- `TemplateNamespaceUpdateCommand.java`: Updates templates in a namespace from a local directory.

### `/src/main/java/io/kestra/cli/listeners`
- `DeleteConfigurationApplicationListeners.java`: Startup listener that deletes configuration files on boot when the corresponding setting is enabled.
- `GracefulEmbeddedServiceShutdownListener.java`: Shutdown listener that waits for embedded Kestra services to stop cleanly before process exit.

### `/src/main/java/io/kestra/cli/logger`
- `StackdriverJsonLayout.java`: Custom Logback JSON layout tailored for Stackdriver/GCP-style structured log output.

### `/src/main/java/io/kestra/cli/services`
- `DefaultEnvironmentProvider.java`: Default provider that supplies Micronaut CLI environment names.
- `DefaultStartupHook.java`: Default startup hook that records/saves the Kestra version when server commands start.
- `EnvironmentProvider.java`: SPI interface for customizing which Micronaut environments the CLI should activate.
- `FileChangedEventListener.java`: File-watch listener that reloads local flow files into the repository when watched files change.
- `FlowFilesManager.java`: Interface for flow create/update/delete behavior used by file-watching and source-sync services.
- `LocalFlowFileWatcher.java`: `FlowFilesManager` implementation that persists watched local flow file changes into the repository.
- `StartupHookInterface.java`: SPI interface for logic that should run when commands start.
- `TenantIdSelectorService.java`: Tenant helper that enforces/mainlines tenant selection rules for CLI commands.

### `/src/main/resources`
- `application.yml`: Default CLI/server Micronaut configuration for the module.
- `logback.xml`: Production/default Logback configuration used by the CLI module.

### `/src/main/resources/META-INF/services`
- `io.kestra.cli.services.EnvironmentProvider`: Java service loader registration for the default/custom `EnvironmentProvider` implementation.

### `/src/test/java/io/kestra/cli`
- `AppTest.java`: Smoke test for the root CLI application wiring.

### `/src/test/java/io/kestra/cli/commands/configs/sys`
- `ConfigPropertiesCommandTest.java`: Tests configuration property output behavior.
- `NoConfigCommandTest.java`: Verifies CLI behavior when no config command arguments are supplied.

### `/src/test/java/io/kestra/cli/commands/flows`
- `FlowCreateOrUpdateCommandTest.java`: Tests single-flow create/update command behavior.
- `FlowDotCommandTest.java`: Tests DOT graph generation for flows.
- `FlowExpandCommandTest.java`: Tests the deprecated flow expand helper/command path.
- `FlowExportCommandTest.java`: Tests flow ZIP export behavior.
- `FlowsSyncFromSourceCommandTest.java`: Tests source-backed flow synchronization.
- `FlowTestCommandTest.java`: Tests flow execution/test command behavior.
- `FlowUpdatesCommandTest.java`: Tests folder-based flow bulk update/sync behavior.
- `FlowValidateCommandTest.java`: Tests flow validation output and failure paths.
- `SingleFlowCommandsTest.java`: Consolidated tests for single-flow command variants.
- `TemplateValidateCommandTest.java`: Flow-command-side validation test covering template-style validation scenarios.

### `/src/test/java/io/kestra/cli/commands/flows/namespaces`
- `FlowNamespaceCommandTest.java`: Smoke test for the namespace flow command group.
- `FlowNamespaceUpdateCommandTest.java`: Tests namespace flow directory upload/update behavior.

### `/src/test/java/io/kestra/cli/commands/migrations/metadata`
- `KvMetadataMigrationCommandTest.java`: Tests KV metadata backfill command behavior.
- `MetadataMigrationServiceTest.java`: Tests shared metadata migration service logic.
- `NsFilesMetadataMigrationCommandTest.java`: Tests namespace file metadata migration behavior.
- `SecretsMetadataMigrationCommandTest.java`: Tests secrets metadata backfill command behavior.

### `/src/test/java/io/kestra/cli/commands/namespaces`
- `NamespaceCommandTest.java`: Smoke test for the namespace command group.

### `/src/test/java/io/kestra/cli/commands/namespaces/files`
- `NamespaceFilesCommandTest.java`: Smoke test for namespace file commands.
- `NamespaceFilesUpdateCommandTest.java`: Tests namespace file synchronization, ignore handling, and upload behavior.

### `/src/test/java/io/kestra/cli/commands/namespaces/kv`
- `KvCommandTest.java`: Smoke test for KV command group wiring.
- `KvUpdateCommandTest.java`: Tests KV update behavior against the KV store service.

### `/src/test/java/io/kestra/cli/commands/plugins`
- `PluginCommandTest.java`: Smoke test for the plugins command group.
- `PluginDocCommandTest.java`: Tests plugin documentation generation output.
- `PluginInstallCommandTest.java`: Tests plugin installation behavior, including local install flows.
- `PluginListCommandTest.java`: Tests listing installed plugins.
- `PluginSearchCommandTest.java`: Tests plugin catalog search against mocked HTTP responses.

### `/src/test/java/io/kestra/cli/commands/servers`
- `TenantIdSelectorServiceTest.java`: Tests tenant selection rules used by server/CLI commands.

### `/src/test/java/io/kestra/cli/commands/sys`
- `ReindexCommandTest.java`: Tests CLI reindex command behavior.

### `/src/test/java/io/kestra/cli/commands/sys/database`
- `DatabaseCommandTest.java`: Smoke test for database command group wiring.

### `/src/test/java/io/kestra/cli/commands/sys/statestore`
- `StateStoreCommandTest.java`: Smoke test for state-store command group wiring.
- `StateStoreMigrateCommandTest.java`: Tests migration from legacy state-store files to KV-backed storage.

### `/src/test/java/io/kestra/cli/commands/templates`
- `TemplateExportCommandTest.java`: Tests template ZIP export behavior.
- `TemplateValidateCommandTest.java`: Tests template validation behavior.

### `/src/test/java/io/kestra/cli/commands/templates/namespaces`
- `TemplateNamespaceCommandTest.java`: Smoke test for namespace template command group.
- `TemplateNamespaceUpdateCommandTest.java`: Tests namespace template synchronization behavior.

### `/src/test/java/io/kestra/cli/listeners`
- `DeleteConfigurationApplicationListenersTest.java`: Tests startup-time config file deletion behavior.

### `/src/test/java/io/kestra/cli/services`
- `FileChangedEventListenerTest.java`: Tests file-watch-driven flow reload/update behavior.

### `/src/test/resources`
- `application-file-watch.yml`: Test Micronaut/Kestra configuration enabling file-watch mode for CLI tests.
- `application-test.yml`: Default test configuration using memory repositories/queues and local storage.
- `logback.xml`: Test logging configuration used during CLI test runs.

### `/src/test/resources/crudFlow`
- `date.yml`: Small flow fixture used for CRUD/test command scenarios.

### `/src/test/resources/flows`
- `quattro.yml`: Flow fixture used in export/update/test flows.

### `/src/test/resources/flows/same`
- `first.yaml`: First flow fixture in the same namespace for multi-flow sync tests.
- `second.yaml`: Second flow fixture in the same namespace for multi-flow sync tests.

### `/src/test/resources/flows/same/flowsSubFolder`
- `third.yaml`: Nested flow fixture used to verify recursive folder sync behavior.

### `/src/test/resources/helper`
- `include.yaml`: Flow fixture that exercises include-expansion helper behavior.
- `lorem.txt`: Single-line include file used by include helper tests.
- `lorem-multiple.txt`: Multi-line include file used by include helper tests.

### `/src/test/resources/invalids`
- `empty.yaml`: Invalid/minimal flow fixture used to test validation failures.

### `/src/test/resources/invalidsTemplates`
- `template.yml`: Invalid template fixture used to test template validation failures.

### `/src/test/resources/namespacefiles/ignore`
- `.kestraignore`: Ignore rules fixture for namespace file sync tests.
- `1`: Plain file fixture that should be considered during namespace file sync tests.
- `2`: Second plain file fixture for namespace file sync tests.

### `/src/test/resources/namespacefiles/ignore/flows`
- `flow.yml`: Flow fixture placed under an ignored folder to verify `.kestraignore` filtering.

### `/src/test/resources/namespacefiles/noignore`
- `1`: Plain file fixture in the non-ignored namespacefiles test case.
- `2`: Second plain file fixture in the non-ignored namespacefiles test case.

### `/src/test/resources/namespacefiles/noignore/flows`
- `flow.yml`: Flow fixture in the non-ignored namespacefiles test case.

### `/src/test/resources/plugins`
- `plugin-template-test-0.24.0-SNAPSHOT.jar`: Binary plugin JAR fixture used to test plugin install/list/doc flows against a real packaged plugin artifact.

### `/src/test/resources/templates`
- `template.yml`: Primary template fixture used for template validation/export tests.
- `template-2.yml`: Second template fixture used for multi-template export/sync tests.

### `/src/test/resources/templates/templatesSubFolder`
- `template-3.yml`: Nested template fixture used to verify recursive template folder handling.

### `/src/test/resources/warning`
- `flow-with-warning.yaml`: Flow fixture intentionally containing deprecated/alias task usage to test warning reporting.

## Notes

- This module is the operational front door into Kestra from the command line; it is not just a thin wrapper over HTTP. It also launches local/standalone server stacks, performs migrations, watches local flow files, and manages installed plugins.
- The test fixtures under `src/test/resources` are part of the CLI behavior surface because many commands operate on directories of YAML/templates/files rather than only on in-memory objects.
