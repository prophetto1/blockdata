from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\notify\TwilioAlert.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.twilio.abstract_twilio_connection import AbstractTwilioConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class TwilioAlert(AbstractTwilioConnection):
    """Send a Twilio Notify message"""
    url: str
    account_s_i_d: str
    auth_token: str
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
