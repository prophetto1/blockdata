from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\BatchGenerateInterface.java

from typing import Any, Protocol

from integrations.datagen.generate_interface import GenerateInterface
from engine.core.models.property.property import Property


class BatchGenerateInterface(GenerateInterface, Protocol):
    def get_store(self) -> Property[bool]: ...

    def get_batch_size(self) -> Property[int]: ...
