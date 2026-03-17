from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractTask, RunnableTask):
    """Create a Dataproc cluster"""
    d_a_t_a_p_r_o_c__g_o_o_g_l_e_a_p_i_s: str | None = None
    cluster_name: str | None = None
    region: str | None = None
    zone: Property[str] | None = None
    master_machine_type: Property[str] | None = None
    master_disk_size_g_b: Property[int] | None = None
    worker_machine_type: Property[str] | None = None
    worker_disk_size_g_b: Property[int] | None = None
    workers: Property[int] | None = None
    bucket: Property[str] | None = None
    image_version: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_config(self, run_context: RunContext) -> ClusterConfig:
        raise NotImplementedError  # TODO: translate from Java

    def configure_machine(self, run_context: RunContext, machine_type: Property[str], disk_size_g_b: Property[int], workers: int) -> InstanceGroupConfig:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        cluster_name: str | None = None
        created: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    cluster_name: str | None = None
    created: bool | None = None
