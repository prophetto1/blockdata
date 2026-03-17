from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\table\models\Entity.java
# WARNING: Unresolved types: OffsetDateTime, TableEntity, TableTransactionActionType

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Entity:
    partition_key: str | None = None
    row_key: str | None = None
    timestamp: OffsetDateTime | None = None
    etag: str | None = None
    properties: dict[str, Any] | None = None
    type: TableTransactionActionType | None = None

    @staticmethod
    def to(table_entity: TableEntity) -> Entity:
        raise NotImplementedError  # TODO: translate from Java

    def to(self) -> TableEntity:
        raise NotImplementedError  # TODO: translate from Java
