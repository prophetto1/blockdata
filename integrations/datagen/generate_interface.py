from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\GenerateInterface.java

from typing import Any, Protocol

from integrations.datagen.model.data_generator import DataGenerator


class GenerateInterface(Protocol):
    def get_generator(self) -> DataGenerator: ...
