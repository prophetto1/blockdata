from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage_with_sas import AbstractStorageWithSas
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractBlobStorageWithSas(AbstractStorageWithSas):

    def client(self, run_context: RunContext) -> BlobServiceClient:
        raise NotImplementedError  # TODO: translate from Java
