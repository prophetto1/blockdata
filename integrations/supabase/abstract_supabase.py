from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.supabase.supabase_interface import SupabaseInterface
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSupabase(Task, SupabaseInterface):
    url: Property[str]
    api_key: Property[str]
    schema: Property[str] | None = None
    options: HttpConfiguration | None = None

    def client(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def base_request(self, run_context: RunContext, endpoint: str) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def build_table_endpoint(self, table_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_rpc_endpoint(self, function_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
