from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.zulip.abstract_zulip_connection import AbstractZulipConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class ZulipIncomingWebhook(AbstractZulipConnection):
    """Post messages through Zulip incoming webhook"""
    url: str | None = None
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
