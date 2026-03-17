from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCalendar(AbstractTask):
    scopes: Property[list[String]] | None = None

    def connection(self, run_context: RunContext) -> Calendar:
        raise NotImplementedError  # TODO: translate from Java
