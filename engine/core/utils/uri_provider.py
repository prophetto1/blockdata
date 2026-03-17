from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\UriProvider.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface


@dataclass(slots=True, kw_only=True)
class UriProvider:
    uri: str | None = None

    def build(self, url: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def root_url(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def execution_url(self, execution: Execution) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def flow_url(self, execution: Execution) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def flow_url(self, flow: FlowInterface) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def webhook_url(self, flow: FlowInterface, trigger: AbstractWebhookTrigger) -> str:
        raise NotImplementedError  # TODO: translate from Java
