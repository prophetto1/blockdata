from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\templates\namespaces\TemplateNamespaceUpdateCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.commands.abstract_service_namespace_update_command import AbstractServiceNamespaceUpdateCommand
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService


@dataclass(slots=True, kw_only=True)
class TemplateNamespaceUpdateCommand(AbstractServiceNamespaceUpdateCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    tenant_service: TenantIdSelectorService | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
