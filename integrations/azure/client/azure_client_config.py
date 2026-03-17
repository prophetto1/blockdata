from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AzureClientConfig:
    run_context: RunContext | None = None
    plugin: T | None = None

    def connection_string(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def shared_key_account_name(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def shared_key_account_access_key(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def sas_token(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_optional_config(self, supplier: Supplier[Property[String]]) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java
