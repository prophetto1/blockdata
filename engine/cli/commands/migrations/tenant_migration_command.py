from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\TenantMigrationCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand


@dataclass(slots=True, kw_only=True)
class TenantMigrationCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    application_context: ApplicationContext | None = None
    tenant_id: str | None = None
    tenant_name: str | None = None
    dry_run: bool | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
