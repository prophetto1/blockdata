from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\WorkerJobRunningRepositoryInterface.java

from typing import Any, Protocol

from engine.core.runners.worker_job_running import WorkerJobRunning


class WorkerJobRunningRepositoryInterface(Protocol):
    def find_by_key(self, uid: str) -> Optional[WorkerJobRunning]: ...

    def delete_by_key(self, uid: str) -> None: ...
