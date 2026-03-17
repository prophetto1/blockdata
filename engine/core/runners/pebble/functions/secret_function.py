from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\SecretFunction.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.services.namespace_service import NamespaceService
from engine.core.secret.secret_service import SecretService


@dataclass(slots=True, kw_only=True)
class SecretFunction:
    object_mapper: ClassVar[ObjectMapper]
    logger: ClassVar[Logger] = getLogger(__name__)
    name: ClassVar[str] = "secret"
    subkey_arg: ClassVar[str] = "subkey"
    namespace_arg: ClassVar[str] = "namespace"
    key_arg: ClassVar[str] = "key"
    secret_service: SecretService | None = None
    namespace_service: NamespaceService | None = None

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_secret_key(self, args: dict[str, Any], self: PebbleTemplate, line_number: int) -> str:
        raise NotImplementedError  # TODO: translate from Java
