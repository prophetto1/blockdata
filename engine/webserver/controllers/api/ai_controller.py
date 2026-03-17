from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\AiController.java
# WARNING: Unresolved types: HttpClientAddressResolver

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.webserver.services.ai.ai_service_manager import AiServiceManager
from engine.webserver.models.ai.dashboard_generation_prompt import DashboardGenerationPrompt
from engine.webserver.models.ai.flow_generation_prompt import FlowGenerationPrompt
from engine.core.http.http_request import HttpRequest
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class AiController:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    ai_service_manager: AiServiceManager | None = None
    http_client_address_resolver: HttpClientAddressResolver | None = None
    tenant_service: TenantService | None = None

    def generate_flow(self, flow_generation_prompt: FlowGenerationPrompt, http_request: HttpRequest[Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def generate_dashboard(self, dashboard_generation_prompt: DashboardGenerationPrompt, http_request: HttpRequest[Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_providers(self) -> list[AiProviderResponse]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AiProviderResponse:
        id: str | None = None
        display_name: str | None = None
        is_default: bool | None = None
