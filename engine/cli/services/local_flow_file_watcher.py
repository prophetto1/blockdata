from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\LocalFlowFileWatcher.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.cli.services.flow_files_manager import FlowFilesManager
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.flows.generic_flow import GenericFlow


@dataclass(slots=True, kw_only=True)
class LocalFlowFileWatcher:
    logger: ClassVar[Logger] = getLogger(__name__)
    flow_repository: FlowRepositoryInterface | None = None

    def create_or_update_flow(self, flow: GenericFlow) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def delete_flow(self, tenant_id: str, namespace: str | None = None, id: str | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java
