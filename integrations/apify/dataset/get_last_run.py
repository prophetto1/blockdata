from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\dataset\GetLastRun.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.apify.actor.actor_run import ActorRun
from integrations.apify.apify_connection import ApifyConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetLastRun(ApifyConnection):
    """Fetch latest actor run"""
    actor_id: Property[str]

    def run(self, run_context: RunContext) -> ActorRun:
        raise NotImplementedError  # TODO: translate from Java
