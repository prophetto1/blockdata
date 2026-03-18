from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\FlowYamlBuilder.java

from typing import Any, Protocol


class FlowYamlBuilder(Protocol):
    def build_flow(self, flow_schema: str, flow_generation_error: str, current_flow_yaml: str, namespace: str, tenant_id: str, user_prompt: str) -> str: ...
