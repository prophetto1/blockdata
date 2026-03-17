from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MessageService:

    def prepare_message_as_json(self, run_context: RunContext, payload: Property[str], message_text: Property[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_slack_mrkdwn(self, text: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def from_slack_timestamp(self, slack_ts: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def from_slack_timestamp(self, slack_ts: int) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def from_slack_timestamp(self, slack_ts: int) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def to_slack_timestamp(self, instant: datetime) -> str:
        raise NotImplementedError  # TODO: translate from Java
