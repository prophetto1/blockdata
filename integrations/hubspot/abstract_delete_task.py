from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\AbstractDeleteTask.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class AbstractDeleteTask(ABC, HubspotConnection):

    def run(self, run_context: RunContext, record_id: str) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
