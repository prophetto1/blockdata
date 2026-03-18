from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\job\TaskService.java
# WARNING: Unresolved types: BatchClient, BatchErrorException, CloudTask, Consumer, IOException, InterruptedException, TimeoutException

from dataclasses import dataclass
from pathlib import Path
from datetime import timedelta
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TaskService:

    @staticmethod
    def wait_for_tasks_to_complete(run_context: RunContext, client: BatchClient, job_id: str, timeout: timedelta, completion_check_interval: timedelta) -> list[CloudTask]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_remote_file(run_context: RunContext, client: BatchClient, job_id: str, task: CloudTask, remote_file_name: str, copy: bool) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_remote_file(run_context: RunContext, client: BatchClient, job_id: str, task: CloudTask, remote_file_name: str, local_file_name: str, copy: bool) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_remote_log(run_context: RunContext, client: BatchClient, job_id: str, task: CloudTask, file_name: str, consumer: Consumer[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java
