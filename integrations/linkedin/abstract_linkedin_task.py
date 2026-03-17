from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractLinkedinTask(Task):
    access_token: Property[str]
    application_name: Property[str] | None = None
    api_version: Property[str] | None = None
    api_base_url: Property[str] | None = None

    def create_linkedin_http_request_factory(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_linkedin_api_base_url(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
