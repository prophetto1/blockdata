from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(NatsConnection, RunnableTask):
    """Delete keys from NATS Key/Value bucket"""
    bucket_name: str | None = None
    keys: Property[list[String]]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
