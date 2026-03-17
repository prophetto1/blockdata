from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\FlowAutoLoaderService.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.http.client.http_client import HttpClient
from engine.core.contexts.kestra_config import KestraConfig
from engine.core.tenant.tenant_service import TenantService
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class FlowAutoLoaderService:
    namespace_from_flow_source_pattern: ClassVar[re.Pattern]
    logger: ClassVar[Logger] = getLogger(__name__)
    purge_system_flow_blueprint_id: ClassVar[str] = "234"
    repository: FlowRepositoryInterface | None = None
    http_client: HttpClient | None = None
    kestra_config: KestraConfig | None = None
    version_provider: VersionProvider | None = None
    tenant_service: TenantService | None = None

    def load(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
