from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-resend\src\main\java\io\kestra\plugin\resend\domain\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Create(Task):
    """Provision a Resend sending domain"""
    api_key: Property[str]
    name: Property[str]
    region: Property[str] | None = None
    custom_return_path: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        id: str | None = None
        result: dict[str, Any] | None = None
