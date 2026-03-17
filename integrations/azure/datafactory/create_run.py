from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\datafactory\CreateRun.java
# WARNING: Unresolved types: AzureProfile, DataFactoryManager, Exception, ObjectMapper, PipelineRun, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateRun(AbstractAzureIdentityConnection):
    """Start an Azure Data Factory pipeline run"""
    subscription_id: Property[str]
    p_i_p_e_l_i_n_e__s_u_c_c_e_e_d_e_d__s_t_a_t_u_s: ClassVar[str] = "Succeeded"
    p_i_p_e_l_i_n_e__f_a_i_l_e_d__s_t_a_t_u_s: ClassVar[list[str]] = List.of("Failed", "Canceling", "Cancelled")
    parameters: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    wait: Property[bool] = Property.ofValue(Boolean.TRUE)
    check_frequency: CheckFrequency = CheckFrequency.builder().build()
    factory_name: Property[str] | None = None
    pipeline_name: Property[str] | None = None
    resource_group_name: Property[str] | None = None

    def run(self, run_context: RunContext) -> CreateRun.Output:
        raise NotImplementedError  # TODO: translate from Java

    def data_factory_manager(self, run_context: RunContext) -> DataFactoryManager:
        raise NotImplementedError  # TODO: translate from Java

    def profile(self, run_context: RunContext) -> AzureProfile:
        raise NotImplementedError  # TODO: translate from Java

    def running_pipeline(self, resource_group_name: str, factory_name: str, run_id: str, manager: DataFactoryManager) -> PipelineRun:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def ion_mapper() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        run_id: str | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class CheckFrequency:
        max_duration: Property[timedelta] = Property.ofValue(Duration.ofHours(1))
        interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
