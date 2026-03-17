from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\compute\kv\Write.java
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
class Write(AbstractCloudflareTask):
    """Bulk write Workers KV items"""
    account_id: Property[str]
    namespace_id: Property[str]
    key_values: Property[list[KVPair]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class KVPair:
        key: str | None = None
        value: str | None = None

    @dataclass(slots=True)
    class BulkResponse:
        successful_key_count: int | None = None
        unsuccessful_keys: list[str] | None = None

    @dataclass(slots=True)
    class Output:
        successful_key_count: int | None = None
        unsuccessful_keys: list[str] | None = None
