from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.twilio.sendgrid.send_grid_mail_send import SendGridMailSend


@dataclass(slots=True, kw_only=True)
class SendGridMailTemplate(SendGridMailSend):
    template_uri: Property[str] | None = None
    text_template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
