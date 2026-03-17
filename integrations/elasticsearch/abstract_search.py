from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.opensearch.model.x_content_type import XContentType


@dataclass(slots=True, kw_only=True)
class AbstractSearch(AbstractTask):
    indexes: Property[list[String]] | None = None
    request: Any
    content_type: XContentType = XContentType.JSON

    def request(self, run_context: RunContext) -> SearchRequest:
        raise NotImplementedError  # TODO: translate from Java
