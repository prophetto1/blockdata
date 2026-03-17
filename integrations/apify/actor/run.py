from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\Run.java
# WARNING: Unresolved types: Exception, Logger

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.apify.actor.actor_run import ActorRun
from integrations.apify.apify_connection import ApifyConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Run(ApifyConnection):
    """Start an Apify actor run"""
    actor_id: Property[str]
    log: ClassVar[Logger] = LoggerFactory.getLogger(Run.class)
    input: Property[dict[str, Any]] | None = None
    request_timeout: Property[float] | None = None
    memory: Property[float] | None = None
    max_items: Property[int] | None = None
    max_total_charge_usd: Property[float] | None = None
    build: Property[str] | None = None
    wait_for_finish: Property[float] | None = None
    webhooks: Property[str] | None = None

    def run(self, run_context: RunContext) -> ActorRun:
        raise NotImplementedError  # TODO: translate from Java
