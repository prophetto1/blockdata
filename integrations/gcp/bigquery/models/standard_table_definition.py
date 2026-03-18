from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\StandardTableDefinition.java
# WARNING: Unresolved types: StreamingBuffer, bigquery, cloud, com, gcp, google, io, kestra, models, plugin

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.gcp.bigquery.models.range_partitioning import RangePartitioning
from engine.core.runners.run_context import RunContext
from integrations.gcp.bigquery.models.schema import Schema
from integrations.gcp.bigquery.models.table_definition import TableDefinition
from integrations.gcp.bigquery.models.time_partitioning import TimePartitioning


@dataclass(slots=True, kw_only=True)
class StandardTableDefinition:
    streaming_buffer: StreamingBuffer | None = None
    clustering: Property[list[str]] | None = None
    time_partitioning: TimePartitioning | None = None
    range_partitioning: RangePartitioning | None = None

    @staticmethod
    def of(standard_table_definition: com.google.cloud.bigquery.StandardTableDefinition) -> StandardTableDefinition.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext, schema: io.kestra.plugin.gcp.bigquery.models.Schema) -> com.google.cloud.bigquery.TableDefinition:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        streaming_buffer: StreamingBuffer | None = None
        clustering: list[str] | None = None
        time_partitioning: TimePartitioning.Output | None = None
        range_partitioning: RangePartitioning.Output | None = None
