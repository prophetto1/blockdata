from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\FileSerde.java
# WARNING: Unresolved types: BufferedReader, Class, Consumer, Flux, FluxSink, IOException, JsonProcessingException, MappingIterator, Mono, ObjectMapper, OutputStream, Reader, SequenceWriter, T, TypeReference, Writer

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class FileSerde:
    b_u_f_f_e_r__s_i_z_e: int = 32 * 1024
    d_e_f_a_u_l_t__o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofIon()
    j_s_o_n__o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()
    d_e_f_a_u_l_t__t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[Any] = new TypeReference<>(){}

    @staticmethod
    def write(output: OutputStream, row: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def reader(input: BufferedReader) -> Consumer[FluxSink[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def reader(input: BufferedReader, cls: Class[T]) -> Consumer[FluxSink[T]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def reader(input: BufferedReader, consumer: Consumer[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def reader(input: BufferedReader, max_lines: int, consumer: Consumer[Any]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert(row: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert(row: str, cls: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(reader: Reader) -> Flux[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(reader: Reader, type: TypeReference[T]) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(reader: Reader, type: Class[T]) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(object_mapper: ObjectMapper, in: Reader) -> Flux[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(object_mapper: ObjectMapper, reader: Reader, type: TypeReference[T]) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(object_mapper: ObjectMapper, reader: Reader, type: Class[T]) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_all(mapping_iterator: MappingIterator[T]) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def write_all(writer: Writer, values: Flux[T]) -> Mono[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def write_all(object_mapper: ObjectMapper, writer: Writer, values: Flux[T]) -> Mono[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def write_all(values: Flux[T], seq_writer: SequenceWriter) -> Mono[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_mapping_iterator(object_mapper: ObjectMapper, reader: Reader, type: TypeReference[T]) -> MappingIterator[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_mapping_iterator(object_mapper: ObjectMapper, reader: Reader, type: Class[T]) -> MappingIterator[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_sequence_writer(object_mapper: ObjectMapper, writer: Writer, type: TypeReference[T]) -> SequenceWriter:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_json_sequence_writer(writer: Writer, type: TypeReference[T]) -> SequenceWriter:
        raise NotImplementedError  # TODO: translate from Java
