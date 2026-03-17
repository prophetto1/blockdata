from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage import AbstractStorage
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractBlobStorage(AbstractStorage):

    def client(self, run_context: RunContext) -> BlobServiceClient:
        raise NotImplementedError  # TODO: translate from Java
