from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class CreateCluster(AbstractTask, RunnableTask):
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
    class Output(io):
        cluster_id: str | None = None
        cluster_u_r_i: str | None = None
        cluster_state: State | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    cluster_id: str | None = None
    cluster_u_r_i: str | None = None
    cluster_state: State | None = None
