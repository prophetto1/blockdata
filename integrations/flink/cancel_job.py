from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-flink\src\main\java\io\kestra\plugin\flink\CancelJob.java
# WARNING: Unresolved types: Exception, ObjectMapper, RuntimeException, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.http_client import HttpClient
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class CancelJob(Task):
    """Cancel a running Flink job"""
    rest_url: Property[str]
    job_id: Property[str]
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    with_savepoint: Property[bool] = Property.of(false)
    drain_job: Property[bool] = Property.of(false)
    cancellation_timeout: Property[int] = Property.of(60)
    savepoint_dir: Property[str] | None = None

    def run(self, run_context: RunContext) -> CancelJob.Output:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_savepoint(self, run_context: RunContext, client: HttpClient, rest_url: str, job_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def cancel_job(self, run_context: RunContext, client: HttpClient, rest_url: str, job_id: str, drain: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_job_cancellation(self, run_context: RunContext, client: HttpClient, rest_url: str, job_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_savepoint_completion(self, run_context: RunContext, client: HttpClient, rest_url: str, job_id: str, request_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_request_id_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_job_state_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_savepoint_status_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_savepoint_path_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_savepoint_error_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_id: str | None = None
        savepoint_path: str | None = None
        cancellation_result: str | None = None

    @dataclass(slots=True)
    class NonRetriableCancellationException(RuntimeException):
        pass

    @dataclass(slots=True)
    class NonRetriableSavepointException(RuntimeException):
        pass
