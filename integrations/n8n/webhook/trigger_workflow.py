from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-n8n\src\main\java\io\kestra\plugin\n8n\webhook\TriggerWorkflow.java
# WARNING: Unresolved types: CompletableFuture, Consumer, Exception, IOException, InputStream, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.n8n.webhook.abstract_trigger_workflow import AbstractTriggerWorkflow
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TriggerWorkflow(AbstractTriggerWorkflow):
    """Call n8n webhook from Kestra"""
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def make_request(self, run_context: RunContext, request: HttpRequest, wait: bool) -> TriggerWorkflow.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def handle_response(wait: bool, completable_future: CompletableFuture[Output]) -> Consumer[HttpResponse[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_body_for_content_type(input_stream: InputStream, content_type: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        status_code: int | None = None
        body: Any | None = None
