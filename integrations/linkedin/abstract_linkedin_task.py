from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linkedin\src\main\java\io\kestra\plugin\linkedin\AbstractLinkedinTask.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractLinkedinTask(Task):
    access_token: Property[str]
    application_name: Property[str] = Property.ofValue("kestra-linkedin-plugin")
    api_version: Property[str] = Property.ofValue("202509")
    api_base_url: Property[str] = Property.ofValue("https://api.linkedin.com/rest")

    def create_linkedin_http_request_factory(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_linkedin_api_base_url(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
