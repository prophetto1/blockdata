from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.models.encryption_configuration import EncryptionConfiguration
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.core.dashboard.chart.table import Table
from integrations.gcp.bigquery.models.table_definition import TableDefinition


@dataclass(slots=True, kw_only=True)
class AbstractTable(AbstractBigquery):
    dataset: Property[str]
    table: Property[str]

    def table_id(self, run_context: RunContext) -> TableId:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
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
        num_rows: BigInteger | None = None
        definition: TableDefinition | None = None
        encryption_configuration: EncryptionConfiguration | None = None
        labels: dict[String, String] | None = None
        require_partition_filter: bool | None = None

        def of(self, table: Table) -> Output:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
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
    num_rows: BigInteger | None = None
    definition: TableDefinition | None = None
    encryption_configuration: EncryptionConfiguration | None = None
    labels: dict[String, String] | None = None
    require_partition_filter: bool | None = None

    def of(self, table: Table) -> Output:
        raise NotImplementedError  # TODO: translate from Java
