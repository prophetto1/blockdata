from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDataForm(AbstractTask):
    location: Property[str]
    repository_id: Property[str]

    def dataform_client(self, run_context: RunContext) -> DataformClient:
        raise NotImplementedError  # TODO: translate from Java

    def create_client(self, run_context: RunContext) -> DataformClient:
        raise NotImplementedError  # TODO: translate from Java

    def build_repository_path(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
