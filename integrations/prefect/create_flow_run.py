from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.http.client.http_client import HttpClient
from integrations.prefect.prefect_connection import PrefectConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class CreateFlowRun(Task, RunnableTask):
    """Trigger a Prefect deployment run"""
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    api_url: Property[str] | None = None
    api_key: Property[str] | None = None
    account_id: Property[str] | None = None
    workspace_id: Property[str] | None = None
    deployment_id: Property[str]
    wait: Property[bool] | None = None
    poll_frequency: timedelta | None = None
    parameters: dict[String, Object] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_completion(self, run_context: RunContext, connection: PrefectConnection, http_client: HttpClient, flow_run_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminal_state(self, state_type: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_run_url(self, run_context: RunContext, connection: PrefectConnection, flow_run_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        flow_run_id: str | None = None
        state: str | None = None
        flow_run_url: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    flow_run_id: str | None = None
    state: str | None = None
    flow_run_url: str | None = None
