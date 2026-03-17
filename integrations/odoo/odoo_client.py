from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.odoo.odoo_authenticator import OdooAuthenticator


@dataclass(slots=True, kw_only=True)
class OdooClient:
    database: str | None = None
    password: str | None = None
    object_client: XmlRpcClient | None = None
    authenticator: OdooAuthenticator | None = None
    uid: int | None = None
    logger: Logger | None = None

    def authenticate(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_version(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def execute_kw(self, model: str, method: str, args: list[Object], kwargs: dict[String, Object]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def search_read(self, model: str, domain: list, fields: list[String], limit: int, offset: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, model: str, values: dict[String, Object]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, model: str, ids: list[Integer], values: dict[String, Object]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def unlink(self, model: str, ids: list[Integer]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def search(self, model: str, domain: list, limit: int, offset: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def read(self, model: str, ids: list[Integer], fields: list[String]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def search_count(self, model: str, domain: list) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_uid(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def is_authenticated(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
