from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.runners.run_context import RunContext
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class AbstractGcs(AbstractTask):

    def connection(self, run_context: RunContext) -> Storage:
        raise NotImplementedError  # TODO: translate from Java

    def encode(self, run_context: RunContext, blob: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def encode(self, blob: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def blob_path(self, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
