from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\AbstractValidateCommand.java
# WARNING: Unresolved types: Class, ConstraintViolationException, Exception, Function

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_api_command import AbstractApiCommand
from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.models.validations.model_validator import ModelValidator
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService
from engine.core.models.validations.validate_constraint_violation import ValidateConstraintViolation


@dataclass(slots=True, kw_only=True)
class AbstractValidateCommand(AbstractApiCommand):
    directory: Path | None = None
    local: bool | None = None
    tenant_service: TenantIdSelectorService | None = None

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def handle_exception(e: ConstraintViolationException, resource: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def handle_http_exception(e: HttpClientResponseException, resource: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def handle_validate_constraint_violation(validate_constraint_violation: ValidateConstraintViolation, resource: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def call(self, cls: Class[Any], model_validator: ModelValidator, identity: Function[Any, str], warnings_function: Function[Any, list[str]], infos_function: Function[Any, list[str]]) -> int:
        raise NotImplementedError  # TODO: translate from Java
