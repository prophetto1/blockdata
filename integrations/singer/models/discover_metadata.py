from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\models\DiscoverMetadata.java

from dataclasses import dataclass
from enum import Enum
from typing import Any


@dataclass(slots=True, kw_only=True)
class DiscoverMetadata:
    selected: bool = True
    replication_method: ReplicationMethod | None = None
    replication_key: str | None = None
    view_key_properties: list[str] | None = None
    inclusion: Inclusion | None = None
    selected_by_default: bool | None = None
    valid_replication_keys: Any | None = None
    force_replication_method: ForceReplicationMethod | None = None
    table_key_properties: list[str] | None = None
    schema_name: str | None = None
    is_view: bool | None = None
    row_count: int | None = None
    database_name: str | None = None
    sql_datatype: str | None = None
    table: str | None = None
    columns: list[str] | None = None
    datetime_key: str | None = None
    extra: dict[str, Any] | None = None

    def get_extra_fields(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    class ReplicationMethod(str, Enum):
        FULL_TABLE = "FULL_TABLE"
        INCREMENTAL = "INCREMENTAL"
        LOG_BASED = "LOG_BASED"

    class Inclusion(str, Enum):
        available = "available"
        automatic = "automatic"
        unsupported = "unsupported"

    class ForceReplicationMethod(str, Enum):
        FULL_TABLE = "FULL_TABLE"
        INCREMENTAL = "INCREMENTAL"
