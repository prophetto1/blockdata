from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.dataproc.batches.abstract_batch import AbstractBatch
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractSparkSubmit(AbstractBatch):
    file_uris: Property[list[String]] | None = None
    archive_uris: Property[list[String]] | None = None
    jar_file_uris: Property[list[String]] | None = None
    args: Property[list[String]] | None = None
