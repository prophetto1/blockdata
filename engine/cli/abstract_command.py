from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\AbstractCommand.java
# WARNING: Unresolved types: EndpointDefaultConfiguration, Provider, RunnableChecked

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from pathlib import Path
from typing import Any, ClassVar

from engine.cli.base_command import BaseCommand
from engine.core.plugins.plugin_manager import PluginManager
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.utils.rethrow import Rethrow
from engine.cli.services.startup_hook_interface import StartupHookInterface
from engine.cli.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class AbstractCommand(ABC, BaseCommand):
    config: Path
    plugins_path: Path
    logger: ClassVar[Logger] = getLogger(__name__)
    application_context: ApplicationContext | None = None
    endpoint_configuration: EndpointDefaultConfiguration | None = None
    startup_hook: StartupHookInterface | None = None
    version_provider: io.kestra.core.utils.VersionProvider | None = None
    plugin_registry_provider: Provider[PluginRegistry] | None = None
    plugin_manager_provider: Provider[PluginManager] | None = None
    plugin_registry: PluginRegistry | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def maybe_init_plugins(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_plugin_manager_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def init_logger(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send_server_log(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def maybe_start_webserver(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_flow_auto_load_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def shutdown_hook(self, log_shutdown: bool, run: Rethrow.RunnableChecked[Exception]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def properties_from_config(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
