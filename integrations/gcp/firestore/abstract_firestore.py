from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\firestore\AbstractFirestore.java
# WARNING: Unresolved types: CollectionReference, Firestore, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractFirestore(ABC, AbstractTask):
    database_id: Property[str] = Property.ofValue("(default)")
    collection: Property[str] | None = None

    def connection(self, run_context: RunContext) -> Firestore:
        raise NotImplementedError  # TODO: translate from Java

    def collection(self, run_context: RunContext, firestore: Firestore) -> CollectionReference:
        raise NotImplementedError  # TODO: translate from Java
