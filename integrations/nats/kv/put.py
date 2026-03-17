from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\kv\Put.java
# WARNING: Unresolved types: Exception, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.nats.core.nats_connection import NatsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Put(NatsConnection):
    """Put values into NATS Key/Value bucket"""
    bucket_name: str
    values: Property[dict[str, Any]]
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson()

    def run(self, run_context: RunContext) -> Put.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        revisions: dict[str, int] | None = None
