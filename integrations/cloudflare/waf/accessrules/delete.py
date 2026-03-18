from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\waf\accessrules\Delete.java
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
class Delete(AbstractCloudflareTask):
    """Delete Cloudflare IP access rule"""
    rule_id: Property[str]
    zone_id: Property[str] | None = None
    account_id: Property[str] | None = None

    def is_valid_scope(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class DeleteResponse:
        id: str | None = None

    @dataclass(slots=True)
    class Output:
        rule_id: str | None = None
        deleted: bool | None = None
