from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\KvFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, IOException, PebbleTemplate

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.services.kv_store_service import KVStoreService
from engine.core.storages.kv.kv_value import KVValue
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException


@dataclass(slots=True, kw_only=True)
class KvFunction:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    key_args: ClassVar[str] = "key"
    error_on_missing_arg: ClassVar[str] = "errorOnMissing"
    namespace_arg: ClassVar[str] = "namespace"
    kv_store_service: KVStoreService | None = None

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_value_with_inheritance(self, flow_namespace: str, key: str, tenant_id: str) -> Optional[KVValue]:
        raise NotImplementedError  # TODO: translate from Java

    def get_key(self, args: dict[str, Any], self: PebbleTemplate, line_number: int) -> str:
        raise NotImplementedError  # TODO: translate from Java
