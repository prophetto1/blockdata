from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-compress\src\main\java\io\kestra\plugin\compress\AbstractFile.java
# WARNING: Unresolved types: CompressionAlgorithm

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractFile(ABC, AbstractTask):
    compression: Property[CompressionAlgorithm]
