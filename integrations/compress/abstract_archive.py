from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from integrations.compress.archive_decompress import ArchiveDecompress
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class ArchiveAlgorithm(str, Enum):
    AR = "AR"
    ARJ = "ARJ"
    CPIO = "CPIO"
    DUMP = "DUMP"
    JAR = "JAR"
    TAR = "TAR"
    ZIP = "ZIP"


@dataclass(slots=True, kw_only=True)
class AbstractArchive(AbstractTask):
    algorithm: Property[ArchiveAlgorithm]
    compression: Property[ArchiveDecompress] | None = None

    def archive_input_stream(self, input_stream: InputStream, run_context: RunContext) -> ArchiveInputStream:
        raise NotImplementedError  # TODO: translate from Java

    def archive_output_stream(self, output_stream: OutputStream, run_context: RunContext) -> ArchiveOutputStream:
        raise NotImplementedError  # TODO: translate from Java
