from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\dns\records\List.java
# WARNING: Unresolved types: core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractCloudflareTask):
    """List Cloudflare DNS records"""
    zone_id: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RecordResponse:
        id: str | None = None
        name: str | None = None
        type: str | None = None
        content: str | None = None
        ttl: int | None = None
        proxied: bool | None = None

    @dataclass(slots=True)
    class Output:
        records: java.util.List[RecordResponse] | None = None
