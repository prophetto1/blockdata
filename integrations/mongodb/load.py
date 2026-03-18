from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Load.java
# WARNING: Unresolved types: Bson, BufferedReader, Exception, Flux, WriteModel

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_load import AbstractLoad
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad):
    """Bulk insert documents from internal storage"""
    remove_id_key: Property[bool] = Property.ofValue(true)
    id_key: Property[str] | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[WriteModel[Bson]]:
        raise NotImplementedError  # TODO: translate from Java
