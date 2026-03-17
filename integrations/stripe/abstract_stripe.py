from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.stripe.stripe_interface import StripeInterface
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractStripe(Task, StripeInterface):
    api_key: Property[str]

    def client(self, run_context: RunContext) -> StripeClient:
        raise NotImplementedError  # TODO: translate from Java
