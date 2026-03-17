from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\parquet\IonToParquet.java
# WARNING: Unresolved types: CompressionCodecName, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.serdes.avro.abstract_avro_converter import AbstractAvroConverter
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class IonToParquet(AbstractAvroConverter):
    """Convert an ION file into Parquet."""
    from: Property[str]
    compression_codec: Property[CompressionCodec] = Property.ofValue(CompressionCodec.GZIP)
    parquet_version: Property[Version] = Property.ofValue(Version.V2)
    row_group_size: Property[int] = Property.ofValue((long) org.apache.parquet.hadoop.ParquetWriter.DEFAULT_BLOCK_SIZE)
    page_size: Property[int] = Property.ofValue(ParquetWriter.DEFAULT_PAGE_SIZE)
    dictionary_page_size: Property[int] = Property.ofValue(ParquetWriter.DEFAULT_PAGE_SIZE)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

    class CompressionCodec(str, Enum):
        UNCOMPRESSED = "UNCOMPRESSED"
        SNAPPY = "SNAPPY"
        GZIP = "GZIP"
        ZSTD = "ZSTD"

    class Version(str, Enum):
        V1 = "V1"
        V2 = "V2"
