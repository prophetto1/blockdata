from __future__ import annotations

from typing import Any, Protocol

from integrations.datagen.model.data_generator import DataGenerator


class GenerateInterface(Protocol):
    def get_generator(self) -> DataGenerator: ...
