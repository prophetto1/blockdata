from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-prefect\src\main\java\io\kestra\plugin\prefect\CreateFlowRun.java
# WARNING: Unresolved types: Exception, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.http.client.http_client import HttpClient
from integrations.prefect.prefect_connection import PrefectConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class CreateFlowRun(Task):
    """Trigger a Prefect deployment run"""
    deployment_id: Property[str]
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    api_url: Property[str] = Property.of("https://api.prefect.cloud/api")
    wait: Property[bool] = Property.ofValue(true)
    poll_frequency: timedelta = Duration.ofSeconds(5)
    api_key: Property[str] | None = None
    account_id: Property[str] | None = None
    workspace_id: Property[str] | None = None
    parameters: dict[str, Any] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_completion(self, run_context: RunContext, connection: PrefectConnection, http_client: HttpClient, flow_run_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminal_state(self, state_type: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_run_url(self, run_context: RunContext, connection: PrefectConnection, flow_run_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        flow_run_id: str | None = None
        state: str | None = None
        flow_run_url: str | None = None
