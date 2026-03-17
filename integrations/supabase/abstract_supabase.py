from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-supabase\src\main\java\io\kestra\plugin\supabase\AbstractSupabase.java
# WARNING: Unresolved types: HttpRequestBuilder, MalformedURLException, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.supabase.supabase_interface import SupabaseInterface
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSupabase(ABC, Task):
    url: Property[str]
    api_key: Property[str]
    schema: Property[str] = Property.ofValue("public")
    options: HttpConfiguration = HttpConfiguration.builder().build()

    def client(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def base_request(self, run_context: RunContext, endpoint: str) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_table_endpoint(self, table_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_rpc_endpoint(self, function_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
