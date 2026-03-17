from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\sendgrid\SendGridMailExecution.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.notifications.execution_interface import ExecutionInterface
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.sendgrid.send_grid_mail_send import SendGridMailSend
from integrations.notifications.sendgrid.send_grid_mail_template import SendGridMailTemplate


@dataclass(slots=True, kw_only=True)
class SendGridMailExecution(SendGridMailTemplate):
    """Send a SendGrid email with the execution information."""
    execution_id: Property[str] = Property.ofExpression("{{ execution.id }}")
    custom_fields: Property[dict[str, Any]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> SendGridMailSend.Output:
        raise NotImplementedError  # TODO: translate from Java
