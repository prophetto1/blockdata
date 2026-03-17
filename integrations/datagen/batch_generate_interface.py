from __future__ import annotations

from typing import Any, Protocol

from integrations.datagen.generate_interface import GenerateInterface
from engine.core.models.property.property import Property


class BatchGenerateInterface(GenerateInterface):
    def get_store(self) -> Property[bool]: ...
    def get_batch_size(self) -> Property[int]: ...
