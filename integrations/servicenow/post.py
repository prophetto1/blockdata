from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-servicenow\src\main\java\io\kestra\plugin\servicenow\Post.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.servicenow.abstract_service_now import AbstractServiceNow
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Post(AbstractServiceNow):
    """Create a record in a ServiceNow table"""
    table: Property[str]
    data: Property[dict[str, Any]]

    def run(self, run_context: RunContext) -> Post.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        result: dict[str, Any] | None = None

    @dataclass(slots=True)
    class PostResult:
        result: dict[str, Any] | None = None
