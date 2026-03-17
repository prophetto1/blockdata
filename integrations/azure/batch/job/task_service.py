from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta
from pathlib import Path

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TaskService:

    def wait_for_tasks_to_complete(self, run_context: RunContext, client: BatchClient, job_id: str, timeout: timedelta, completion_check_interval: timedelta) -> list[CloudTask]:
        raise NotImplementedError  # TODO: translate from Java

    def read_remote_file(self, run_context: RunContext, client: BatchClient, job_id: str, task: CloudTask, remote_file_name: str, copy: bool) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def read_remote_file(self, run_context: RunContext, client: BatchClient, job_id: str, task: CloudTask, remote_file_name: str, local_file_name: str, copy: bool) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def read_remote_log(self, run_context: RunContext, client: BatchClient, job_id: str, task: CloudTask, file_name: str, consumer: Consumer[String]) -> None:
        raise NotImplementedError  # TODO: translate from Java
