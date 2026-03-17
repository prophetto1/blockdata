from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.models.tasks.task import Task


class CompressionAlgorithm(str, Enum):
    BROTLI = "BROTLI"
    BZIP2 = "BZIP2"
    DEFLATE = "DEFLATE"
    DEFLATE64 = "DEFLATE64"
    GZIP = "GZIP"
    LZ4BLOCK = "LZ4BLOCK"
    LZ4FRAME = "LZ4FRAME"
    LZMA = "LZMA"
    SNAPPY = "SNAPPY"
    SNAPPYFRAME = "SNAPPYFRAME"
    XZ = "XZ"
    Z = "Z"
    ZSTD = "ZSTD"


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task):

    def compressor_input_stream(self, compression: CompressionAlgorithm, input_stream: InputStream) -> CompressorInputStream:
        raise NotImplementedError  # TODO: translate from Java

    def compressor_output_stream(self, compression: CompressionAlgorithm, output_stream: OutputStream) -> CompressorOutputStream:
        raise NotImplementedError  # TODO: translate from Java
