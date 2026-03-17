from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.n8n.webhook.abstract_trigger_workflow import AbstractTriggerWorkflow
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.tasks.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TriggerWorkflow(AbstractTriggerWorkflow, RunnableTask):
    """Call n8n webhook from Kestra"""
    mapper: ObjectMapper | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def make_request(self, run_context: RunContext, request: HttpRequest, wait: bool) -> TriggerWorkflow:
        raise NotImplementedError  # TODO: translate from Java

    def handle_response(self, wait: bool, completable_future: CompletableFuture[Output]) -> Consumer[HttpResponse[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_body_for_content_type(self, input_stream: InputStream, content_type: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java
