from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.bigquery.models.field import Field
from integrations.pulsar.reader import Reader
from engine.core.docs.schema import Schema


@dataclass(slots=True, kw_only=True)
class InferAvroSchema:
    n_u_l_l__d_e_f_a_u_l_t__d_e_s_c_r_i_p_t_i_o_n: str | None = None
    deep_search: bool | None = None
    number_of_row_to_scan: int | None = None
    known_fields: dict[String, Field] | None = None

    def infer_avro_schema_from_ion(self, input_stream: Reader, output: OutputStream) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def infer_field(self, field_full_path: str, field_name: str, node: Any) -> Field:
        raise NotImplementedError  # TODO: translate from Java

    def merge_types(self, a: Field, b: Field) -> Field:
        raise NotImplementedError  # TODO: translate from Java

    def merge_at_least_one_union(self, a: Field, b: Field) -> LinkedHashSet[Schema]:
        raise NotImplementedError  # TODO: translate from Java

    def merge_two_records(self, a: Field, b: Field) -> Field:
        raise NotImplementedError  # TODO: translate from Java
