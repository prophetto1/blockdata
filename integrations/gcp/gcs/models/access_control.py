from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\AccessControl.java
# WARNING: Unresolved types: Acl

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.azure.storage.table.models.entity import Entity
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AccessControl:
    entity: Entity
    role: Property[Role]

    @staticmethod
    def convert(access_controls: list[AccessControl], run_context: RunContext) -> list[Acl]:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, run_context: RunContext) -> Acl:
        raise NotImplementedError  # TODO: translate from Java

    class Role(str, Enum):
        READER = "READER"
        WRITER = "WRITER"
        OWNER = "OWNER"
