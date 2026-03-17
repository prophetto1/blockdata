from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Submit(Task, RunnableTask):
    """Submit Flink job from JAR over REST"""
    rest_url: Property[str]
    jar_uri: Property[str]
    entry_class: Property[str]
    args: Property[list[String]] | None = None
    parallelism: Property[int] | None = None
    restore_from_savepoint: Property[str] | None = None
    allow_non_restored_state: Property[bool] | None = None
    job_config: Property[dict[String, String]] | None = None

    def run(self, run_context: RunContext) -> Submit:
        raise NotImplementedError  # TODO: translate from Java

    def download_jar(self, run_context: RunContext, jar_uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def upload_jar_to_flink(self, run_context: RunContext, rest_url: str, jar_location: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def submit_job(self, run_context: RunContext, rest_url: str, jar_id: str, entry_class: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_jar_id_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_job_id_from_response(self, response_body: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        job_id: str | None = None
        jar_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    job_id: str | None = None
    jar_id: str | None = None
