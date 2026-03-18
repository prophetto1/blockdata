from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\sendgrid\SendGridMailTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.sendgrid.send_grid_mail_send import SendGridMailSend


@dataclass(slots=True, kw_only=True)
class SendGridMailTemplate(ABC, SendGridMailSend):
    template_uri: Property[str] | None = None
    text_template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> SendGridMailSend.Output:
        raise NotImplementedError  # TODO: translate from Java
