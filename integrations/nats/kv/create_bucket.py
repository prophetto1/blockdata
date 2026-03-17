from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateBucket(NatsConnection, RunnableTask):
    """Create NATS Key/Value bucket"""
    name: str | None = None
    description: str | None = None
    metadata: Property[dict[String, String]] | None = None
    history_per_key: Property[int] | None = None
    bucket_size: Property[int] | None = None
    value_size: Property[int] | None = None

    def run(self, run_context: RunContext) -> CreateBucket:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        bucket: str | None = None
        description: str | None = None
        history: int | None = None
        entry_count: int | None = None
        bucket_size: int | None = None
        value_size: int | None = None
        metadata: dict[String, String] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    bucket: str | None = None
    description: str | None = None
    history: int | None = None
    entry_count: int | None = None
    bucket_size: int | None = None
    value_size: int | None = None
    metadata: dict[String, String] | None = None
