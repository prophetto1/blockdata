from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\dataproc\clusters\Create.java
# WARNING: Unresolved types: ClusterConfig, Exception, InstanceGroupConfig, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractTask):
    """Create a Dataproc cluster"""
    cluster_name: str
    region: str
    d_a_t_a_p_r_o_c__g_o_o_g_l_e_a_p_i_s: ClassVar[str] = "-dataproc.googleapis.com:443"
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
    class Output:
        cluster_name: str | None = None
        created: bool | None = None
