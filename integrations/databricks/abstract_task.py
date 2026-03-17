from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task):
    host: Property[str] | None = None
    account_id: Property[str] | None = None
    config_file: Property[str] | None = None
    authentication: AuthenticationConfig | None = None

    def workspace_client(self, run_context: RunContext) -> WorkspaceClient:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AuthenticationConfig:
        auth_type: Property[str] | None = None
        token: Property[str] | None = None
        client_id: Property[str] | None = None
        client_secret: Property[str] | None = None
        username: Property[str] | None = None
        password: Property[str] | None = None
        google_credentials: Property[str] | None = None
        google_service_account: Property[str] | None = None
        azure_client_id: Property[str] | None = None
        azure_client_secret: Property[str] | None = None
        azure_tenant_id: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class AuthenticationConfig:
    auth_type: Property[str] | None = None
    token: Property[str] | None = None
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    google_credentials: Property[str] | None = None
    google_service_account: Property[str] | None = None
    azure_client_id: Property[str] | None = None
    azure_client_secret: Property[str] | None = None
    azure_tenant_id: Property[str] | None = None
