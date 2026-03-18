from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\dataproc\batches\AbstractBatch.java
# WARNING: Unresolved types: Builder, Exception, cloud, com, core, dataproc, google, io, kestra, models, tasks, v1

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from integrations.azure.storage.cosmosdb.batch import Batch
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class AbstractBatch(ABC, AbstractTask):
    region: Property[str]
    name: Property[str]
    execution: AbstractBatch.ExecutionConfiguration | None = None
    peripherals: AbstractBatch.PeripheralsConfiguration | None = None
    runtime: AbstractBatch.RuntimeConfiguration | None = None

    @abstractmethod
    def build_batch(self, builder: Batch.Builder, run_context: RunContext) -> None:
        ...

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExecutionConfiguration:
        network_uri: Property[str] | None = None
        subnetwork_uri: Property[str] | None = None
        network_tags: Property[list[str]] | None = None
        service_account_email: Property[str] | None = None
        kms_key: Property[str] | None = None

    @dataclass(slots=True)
    class PeripheralsConfiguration:
        metastore_service: Property[str] | None = None
        spark_history_server: SparkHistoryServerConfiguration | None = None

    @dataclass(slots=True)
    class SparkHistoryServerConfiguration:
        dataproc_cluster: Property[str] | None = None

    @dataclass(slots=True)
    class RuntimeConfiguration:
        container_image: Property[str] | None = None
        version: Property[str] | None = None
        properties: Property[dict[str, str]] | None = None

    @dataclass(slots=True)
    class Output:
        state: com.google.cloud.dataproc.v1.Batch.State | None = None
