from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\cache\Purge.java
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
class Purge(AbstractCloudflareTask):
    """Purge Cloudflare cached content"""
    zone_id: Property[str]
    purge_all: Property[bool] = Property.ofValue(false)
    files: Property[list[str]] | None = None
    tags: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PurgeResponse:
        id: str | None = None

    @dataclass(slots=True)
    class Output:
        request_id: str | None = None
