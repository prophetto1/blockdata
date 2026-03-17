from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.datagen.model.data_generator import DataGenerator


@dataclass(slots=True, kw_only=True)
class RandomBytesGenerator(DataGenerator):
    """Generate random byte arrays"""
    size: int
    random: SecureRandom | None = None

    def produce(self) -> byte:
        raise NotImplementedError  # TODO: translate from Java
