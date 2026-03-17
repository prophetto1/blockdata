from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.plugins.notifications.execution_interface import ExecutionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.twilio.sendgrid.send_grid_mail_send import SendGridMailSend
from integrations.twilio.sendgrid.send_grid_mail_template import SendGridMailTemplate


@dataclass(slots=True, kw_only=True)
class SendGridMailExecution(SendGridMailTemplate, ExecutionInterface):
    """Send a SendGrid email with the execution information."""
    execution_id: Property[str] | None = None
    custom_fields: Property[dict[String, Object]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> SendGridMailSend:
        raise NotImplementedError  # TODO: translate from Java
