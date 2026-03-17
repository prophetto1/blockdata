from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\WebhookService.java
# WARNING: Unresolved types: ApplicationEventPublisher, Flux, OpenTelemetry, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.core.services.condition_service import ConditionService
from engine.core.events.crud_event import CrudEvent
from engine.webserver.models.events.event import Event
from engine.core.models.executions.execution import Execution
from engine.core.services.execution_streaming_service import ExecutionStreamingService
from engine.core.models.flows.flow import Flow
from engine.core.runners.flow_input_output import FlowInputOutput
from engine.core.models.flows.output import Output
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.utils.uri_provider import UriProvider
from engine.plugin.core.trigger.webhook_context import WebhookContext
from engine.plugin.core.trigger.webhook_response import WebhookResponse


@dataclass(slots=True, kw_only=True)
class WebhookService:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    run_context_factory: RunContextFactory | None = None
    condition_service: ConditionService | None = None
    flow_input_output: FlowInputOutput | None = None
    streaming_service: ExecutionStreamingService | None = None
    uri_provider: UriProvider | None = None
    execution_queue: QueueInterface[Execution] | None = None
    event_publisher: ApplicationEventPublisher[CrudEvent[Execution]] | None = None
    open_telemetry: Optional[OpenTelemetry] | None = None

    def parse_parameters(self, context: WebhookContext) -> dict[str, list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def new_execution(self, context: WebhookContext, flow: Flow, trigger: AbstractWebhookTrigger, output: io.kestra.core.models.tasks.Output) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def start_execution(self, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def follow_execution(self, execution: Execution, flow: Flow) -> Flux[Event[Execution]]:
        raise NotImplementedError  # TODO: translate from Java

    def execution_response(self, execution: Execution) -> WebhookResponse:
        raise NotImplementedError  # TODO: translate from Java

    def run_context(self, flow: Flow, trigger: AbstractTrigger) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def run_context(self, flow: Flow, execution: Execution) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def read_execution_inputs(self, flow: Flow, execution: Execution, rendered_inputs: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def url(self, flow: Flow, trigger: AbstractWebhookTrigger) -> str:
        raise NotImplementedError  # TODO: translate from Java
