from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.gcs.models.access_control import AccessControl
from integrations.gcp.bigquery.models.encryption_configuration import EncryptionConfiguration
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractDataset(AbstractBigquery, RunnableTask):
    name: Property[str]
    acl: list[AccessControl] | None = None
    default_table_lifetime: Property[int] | None = None
    description: str | None = None
    friendly_name: Property[str] | None = None
    location: Property[str] | None = None
    default_encryption_configuration: EncryptionConfiguration | None = None
    default_partition_expiration_ms: Property[int] | None = None
    labels: Property[dict[String, String]] | None = None

    def dataset_info(self, run_context: RunContext) -> DatasetInfo:
        raise NotImplementedError  # TODO: translate from Java

    def map_acls(self, access_controls: list[AccessControl], run_context: RunContext) -> list[Acl]:
        raise NotImplementedError  # TODO: translate from Java

    def map_acl(self, access_control: AccessControl, run_context: RunContext) -> Acl:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        dataset: str
        project: str
        friendly_name: str
        description: str
        location: str

        def of(self, dataset: DatasetInfo) -> Output:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    dataset: str
    project: str
    friendly_name: str
    description: str
    location: str

    def of(self, dataset: DatasetInfo) -> Output:
        raise NotImplementedError  # TODO: translate from Java
