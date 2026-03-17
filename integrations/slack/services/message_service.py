from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\services\MessageService.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MessageService:

    @staticmethod
    def prepare_message_as_json(run_context: RunContext, payload: Property[str], message_text: Property[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_slack_mrkdwn(text: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_slack_timestamp(slack_ts: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_slack_timestamp(slack_ts: int) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_slack_timestamp(slack_ts: int) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_slack_timestamp(instant: datetime) -> str:
        raise NotImplementedError  # TODO: translate from Java
