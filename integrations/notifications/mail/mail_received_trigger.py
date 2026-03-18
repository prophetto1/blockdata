from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\mail\MailReceivedTrigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.email.abstract_mail_trigger import AbstractMailTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.email.mail_service import MailService
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class MailReceivedTrigger(AbstractMailTrigger):
    """Trigger on new email messages."""

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def get_last_check_time(self, context: TriggerContext, interval: timedelta) -> datetime:
        raise NotImplementedError  # TODO: translate from Java
