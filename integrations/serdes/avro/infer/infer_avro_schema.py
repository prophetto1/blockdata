from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\infer\InferAvroSchema.java
# WARNING: Unresolved types: LinkedHashSet, OutputStream

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.gcp.bigquery.models.field import Field
from integrations.pulsar.reader import Reader
from integrations.gcp.bigquery.models.schema import Schema


@dataclass(slots=True, kw_only=True)
class InferAvroSchema:
    n_u_l_l__d_e_f_a_u_l_t__d_e_s_c_r_i_p_t_i_o_n: ClassVar[str] = ""
    deep_search: bool = True
    number_of_row_to_scan: int = 100
    known_fields: dict[str, Field] = field(default_factory=dict)

    def infer_avro_schema_from_ion(self, input_stream: Reader, output: OutputStream) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def infer_field(self, field_full_path: str, field_name: str, node: Any) -> Field:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def merge_types(a: Field, b: Field) -> Field:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def merge_at_least_one_union(a: Field, b: Field) -> LinkedHashSet[Schema]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def merge_two_records(a: Field, b: Field) -> Field:
        raise NotImplementedError  # TODO: translate from Java
