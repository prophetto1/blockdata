from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from integrations.neo4j.batch import Batch
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractBatch(AbstractTask, RunnableTask):
    region: Property[str]
    name: Property[str]
    execution: AbstractBatch | None = None
    peripherals: AbstractBatch | None = None
    runtime: AbstractBatch | None = None

    def build_batch(self, builder: Batch, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExecutionConfiguration:
        network_uri: Property[str] | None = None
        subnetwork_uri: Property[str] | None = None
        network_tags: Property[list[String]] | None = None
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
        properties: Property[dict[String, String]] | None = None

    @dataclass(slots=True)
    class Output(io):
        state: com | None = None


@dataclass(slots=True, kw_only=True)
class ExecutionConfiguration:
    network_uri: Property[str] | None = None
    subnetwork_uri: Property[str] | None = None
    network_tags: Property[list[String]] | None = None
    service_account_email: Property[str] | None = None
    kms_key: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class PeripheralsConfiguration:
    metastore_service: Property[str] | None = None
    spark_history_server: SparkHistoryServerConfiguration | None = None


@dataclass(slots=True, kw_only=True)
class SparkHistoryServerConfiguration:
    dataproc_cluster: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class RuntimeConfiguration:
    container_image: Property[str] | None = None
    version: Property[str] | None = None
    properties: Property[dict[String, String]] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    state: com | None = None
