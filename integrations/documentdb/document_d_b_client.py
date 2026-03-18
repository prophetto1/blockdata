from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\DocumentDBClient.java
# WARNING: Unresolved types: Exception, JsonProcessingException, Logger, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.documentdb.models.delete_result import DeleteResult
from integrations.documentdb.models.document_d_b_record import DocumentDBRecord
from engine.core.http.client.http_client import HttpClient
from integrations.documentdb.models.insert_result import InsertResult
from engine.core.runners.run_context import RunContext
from integrations.documentdb.models.update_result import UpdateResult


@dataclass(slots=True, kw_only=True)
class DocumentDBClient:
    logger: ClassVar[Logger] = LoggerFactory.getLogger(DocumentDBClient.class)
    m_a_x__d_o_c_u_m_e_n_t_s__p_e_r__i_n_s_e_r_t: ClassVar[int] = 10
    http_client: HttpClient | None = None
    object_mapper: ObjectMapper | None = None
    host: str | None = None
    username: str | None = None
    password: str | None = None

    def insert_one(self, database: str, collection: str, document: dict[str, Any]) -> InsertResult:
        raise NotImplementedError  # TODO: translate from Java

    def insert_many(self, database: str, collection: str, documents: list[dict[str, Any]]) -> InsertResult:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, database: str, collection: str, filter: dict[str, Any], limit: int, skip: int) -> list[DocumentDBRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def aggregate(self, database: str, collection: str, pipeline: list[dict[str, Any]]) -> list[DocumentDBRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def build_url(self, action: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_insert_response(self, response_body: str) -> InsertResult:
        raise NotImplementedError  # TODO: translate from Java

    def parse_find_response(self, response_body: str) -> list[DocumentDBRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def update_one(self, database: str, collection: str, filter: dict[str, Any], update: dict[str, Any]) -> UpdateResult:
        raise NotImplementedError  # TODO: translate from Java

    def update_many(self, database: str, collection: str, filter: dict[str, Any], update: dict[str, Any]) -> UpdateResult:
        raise NotImplementedError  # TODO: translate from Java

    def delete_one(self, database: str, collection: str, filter: dict[str, Any]) -> DeleteResult:
        raise NotImplementedError  # TODO: translate from Java

    def delete_many(self, database: str, collection: str, filter: dict[str, Any]) -> DeleteResult:
        raise NotImplementedError  # TODO: translate from Java

    def parse_update_response(self, response_body: str) -> UpdateResult:
        raise NotImplementedError  # TODO: translate from Java

    def parse_delete_response(self, response_body: str) -> DeleteResult:
        raise NotImplementedError  # TODO: translate from Java
