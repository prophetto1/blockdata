from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-compress\src\main\java\io\kestra\plugin\compress\AbstractTask.java
# WARNING: Unresolved types: CompressorInputStream, CompressorOutputStream, IOException, InputStream, OutputStream

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):

    def compressor_input_stream(self, compression: CompressionAlgorithm, input_stream: InputStream) -> CompressorInputStream:
        raise NotImplementedError  # TODO: translate from Java

    def compressor_output_stream(self, compression: CompressionAlgorithm, output_stream: OutputStream) -> CompressorOutputStream:
        raise NotImplementedError  # TODO: translate from Java

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
