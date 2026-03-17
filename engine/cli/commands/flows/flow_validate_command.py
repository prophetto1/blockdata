from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowValidateCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_validate_command import AbstractValidateCommand
from engine.core.services.flow_service import FlowService
from engine.core.models.validations.model_validator import ModelValidator
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService


@dataclass(slots=True, kw_only=True)
class FlowValidateCommand(AbstractValidateCommand):
    model_validator: ModelValidator | None = None
    flow_service: FlowService | None = None
    tenant_id_selector_service: TenantIdSelectorService | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
