from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowCreateCommand.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from pathlib import Path
from typing import Any, ClassVar

from engine.cli.abstract_api_command import AbstractApiCommand
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService


@dataclass(slots=True, kw_only=True)
class FlowCreateCommand(AbstractApiCommand):
    logger: ClassVar[Logger] = getLogger(__name__)
    flow_file: Path | None = None
    tenant_service: TenantIdSelectorService | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def check_file(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
