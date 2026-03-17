from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.airtable.airtable_list_response import AirtableListResponse
from integrations.airtable.airtable_record import AirtableRecord
from engine.core.http.client.http_client import HttpClient


@dataclass(slots=True, kw_only=True)
class AirtableClient:
    logger: Logger | None = None
    b_a_s_e__u_r_l: str | None = None
    m_a_x__r_e_c_o_r_d_s__p_e_r__b_a_t_c_h: int | None = None
    http_client: HttpClient | None = None
    object_mapper: ObjectMapper | None = None
    api_key: str | None = None

    def list_records(self, base_id: str, table_id: str, filter_by_formula: str, fields: list[String], max_records: int, view: str, offset: str) -> AirtableListResponse:
        raise NotImplementedError  # TODO: translate from Java

    def get_record(self, base_id: str, table_id: str, record_id: str, fields: list[String]) -> AirtableRecord:
        raise NotImplementedError  # TODO: translate from Java

    def create_record(self, base_id: str, table_id: str, fields: dict[String, Object], typecast: bool) -> AirtableRecord:
        raise NotImplementedError  # TODO: translate from Java

    def create_records(self, base_id: str, table_id: str, records_fields: list[Map[String, Object]], typecast: bool) -> list[AirtableRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def update_record(self, base_id: str, table_id: str, record_id: str, fields: dict[String, Object], typecast: bool) -> AirtableRecord:
        raise NotImplementedError  # TODO: translate from Java

    def delete_record(self, base_id: str, table_id: str, record_id: str) -> AirtableRecord:
        raise NotImplementedError  # TODO: translate from Java

    def parse_list_response(self, response_body: str) -> AirtableListResponse:
        raise NotImplementedError  # TODO: translate from Java

    def parse_record_response(self, response_body: str) -> AirtableRecord:
        raise NotImplementedError  # TODO: translate from Java

    def parse_record(self, record_node: JsonNode) -> AirtableRecord:
        raise NotImplementedError  # TODO: translate from Java
