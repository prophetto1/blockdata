from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\AbstractDrive.java
# WARNING: Unresolved types: Drive, GeneralSecurityException, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDrive(ABC, AbstractTask):
    scopes: Property[list[str]] = Property.ofValue(List.of(DriveScopes.DRIVE))

    def connection(self, run_context: RunContext) -> Drive:
        raise NotImplementedError  # TODO: translate from Java
