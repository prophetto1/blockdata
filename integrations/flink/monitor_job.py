from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.http.client.http_client import HttpClient
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class MonitorJob(AbstractTrigger, PollingTriggerInterface):
    """Trigger on Flink job state"""
    rest_url: Property[str]
    job_id: Property[str]
    interval: Property[timedelta] | None = None
    fail_on_error: Property[bool] | None = None
    expected_terminal_states: Property[java] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def get_job_status(self, client: HttpClient, rest_url: str, job_id: str) -> JobStatus:
        raise NotImplementedError  # TODO: translate from Java

    def parse_job_status(self, response_body: str) -> JobStatus:
        raise NotImplementedError  # TODO: translate from Java

    def extract_json_value(self, json: str, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminal_state(self, state: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_expected_terminal_states(self, run_context: RunContext) -> java:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class JobStatus:
        state: str | None = None
        state_details: str | None = None


@dataclass(slots=True, kw_only=True)
class JobStatus:
    state: str | None = None
    state_details: str | None = None
