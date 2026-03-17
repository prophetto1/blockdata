from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\RunnableTask.java
# WARNING: Unresolved types: Exception, T

from typing import Any, Protocol

from engine.core.models.flows.output import Output
from engine.core.models.plugin import Plugin
from engine.core.runners.run_context import RunContext
from engine.core.models.worker_job_lifecycle import WorkerJobLifecycle


class RunnableTask(Protocol):
    def run(self, run_context: RunContext) -> T: ...
