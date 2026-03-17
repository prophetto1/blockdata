from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Put(NatsConnection, RunnableTask):
    """Put values into NATS Key/Value bucket"""
    mapper: ObjectMapper | None = None
    bucket_name: str | None = None
    values: Property[dict[String, Object]]

    def run(self, run_context: RunContext) -> Put:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        revisions: dict[String, Long] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    revisions: dict[String, Long] | None = None
