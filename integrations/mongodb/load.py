from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_load import AbstractLoad
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad):
    """Bulk insert documents from internal storage"""
    id_key: Property[str] | None = None
    remove_id_key: Property[bool] | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[WriteModel[Bson]]:
        raise NotImplementedError  # TODO: translate from Java
