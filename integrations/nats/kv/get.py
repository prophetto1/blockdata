from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(NatsConnection, RunnableTask):
    """Fetch values from NATS Key/Value bucket"""
    mapper: ObjectMapper | None = None
    bucket_name: str | None = None
    keys: Property[list[String]]
    key_revisions: Property[dict[String, Long]] | None = None

    def run(self, run_context: RunContext) -> Get:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        output: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    output: dict[String, Object] | None = None
