from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.klaviyo.abstract_klaviyo_task import AbstractKlaviyoTask
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetCampaign(AbstractKlaviyoTask, RunnableTask):
    """Fetch campaigns for messages"""
    message_ids: Property[list[String]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
