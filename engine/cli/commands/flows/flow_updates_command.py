from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowUpdatesCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_api_command import AbstractApiCommand
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService


@dataclass(slots=True, kw_only=True)
class FlowUpdatesCommand(AbstractApiCommand):
    delete: bool = False
    directory: Path | None = None
    namespace: str | None = None
    tenant_id_selector_service: TenantIdSelectorService | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
