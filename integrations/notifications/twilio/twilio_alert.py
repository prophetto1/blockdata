from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.notifications.abstract_http_options_task import AbstractHttpOptionsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class TwilioAlert(AbstractHttpOptionsTask):
    """Send a Twilio message using a notification API."""
    url: str | None = None
    payload: Property[str] | None = None
    account_s_i_d: str | None = None
    auth_token: str | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
