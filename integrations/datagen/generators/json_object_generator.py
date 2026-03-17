from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.datagen.model.data_generator import DataGenerator
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class JsonObjectGenerator(DataGenerator):
    """Generate JSON objects from templates"""
    value: dict[String, Object]
    locale: Property[list[String]] | None = None
    faker: Faker | None = None

    def init(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def produce(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
