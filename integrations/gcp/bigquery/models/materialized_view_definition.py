from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\MaterializedViewDefinition.java
# WARNING: Unresolved types: bigquery, cloud, com, google

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MaterializedViewDefinition:
    last_refresh_date: datetime | None = None
    query: Property[str] | None = None
    enable_refresh: Property[bool] | None = None
    refresh_interval: Property[timedelta] | None = None

    @staticmethod
    def of(materialized_view_definition: com.google.cloud.bigquery.MaterializedViewDefinition) -> MaterializedViewDefinition.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.MaterializedViewDefinition:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        last_refresh_date: datetime | None = None
        query: str | None = None
        enable_refresh: bool | None = None
        refresh_interval: timedelta | None = None
