from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class AbstractList(AbstractGcs, ListInterface):
    from: Property[str]
    all_versions: Property[bool] | None = None
    listing_type: Property[ListingType] | None = None
    reg_exp: Property[str] | None = None

    def iterator(self, connection: Storage, from: str, run_context: RunContext) -> Spliterator[com]:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, blob: com, reg_exp: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def options(self, from: str, run_context: RunContext) -> Storage:
        raise NotImplementedError  # TODO: translate from Java
