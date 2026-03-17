from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-sifflet\src\main\java\io\kestra\plugin\sifflet\RunRule.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class RunRule(Task):
    """Trigger a Sifflet data quality rule"""
    api_key: str
    rule_id: str | None = None
    base_url: str | None = None
    request_timeout: int | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rule_id: str | None = None
        status: str | None = None
        status_code: int | None = None
        response: str | None = None
