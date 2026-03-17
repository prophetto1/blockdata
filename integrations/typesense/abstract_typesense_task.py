from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTypesenseTask(Task):
    host: Property[str]
    port: Property[str]
    api_key: Property[str]
    collection: Property[str]
    https: Property[bool] | None = None

    def get_client(self, context: RunContext) -> Client:
        raise NotImplementedError  # TODO: translate from Java

    def render_collection(self, context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_string(self, property: Property[str], context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
