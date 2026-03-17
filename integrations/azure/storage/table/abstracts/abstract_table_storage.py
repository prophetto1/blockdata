from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage_with_sas import AbstractStorageWithSas
from integrations.azure.storage.table.abstracts.abstract_table_storage_interface import AbstractTableStorageInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractTableStorage(AbstractStorageWithSas, AbstractTableStorageInterface):
    table: Property[str] | None = None

    def client(self, run_context: RunContext) -> TableServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def table_client(self, run_context: RunContext) -> TableClient:
        raise NotImplementedError  # TODO: translate from Java
