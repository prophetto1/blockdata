from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractTable.java
# WARNING: Unresolved types: TableId, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.models.encryption_configuration import EncryptionConfiguration
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.core.dashboard.chart.table import Table
from integrations.gcp.bigquery.models.table_definition import TableDefinition


@dataclass(slots=True, kw_only=True)
class AbstractTable(ABC, AbstractBigquery):
    dataset: Property[str]
    table: Property[str]

    def table_id(self, run_context: RunContext) -> TableId:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        project_id: str | None = None
        dataset_id: str | None = None
        table: str | None = None
        etag: str | None = None
        generated_id: str | None = None
        self_link: str | None = None
        friendly_name: str | None = None
        description: str | None = None
        creation_time: datetime | None = None
        expiration_time: datetime | None = None
        last_modified_time: datetime | None = None
        num_bytes: int | None = None
        num_long_term_bytes: int | None = None
        num_rows: int | None = None
        definition: TableDefinition.Output | None = None
        encryption_configuration: EncryptionConfiguration.Output | None = None
        labels: dict[str, str] | None = None
        require_partition_filter: bool | None = None

        @staticmethod
        def of(table: Table) -> Output:
            raise NotImplementedError  # TODO: translate from Java
