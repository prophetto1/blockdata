from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\FileChangedEventListener.java
# WARNING: Unresolved types: CopyOnWriteArrayList, FileWatchConfiguration, IOException, InterruptedException, WatchService

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.services.flow_files_manager import FlowFilesManager
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.services.flow_listeners_interface import FlowListenersInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_path import FlowWithPath
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.validations.model_validator import ModelValidator
from engine.core.services.plugin_default_service import PluginDefaultService


@dataclass(slots=True, kw_only=True)
class FileChangedEventListener:
    flows: list[FlowWithPath] = new CopyOnWriteArrayList<>()
    is_started: bool = False
    file_watch_configuration: FileWatchConfiguration | None = None
    watch_service: WatchService | None = None
    flow_repository_interface: FlowRepositoryInterface | None = None
    plugin_default_service: PluginDefaultService | None = None
    model_validator: ModelValidator | None = None
    flow_listeners: FlowListenersInterface | None = None
    flow_files_manager: FlowFilesManager | None = None

    def start_listening_from_config(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def start_listening(self, paths: list[Path]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def load_flows_from_folder(self, folder: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flow_to_file(self, flow: FlowInterface, path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def parse_flow(self, content: str, entry: Path) -> Optional[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_file(self, file: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_path(self, flow: FlowInterface) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def get_tenant_id_from_path(self, path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java
