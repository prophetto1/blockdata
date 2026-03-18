from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\cluster\CreateCluster.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class CreateCluster(AbstractTask):
    """Create a Databricks cluster"""
    cluster_name: Property[str]
    spark_version: Property[str]
    node_type_id: Property[str] | None = None
    auto_termination_minutes: Property[int] | None = None
    num_workers: Property[int] | None = None
    min_workers: Property[int] | None = None
    max_workers: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        cluster_id: str | None = None
        cluster_u_r_i: str | None = None
        cluster_state: State | None = None
