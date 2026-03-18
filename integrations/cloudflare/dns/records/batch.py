from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\dns\records\Batch.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Batch(AbstractCloudflareTask):
    """Batch mutate DNS records"""
    zone_id: Property[str]
    posts: Property[list[RecordInput]] | None = None
    patches: Property[list[RecordPatch]] | None = None
    deletes: Property[list[RecordDelete]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RecordInput:
        type: str | None = None
        name: str | None = None
        content: str | None = None
        ttl: int | None = None
        proxied: bool | None = None

    @dataclass(slots=True)
    class RecordPatch:
        id: str | None = None
        type: str | None = None
        name: str | None = None
        content: str | None = None
        ttl: int | None = None
        proxied: bool | None = None

    @dataclass(slots=True)
    class RecordDelete:
        id: str | None = None

    @dataclass(slots=True)
    class BatchResult:
        posts: Any | None = None
        patches: Any | None = None
        deletes: Any | None = None

    @dataclass(slots=True)
    class Output:
        success: bool | None = None
