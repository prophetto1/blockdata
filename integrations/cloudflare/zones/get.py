from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\zones\Get.java
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
class Get(AbstractCloudflareTask):
    """Fetch Cloudflare zone"""
    zone_id: Property[str] | None = None
    hostname: Property[str] | None = None

    def is_valid_input(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_output(self, result: ZoneResponse) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ZoneResponse:
        id: str | None = None
        name: str | None = None
        status: str | None = None

    @dataclass(slots=True)
    class Output:
        id: str | None = None
        name: str | None = None
        status: str | None = None
