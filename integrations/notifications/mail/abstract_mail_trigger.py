from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.notifications.mail.mail_service import MailService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMailTrigger(AbstractTrigger):
    protocol: Property[MailService] | None = None
    host: Property[str]
    port: Property[int] | None = None
    username: Property[str]
    password: Property[str]
    folder: Property[str] | None = None
    ssl: Property[bool] | None = None
    trust_all_certificates: Property[bool] | None = None
    interval: Property[timedelta] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def render_mail_configuration(self, run_context: RunContext) -> MailService:
        raise NotImplementedError  # TODO: translate from Java
