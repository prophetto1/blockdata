from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\job\Create.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, BatchClient, Exception, Runnable, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.azure.batch.abstract_batch import AbstractBatch
from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.airbyte.models.job import Job
from engine.core.models.property.property import Property
from engine.core.models.tasks.runners.remote_runner_interface import RemoteRunnerInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Create(AbstractBatch):
    """Run tasks in an Azure Batch job"""
    pool_id: Property[str]
    job: Job
    tasks: list[Task]
    d_i_r_e_c_t_o_r_y__m_a_r_k_e_r: ClassVar[str] = ".kestradirectory"
    sync_working_directory: Property[bool] = Property.ofValue(false)
    completion_check_interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(1))
    delete: Property[bool] = Property.ofValue(true)
    resume: Property[bool] = Property.ofValue(true)
    push_output_files_to_internal_storage: bool = True
    killable: AtomicReference[Runnable] = new AtomicReference<>()
    is_killed: AtomicBoolean = new AtomicBoolean(false)
    max_duration: Property[timedelta] | None = None
    log_consumer: AbstractLogConsumer | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def safely_kill_job_task(self, run_context: RunContext, client: BatchClient, job_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        vars: dict[str, Any] | None = None
        output_files: dict[str, str] | None = None
