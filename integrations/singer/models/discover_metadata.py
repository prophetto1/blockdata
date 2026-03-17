from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


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


@dataclass(slots=True, kw_only=True)
class DiscoverMetadata:
    selected: bool | None = None
    replication_method: ReplicationMethod | None = None
    replication_key: str | None = None
    view_key_properties: list[String] | None = None
    inclusion: Inclusion | None = None
    selected_by_default: bool | None = None
    valid_replication_keys: Any | None = None
    force_replication_method: ForceReplicationMethod | None = None
    table_key_properties: list[String] | None = None
    schema_name: str | None = None
    is_view: bool | None = None
    row_count: int | None = None
    database_name: str | None = None
    sql_datatype: str | None = None
    table: str | None = None
    columns: list[String] | None = None
    datetime_key: str | None = None
    extra: dict[String, Object] | None = None

    def get_extra_fields(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
