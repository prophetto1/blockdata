from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-tika\src\main\java\io\kestra\plugin\tika\Parse.java
# WARNING: Unresolved types: ContentHandler, Detector, Exception, IOException, InputStream, Logger, OCR_STRATEGY, PDFParserConfig, TikaConfig, apache, core, extractor, io, kestra, models, org, tasks, tika

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.kubernetes.models.metadata import Metadata
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Parse(Task):
    """Parse files with Apache Tika"""
    extract_embedded: Property[bool] = Property.ofValue(false)
    content_type: Property[ContentType] = Property.ofValue(ContentType.XHTML)
    ocr_options: OcrOptions = OcrOptions.builder()
        .strategy(Property.ofValue(PDFParserConfig.OCR_STRATEGY.NO_OCR))
        .build()
    store: Property[bool] = Property.ofValue(true)
    from: Property[str] | None = None
    characters_limit: Property[int] | None = None

    def run(self, run_context: RunContext) -> Parse.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EmbeddedDocumentExtractor:
        file_count: int = 0
        extracted: dict[str, str] = field(default_factory=dict)
        config: TikaConfig | None = None
        detector: Detector | None = None
        logger: Logger | None = None
        parse_embedded: bool | None = None
        run_context: RunContext | None = None

        def should_parse_embedded(self, metadata: Metadata) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def parse_embedded(self, stream: InputStream, handler: ContentHandler, metadata: Metadata, output_html: bool) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def file_name(self, stream: InputStream, metadata: Metadata) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        result: Parsed | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class Parsed:
        embedded: dict[str, str] | None = None
        metadata: dict[str, Any] | None = None
        content: str | None = None

    @dataclass(slots=True)
    class OcrOptions:
        strategy: Property[PDFParserConfig.OCR_STRATEGY] = Property.ofValue(PDFParserConfig.OCR_STRATEGY.NO_OCR)
        enable_image_preprocessing: Property[bool] | None = None
        language: Property[str] | None = None

    class ContentType(str, Enum):
        TEXT = "TEXT"
        XHTML = "XHTML"
        XHTML_NO_HEADER = "XHTML_NO_HEADER"
