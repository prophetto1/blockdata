from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\models\ExternalTableDefinition.java
# WARNING: Unresolved types: bigquery, cloud, com, gcp, google, io, kestra, models, plugin

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.gcp.bigquery.models.schema import Schema


@dataclass(slots=True, kw_only=True)
class ExternalTableDefinition:
    source_uris: Property[list[str]] | None = None
    format_type: Property[FormatType] | None = None
    autodetect: Property[bool] | None = None
    compression: Property[str] | None = None
    max_bad_records: Property[int] | None = None
    ignore_unknown_values: Property[bool] | None = None

    @staticmethod
    def of(external_table_definition: com.google.cloud.bigquery.ExternalTableDefinition) -> ExternalTableDefinition.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to(self, run_context: RunContext, schema: io.kestra.plugin.gcp.bigquery.models.Schema) -> com.google.cloud.bigquery.ExternalTableDefinition:
        raise NotImplementedError  # TODO: translate from Java

    class FormatType(str, Enum):
        CSV = "CSV"
        JSON = "JSON"
        BIGTABLE = "BIGTABLE"
        DATASTORE_BACKUP = "DATASTORE_BACKUP"
        AVRO = "AVRO"
        GOOGLE_SHEETS = "GOOGLE_SHEETS"
        PARQUET = "PARQUET"
        ORC = "ORC"

    @dataclass(slots=True)
    class Output:
        source_uris: list[str] | None = None
        format_type: FormatType | None = None
        autodetect: bool | None = None
        compression: str | None = None
        max_bad_records: int | None = None
        ignore_unknown_values: bool | None = None
