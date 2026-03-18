from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-klaviyo\src\main\java\io\kestra\plugin\klaviyo\campaign\GetRecipientCount.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.klaviyo.abstract_klaviyo_task import AbstractKlaviyoTask
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetRecipientCount(AbstractKlaviyoTask):
    """Estimate recipients for campaigns"""
    campaign_ids: Property[list[str]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
