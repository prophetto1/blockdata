from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\oneshare\Delete.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.oneshare.abstract_one_share_task import AbstractOneShareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractOneShareTask):
    """Delete OneDrive/SharePoint item"""
    item_id: Property[str]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
