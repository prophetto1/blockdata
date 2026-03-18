from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\TableDefinition.java
# WARNING: Unresolved types: Exception, T, bigquery, cloud, com, gcp, google, io, kestra, models, plugin

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.models.external_table_definition import ExternalTableDefinition
from integrations.gcp.bigquery.models.materialized_view_definition import MaterializedViewDefinition
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.gcp.bigquery.models.schema import Schema
from integrations.gcp.bigquery.models.standard_table_definition import StandardTableDefinition
from integrations.gcp.bigquery.models.view_definition import ViewDefinition


@dataclass(slots=True, kw_only=True)
class TableDefinition:
    type: Property[Type] | None = None
    schema: io.kestra.plugin.gcp.bigquery.models.Schema | None = None
    standard_table_definition: StandardTableDefinition | None = None
    materialized_view_definition: MaterializedViewDefinition | None = None
    view_definition: ViewDefinition | None = None
    external_table_definition: ExternalTableDefinition | None = None

    @staticmethod
    def of(table_definition: T) -> TableDefinition.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext) -> T:
        raise NotImplementedError  # TODO: translate from Java

    class Type(str, Enum):
        TABLE = "TABLE"
        VIEW = "VIEW"
        MATERIALIZED_VIEW = "MATERIALIZED_VIEW"
        EXTERNAL = "EXTERNAL"
        MODEL = "MODEL"

    @dataclass(slots=True)
    class Output:
        type: Type | None = None
        schema: io.kestra.plugin.gcp.bigquery.models.Schema.Output | None = None
        view_definition: ViewDefinition.Output | None = None
        external_table_definition: ExternalTableDefinition.Output | None = None
        standard_table_definition: StandardTableDefinition.Output | None = None
        materialized_view_definition: MaterializedViewDefinition.Output | None = None
