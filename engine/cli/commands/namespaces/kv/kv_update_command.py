from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\namespaces\kv\KvUpdateCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_api_command import AbstractApiCommand
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService


@dataclass(slots=True, kw_only=True)
class KvUpdateCommand(AbstractApiCommand):
    namespace: str | None = None
    key: str | None = None
    value: str | None = None
    expiration: str | None = None
    type: Type | None = None
    file_value: Path | None = None
    tenant_service: TenantIdSelectorService | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_literal(input: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def wrap_as_json_literal(input: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class Type(str, Enum):
        STRING = "STRING"
        NUMBER = "NUMBER"
        BOOLEAN = "BOOLEAN"
        DATETIME = "DATETIME"
        DATE = "DATE"
        DURATION = "DURATION"
        JSON = "JSON"
