from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractDataset.java
# WARNING: Unresolved types: Acl, DatasetInfo, Exception, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.models.access_control import AccessControl
from integrations.gcp.bigquery.models.encryption_configuration import EncryptionConfiguration
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractDataset(ABC, AbstractBigquery):
    name: Property[str]
    acl: list[AccessControl] | None = None
    default_table_lifetime: Property[int] | None = None
    description: str | None = None
    friendly_name: Property[str] | None = None
    location: Property[str] | None = None
    default_encryption_configuration: EncryptionConfiguration | None = None
    default_partition_expiration_ms: Property[int] | None = None
    labels: Property[dict[str, str]] | None = None

    def dataset_info(self, run_context: RunContext) -> DatasetInfo:
        raise NotImplementedError  # TODO: translate from Java

    def map_acls(self, access_controls: list[AccessControl], run_context: RunContext) -> list[Acl]:
        raise NotImplementedError  # TODO: translate from Java

    def map_acl(self, access_control: AccessControl, run_context: RunContext) -> Acl:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        dataset: str
        project: str
        friendly_name: str
        description: str
        location: str

        @staticmethod
        def of(dataset: DatasetInfo) -> Output:
            raise NotImplementedError  # TODO: translate from Java
