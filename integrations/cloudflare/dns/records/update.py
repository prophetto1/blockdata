from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\dns\records\Update.java
# WARNING: Unresolved types: DnsRecordType, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractCloudflareTask):
    """Update Cloudflare DNS record"""
    zone_id: Property[str]
    record_id: Property[str]
    record_type: Property[DnsRecordType] | None = None
    name: Property[str] | None = None
    content: Property[str] | None = None
    ttl: Property[int] | None = None
    proxied: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RecordResponse:
        id: str | None = None

    @dataclass(slots=True)
    class Output:
        id: str | None = None
