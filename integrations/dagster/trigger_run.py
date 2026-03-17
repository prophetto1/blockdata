from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dagster\src\main\java\io\kestra\plugin\dagster\TriggerRun.java
# WARNING: Unresolved types: Exception, JsonProcessingException, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.http.client.http_client import HttpClient
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class TriggerRun(Task):
    """Trigger a Dagster job via GraphQL"""
    base_url: Property[str]
    location: Property[str]
    repository: Property[str]
    job_name: Property[str]
    object_mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    wait: Property[bool] = Property.ofValue(Boolean.FALSE)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(30))
    poll_frequency: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    body: Property[dict[str, Any]] | None = None
    options: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def launch_run(self, run_context: RunContext, base_url: str, location: str, repository: str, job_name: str) -> LaunchRunResponse:
        raise NotImplementedError  # TODO: translate from Java

    def get_run_status(self, run_context: RunContext, base_url: str, run_id: str) -> RunStatusResponse:
        raise NotImplementedError  # TODO: translate from Java

    def get_http_client(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def build_launch_mutation(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_status_query(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_graph_q_l_request(self, query: str, variables: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def convert_timestamp(self, timestamp: float) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        run_id: str | None = None
        status: str | None = None
        job_name: str | None = None
        start_time: datetime | None = None
        end_time: datetime | None = None

    @dataclass(slots=True)
    class LaunchRunResponse:
        data: LaunchRunData | None = None

    @dataclass(slots=True)
    class LaunchRunData:
        launch_pipeline_execution: LaunchPipelineExecution | None = None

    @dataclass(slots=True)
    class LaunchPipelineExecution:
        typename: str | None = None
        run: Run | None = None
        message: str | None = None
        stack: str | None = None

    @dataclass(slots=True)
    class Run:
        run_id: str | None = None
        status: str | None = None

    @dataclass(slots=True)
    class RunStatusResponse:
        data: RunStatusData | None = None

    @dataclass(slots=True)
    class RunStatusData:
        run_or_error: RunOrError | None = None

    @dataclass(slots=True)
    class RunOrError:
        typename: str | None = None
        run_id: str | None = None
        status: str | None = None
        job_name: str | None = None
        start_time: float | None = None
        end_time: float | None = None
        message: str | None = None
