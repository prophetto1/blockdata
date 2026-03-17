from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.kubernetes.models.metadata import Metadata
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


class ContentType(str, Enum):
    TEXT = "TEXT"
    XHTML = "XHTML"
    XHTML_NO_HEADER = "XHTML_NO_HEADER"


@dataclass(slots=True, kw_only=True)
class Parse(Task, RunnableTask):
    """Parse files with Apache Tika"""
    from: Property[str] | None = None
    extract_embedded: Property[bool] | None = None
    content_type: Property[ContentType] | None = None
    ocr_options: OcrOptions | None = None
    store: Property[bool] | None = None
    characters_limit: Property[int] | None = None

    def run(self, run_context: RunContext) -> Parse:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EmbeddedDocumentExtractor(org):
        config: TikaConfig | None = None
        detector: Detector | None = None
        logger: Logger | None = None
        parse_embedded: bool | None = None
        run_context: RunContext | None = None
        file_count: int | None = None
        extracted: dict[String, URI] | None = None

        def should_parse_embedded(self, metadata: Metadata) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def parse_embedded(self, stream: InputStream, handler: ContentHandler, metadata: Metadata, output_html: bool) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def file_name(self, stream: InputStream, metadata: Metadata) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        result: Parsed | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class Parsed:
        embedded: dict[String, URI] | None = None
        metadata: dict[String, Object] | None = None
        content: str | None = None

    @dataclass(slots=True)
    class OcrOptions:
        strategy: Property[PDFParserConfig] | None = None
        enable_image_preprocessing: Property[bool] | None = None
        language: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class EmbeddedDocumentExtractor(org):
    config: TikaConfig | None = None
    detector: Detector | None = None
    logger: Logger | None = None
    parse_embedded: bool | None = None
    run_context: RunContext | None = None
    file_count: int | None = None
    extracted: dict[String, URI] | None = None

    def should_parse_embedded(self, metadata: Metadata) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def parse_embedded(self, stream: InputStream, handler: ContentHandler, metadata: Metadata, output_html: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def file_name(self, stream: InputStream, metadata: Metadata) -> str:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    result: Parsed | None = None
    uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Parsed:
    embedded: dict[String, URI] | None = None
    metadata: dict[String, Object] | None = None
    content: str | None = None


@dataclass(slots=True, kw_only=True)
class OcrOptions:
    strategy: Property[PDFParserConfig] | None = None
    enable_image_preprocessing: Property[bool] | None = None
    language: Property[str] | None = None
