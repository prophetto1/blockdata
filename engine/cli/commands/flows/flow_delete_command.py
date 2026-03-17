from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowDeleteCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_api_command import AbstractApiCommand
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService


@dataclass(slots=True, kw_only=True)
class FlowDeleteCommand(AbstractApiCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    namespace: str | None = None
    id: str | None = None
    tenant_service: TenantIdSelectorService | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
