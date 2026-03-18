from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-todoist\src\main\java\io\kestra\plugin\todoist\ListTasks.java
# WARNING: Unresolved types: Exception, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.todoist.abstract_todoist_task import AbstractTodoistTask
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ListTasks(AbstractTodoistTask):
    """List Todoist tasks"""
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    project_id: Property[str] | None = None
    filter: Property[str] | None = None
    limit: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_url(self, filter: str, project_id: str, limit: int, cursor: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_tasks_from_response(self, response_map: dict[str, Any], response_body: str, logger: Logger) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        row: dict[str, Any] | None = None
        rows: list[dict[str, Any]] | None = None
        uri: str | None = None
        size: int | None = None
