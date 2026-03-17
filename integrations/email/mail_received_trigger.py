from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.notifications.mail.abstract_mail_trigger import AbstractMailTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.notifications.mail.mail_service import MailService
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class MailReceivedTrigger(AbstractMailTrigger, PollingTriggerInterface, TriggerOutput):
    """Trigger Flow on new mailbox messages"""

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def get_last_check_time(self, context: TriggerContext, interval: timedelta) -> datetime:
        raise NotImplementedError  # TODO: translate from Java
