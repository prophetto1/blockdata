from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\dataproc\batches\AbstractSparkSubmit.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.batch.abstract_batch import AbstractBatch
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractSparkSubmit(ABC, AbstractBatch):
    file_uris: Property[list[str]] | None = None
    archive_uris: Property[list[str]] | None = None
    jar_file_uris: Property[list[str]] | None = None
    args: Property[list[str]] | None = None
