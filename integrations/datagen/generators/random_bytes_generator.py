from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\generators\RandomBytesGenerator.java
# WARNING: Unresolved types: SecureRandom

from dataclasses import dataclass
from typing import Any

from integrations.datagen.model.data_generator import DataGenerator


@dataclass(slots=True, kw_only=True)
class RandomBytesGenerator(DataGenerator):
    """Generate random byte arrays"""
    size: int
    random: SecureRandom = new SecureRandom()

    def produce(self) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java
