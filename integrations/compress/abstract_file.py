from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractFile(AbstractTask):
    compression: Property[CompressionAlgorithm]
