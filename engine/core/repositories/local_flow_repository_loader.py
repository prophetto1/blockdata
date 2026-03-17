from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\LocalFlowRepositoryLoader.java
# WARNING: Unresolved types: IOException, URISyntaxException

from dataclasses import dataclass, field
from logging import logging
from pathlib import Path
from typing import Any, ClassVar

from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.validations.model_validator import ModelValidator
from engine.core.services.plugin_default_service import PluginDefaultService


@dataclass(slots=True, kw_only=True)
class LocalFlowRepositoryLoader:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    flow_repository: FlowRepositoryInterface | None = None
    model_validator: ModelValidator | None = None
    plugin_default_service: PluginDefaultService | None = None

    def load(self, base_path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def load(self, tenant_id: str, base_path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def load(self, base_path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def load(self, tenant_id: str, base_path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java
