from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.opensearch.model.x_content_type import XContentType


@dataclass(slots=True, kw_only=True)
class AbstractSearch(AbstractTask):
    m_a_p_p_e_r: ObjectMapper | None = None
    indexes: Property[list[String]] | None = None
    request: Any | None = None
    content_type: Property[XContentType] | None = None

    def request(self, run_context: RunContext, transport: OpenSearchTransport) -> SearchRequest:
        raise NotImplementedError  # TODO: translate from Java

    def parse_query(self, transport: OpenSearchTransport, query: str) -> SearchRequest:
        raise NotImplementedError  # TODO: translate from Java
