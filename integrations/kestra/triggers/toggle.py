from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Toggle(AbstractKestraTask, RunnableTask):
    """Enable or disable a trigger"""
    flow_id: Property[str] | None = None
    namespace: Property[str] | None = None
    trigger: Property[str] | None = None
    enabled: Property[bool] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggerResponse:
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class TriggerResponse:
    count: int | None = None
