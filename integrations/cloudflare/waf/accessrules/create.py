from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\waf\accessrules\Create.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCloudflareTask):
    """Create Cloudflare IP access rule"""
    mode: Property[Mode]
    target: Property[Target]
    value: Property[str]
    zone_id: Property[str] | None = None
    account_id: Property[str] | None = None
    notes: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AccessRuleResponse:
        id: str | None = None
        mode: str | None = None
        configuration: Configuration | None = None

    @dataclass(slots=True)
    class Configuration:
        target: str | None = None
        value: str | None = None

    class Mode(str, Enum):
        BLOCK = "BLOCK"
        CHALLENGE = "CHALLENGE"
        WHITELIST = "WHITELIST"
        JS_CHALLENGE = "JS_CHALLENGE"
        MANAGED_CHALLENGE = "MANAGED_CHALLENGE"

    class Target(str, Enum):
        IP = "IP"
        IP_RANGE = "IP_RANGE"
        ASN = "ASN"
        COUNTRY = "COUNTRY"

    @dataclass(slots=True)
    class Output:
        rule_id: str | None = None
        mode: str | None = None
        target: str | None = None
        value: str | None = None
