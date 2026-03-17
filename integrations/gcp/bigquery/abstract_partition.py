from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractPartition.java
# WARNING: Unresolved types: TableId

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.gcp.bigquery.abstract_table import AbstractTable
from integrations.singer.taps.big_query import BigQuery
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractPartition(ABC, AbstractTable):
    partition_type: Property[PartitionType]
    from: Property[str]
    to: Property[str]
    a_d_d_e_d__d_a_t_e: ClassVar[dict[AbstractPartition.PartitionType, str]] = Map.of(
        HOUR, "0000",
        DAY, "000000",
        MONTH, "01000000",
        YEAR, "0101000000"
    )

    def table_id(self, run_context: RunContext, partition: str) -> TableId:
        raise NotImplementedError  # TODO: translate from Java

    def list_partitions(self, run_context: RunContext, connection: BigQuery, table_id: TableId) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    class PartitionType(str, Enum):
        DAY = "DAY"
        HOUR = "HOUR"
        MONTH = "MONTH"
        YEAR = "YEAR"
        RANGE = "RANGE"
