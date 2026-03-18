from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\TimePartitioning.java
# WARNING: Unresolved types: bigquery, cloud, com, google

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class TimePartitioning:
    type: Property[com.google.cloud.bigquery.TimePartitioning.Type] | None = None
    expiration: Property[timedelta] | None = None
    field: Property[str] | None = None
    require_partition_filter: Property[bool] | None = None

    @staticmethod
    def of(time_partitioning: com.google.cloud.bigquery.TimePartitioning) -> TimePartitioning.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.TimePartitioning:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        type: com.google.cloud.bigquery.TimePartitioning.Type | None = None
        expiration: timedelta | None = None
        field: str | None = None
        require_partition_filter: bool | None = None
