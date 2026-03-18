from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\kv\CreateBucket.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateBucket(NatsConnection):
    """Create NATS Key/Value bucket"""
    name: str
    history_per_key: Property[int] = Property.ofValue(1)
    description: str | None = None
    metadata: Property[dict[str, str]] | None = None
    bucket_size: Property[int] | None = None
    value_size: Property[int] | None = None

    def run(self, run_context: RunContext) -> CreateBucket.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        bucket: str | None = None
        description: str | None = None
        history: int | None = None
        entry_count: int | None = None
        bucket_size: int | None = None
        value_size: int | None = None
        metadata: dict[str, str] | None = None
