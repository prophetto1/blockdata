from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\generators\JsonObjectGenerator.java
# WARNING: Unresolved types: Faker

from dataclasses import dataclass
from typing import Any

from integrations.datagen.model.data_generator import DataGenerator
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class JsonObjectGenerator(DataGenerator):
    """Generate JSON objects from templates"""
    value: dict[str, Any]
    locale: Property[list[str]] | None = None
    faker: Faker | None = None

    def init(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def produce(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
