from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\FileSerde.java
# WARNING: Unresolved types: BufferedReader, FluxSink, JsonProcessingException, MappingIterator, Reader, SequenceWriter, TypeReference, Writer

from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar, Iterator


@dataclass(slots=True, kw_only=True)
class FileSerde:
    default_object_mapper: ClassVar[ObjectMapper]
    json_object_mapper: ClassVar[ObjectMapper]
    default_type_reference: ClassVar[TypeReference[Any]]
    buffer_size: ClassVar[int] = 32 * 1024

    @staticmethod
    def write(output: Any, row: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def reader(input: BufferedReader, max_lines: int | None = None, consumer: Callable[Any] | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert(row: str, cls: type[T] | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(object_mapper: ObjectMapper, reader: Reader | None = None, type: TypeReference[T] | None = None) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def write_all(object_mapper: ObjectMapper, writer: Writer, values: Flux[T] | None = None) -> Mono[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_mapping_iterator(object_mapper: ObjectMapper, reader: Reader, type: TypeReference[T]) -> MappingIterator[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_sequence_writer(object_mapper: ObjectMapper, writer: Writer, type: TypeReference[T]) -> SequenceWriter:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_json_sequence_writer(writer: Writer, type: TypeReference[T]) -> SequenceWriter:
        raise NotImplementedError  # TODO: translate from Java
