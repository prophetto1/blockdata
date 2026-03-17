from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


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


@dataclass(slots=True, kw_only=True)
class Create(AbstractCloudflareTask, RunnableTask):
    """Create Cloudflare IP access rule"""
    zone_id: Property[str] | None = None
    account_id: Property[str] | None = None
    mode: Property[Mode]
    target: Property[Target]
    value: Property[str]
    notes: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        rule_id: str | None = None
        mode: str | None = None
        target: str | None = None
        value: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    rule_id: str | None = None
    mode: str | None = None
    target: str | None = None
    value: str | None = None
