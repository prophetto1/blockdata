from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\RangePartitioning.java
# WARNING: Unresolved types: bigquery, cloud, com, google

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RangePartitioning:
    field: Property[str] | None = None
    range: Range | None = None

    @staticmethod
    def of(range_partitioning: com.google.cloud.bigquery.RangePartitioning) -> RangePartitioning.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> com.google.cloud.bigquery.RangePartitioning:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        field: str | None = None
        range: Range.Output | None = None

    @dataclass(slots=True)
    class Range:
        start: Property[int] | None = None
        end: Property[int] | None = None
        interval: Property[int] | None = None

        @staticmethod
        def of(range: com.google.cloud.bigquery.RangePartitioning.Range) -> Range.Output:
            raise NotImplementedError  # TODO: translate from Java

        def to(self, run_context: RunContext) -> com.google.cloud.bigquery.RangePartitioning.Range:
            raise NotImplementedError  # TODO: translate from Java

        @dataclass(slots=True)
        class Output:
            start: int | None = None
            end: int | None = None
            interval: int | None = None
