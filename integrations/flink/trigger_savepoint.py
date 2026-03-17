from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class TriggerSavepoint(Task, RunnableTask):
    """Create a savepoint for a running Flink job"""
    j_s_o_n: ObjectMapper | None = None
    rest_url: Property[str]
    job_id: Property[str]
    target_directory: Property[str] | None = None
    cancel_job: Property[bool] | None = None
    savepoint_timeout: Property[int] | None = None
    format_type: Property[str] | None = None

    def run(self, run_context: RunContext) -> TriggerSavepoint:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_savepoint(self, run_context: RunContext, client: HttpClient, rest_url: str, job_id: str, cancel_job: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_savepoint_completion(self, run_context: RunContext, client: HttpClient, rest_url: str, job_id: str, request_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_request_id_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_savepoint_status_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_savepoint_path_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_savepoint_error_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class NonRetriableSavepointException(RuntimeException):
        pass

    @dataclass(slots=True)
    class Output(io):
        job_id: str | None = None
        savepoint_path: str | None = None
        request_id: str | None = None


@dataclass(slots=True, kw_only=True)
class NonRetriableSavepointException(RuntimeException):
    pass


@dataclass(slots=True, kw_only=True)
class Output(io):
    job_id: str | None = None
    savepoint_path: str | None = None
    request_id: str | None = None
