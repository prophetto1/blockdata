from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\GetKeys.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class GetKeys(Task):
    """List keys in the KV store by prefix."""
    namespace: Property[str]
    logger: ClassVar[Logger] = getLogger(__name__)
    prefix: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        keys: list[str] | None = None
