from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\AiServiceInterface.java
# WARNING: Unresolved types: GenerationContext

from typing import Any, Protocol

from engine.webserver.services.ai.ai_service import AiService
from engine.webserver.models.ai.dashboard_generation_prompt import DashboardGenerationPrompt
from engine.webserver.models.ai.flow_generation_prompt import FlowGenerationPrompt


class AiServiceInterface(Protocol):
    def generate_flow(self, ip: str, flow_generation_prompt: FlowGenerationPrompt, tenant_id: str) -> str: ...

    def generate_dashboard(self, ip: str, dashboard_generation_prompt: DashboardGenerationPrompt) -> str: ...

    def display_name(self) -> str: ...

    def before_generation(self, ip: str, conversation_id: str, span_name: str, input_state: dict[str, str]) -> AiService.GenerationContext: ...

    def after_generation(self, context: AiService.GenerationContext, span_name: str, output_state: dict[str, Any], result: str, output_key: str) -> str: ...
