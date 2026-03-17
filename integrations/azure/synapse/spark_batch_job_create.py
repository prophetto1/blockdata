from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\synapse\SparkBatchJobCreate.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SparkBatchJobCreate(AbstractAzureIdentityConnection):
    """Submit Spark batch to Synapse pool"""
    endpoint: Property[str]
    spark_pool_name: Property[str]
    name: Property[str]
    file: Property[str]
    class_name: Property[str] | None = None
    arguments: Property[list[str]] | None = None
    jars: Property[list[str]] | None = None
    py_files: Property[list[str]] | None = None
    files: Property[list[str]] | None = None
    archives: Property[list[str]] | None = None
    conf: Property[dict[str, str]] | None = None
    driver_memory: Property[str] | None = None
    driver_cores: Property[int] | None = None
    executor_memory: Property[str] | None = None
    executor_cores: Property[int] | None = None
    executor_count: Property[int] | None = None
    tags: Property[dict[str, str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_id: int | None = None
        state: str | None = None
        app_id: str | None = None
