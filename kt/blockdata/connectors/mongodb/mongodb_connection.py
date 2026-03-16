from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pymongo import MongoClient

from blockdata.core.models.property import Property
from blockdata.core.runners.run_context import RunContext
from blockdata.runtime.connection import resolve_connection_sync


class MongoClientFactory:
    @staticmethod
    def create(uri: str) -> Any:
        return MongoClient(uri)


@dataclass(slots=True, kw_only=True)
class MongoDbConnection:
    uri: Property[str] | None = None
    connection_id: str | None = None

    def client(self, run_context: RunContext) -> Any:
        rendered_uri = None
        if self.uri is not None:
            rendered_uri = run_context.render(self.uri).as_type(str).or_else(None)

        if not rendered_uri and self.connection_id:
            connection_id = run_context.render(self.connection_id).as_type(str).or_else_throw()
            credentials = resolve_connection_sync(connection_id, run_context.user_id)
            rendered_uri = credentials.get("uri") or credentials.get("connection_string")

        if not rendered_uri:
            raise ValueError("MongoDB URI required on connection.uri or connection_id")

        return MongoClientFactory.create(rendered_uri)
