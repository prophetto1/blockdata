from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractFirestore(AbstractTask):
    collection: Property[str] | None = None
    database_id: Property[str] | None = None

    def connection(self, run_context: RunContext) -> Firestore:
        raise NotImplementedError  # TODO: translate from Java

    def collection(self, run_context: RunContext, firestore: Firestore) -> CollectionReference:
        raise NotImplementedError  # TODO: translate from Java
