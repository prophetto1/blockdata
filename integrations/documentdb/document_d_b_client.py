from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.documentdb.models.delete_result import DeleteResult
from integrations.documentdb.models.document_d_b_record import DocumentDBRecord
from engine.core.http.client.http_client import HttpClient
from integrations.documentdb.models.insert_result import InsertResult
from integrations.documentdb.models.update_result import UpdateResult


@dataclass(slots=True, kw_only=True)
class DocumentDBClient:
    logger: Logger | None = None
    m_a_x__d_o_c_u_m_e_n_t_s__p_e_r__i_n_s_e_r_t: int | None = None
    http_client: HttpClient | None = None
    object_mapper: ObjectMapper | None = None
    host: str | None = None
    username: str | None = None
    password: str | None = None

    def insert_one(self, database: str, collection: str, document: dict[String, Object]) -> InsertResult:
        raise NotImplementedError  # TODO: translate from Java

    def insert_many(self, database: str, collection: str, documents: list[Map[String, Object]]) -> InsertResult:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, database: str, collection: str, filter: dict[String, Object], limit: int, skip: int) -> list[DocumentDBRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def aggregate(self, database: str, collection: str, pipeline: list[Map[String, Object]]) -> list[DocumentDBRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def build_url(self, action: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_insert_response(self, response_body: str) -> InsertResult:
        raise NotImplementedError  # TODO: translate from Java

    def parse_find_response(self, response_body: str) -> list[DocumentDBRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def update_one(self, database: str, collection: str, filter: dict[String, Object], update: dict[String, Object]) -> UpdateResult:
        raise NotImplementedError  # TODO: translate from Java

    def update_many(self, database: str, collection: str, filter: dict[String, Object], update: dict[String, Object]) -> UpdateResult:
        raise NotImplementedError  # TODO: translate from Java

    def delete_one(self, database: str, collection: str, filter: dict[String, Object]) -> DeleteResult:
        raise NotImplementedError  # TODO: translate from Java

    def delete_many(self, database: str, collection: str, filter: dict[String, Object]) -> DeleteResult:
        raise NotImplementedError  # TODO: translate from Java

    def parse_update_response(self, response_body: str) -> UpdateResult:
        raise NotImplementedError  # TODO: translate from Java

    def parse_delete_response(self, response_body: str) -> DeleteResult:
        raise NotImplementedError  # TODO: translate from Java
