from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\http\Trigger.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.plugin.core.http.http_interface import HttpInterface
from engine.core.models.flows.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.plugin.core.http.request import Request
from engine.core.http.client.configurations.ssl_options import SslOptions
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Poll an HTTP endpoint and trigger when a condition matches."""
    interval: timedelta
    response_condition: Property[str]
    uri: Property[str]
    method: Property[str]
    content_type: Property[str]
    encrypt_body: Property[bool]
    body: Property[str] | None = None
    params: Property[dict[str, Any]] | None = None
    form_data: Property[dict[str, Any]] | None = None
    headers: Property[dict[str, str]] | None = None
    options: HttpConfiguration | None = None
    ssl_options: SslOptions | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def ssl_options(self, ssl_options: SslOptions) -> None:
        raise NotImplementedError  # TODO: translate from Java
