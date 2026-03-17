from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.stripe.abstract_stripe import AbstractStripe
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class HandleEvent(AbstractStripe, RunnableTask):
    """Validate and parse Stripe webhooks"""
    payload: Property[str]
    signature_header: Property[str]
    endpoint_secret: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        id: str | None = None
        type: str | None = None
        data: dict[String, Object] | None = None
        raw: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: str | None = None
    type: str | None = None
    data: dict[String, Object] | None = None
    raw: str | None = None
