from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractTableCreateUpdate.java
# WARNING: Unresolved types: Builder, Exception, TableInfo

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.gcp.bigquery.abstract_table import AbstractTable
from integrations.gcp.bigquery.models.encryption_configuration import EncryptionConfiguration
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.gcp.bigquery.models.table_definition import TableDefinition


@dataclass(slots=True, kw_only=True)
class AbstractTableCreateUpdate(ABC, AbstractTable):
    table_definition: TableDefinition | None = None
    friendly_name: Property[str] | None = None
    description: str | None = None
    labels: Property[dict[str, str]] | None = None
    require_partition_filter: Property[bool] | None = None
    encryption_configuration: EncryptionConfiguration | None = None
    expiration_duration: Property[timedelta] | None = None

    def build(self, builder: TableInfo.Builder, run_context: RunContext) -> TableInfo.Builder:
        raise NotImplementedError  # TODO: translate from Java
