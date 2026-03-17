from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SharepointConnection:
    tenant_id: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    site_id: Property[str]
    drive_id: Property[str] | None = None

    def create_client(self, run_context: RunContext) -> GraphServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_drive_id(self, run_context: RunContext, client: GraphServiceClient) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_site_id(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
