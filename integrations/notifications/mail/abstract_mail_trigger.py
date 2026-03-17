from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\mail\AbstractMailTrigger.java
# WARNING: Unresolved types: Exception, MailConfiguration, Protocol

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.email.mail_service import MailService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMailTrigger(ABC, AbstractTrigger):
    host: Property[str]
    username: Property[str]
    password: Property[str]
    protocol: Property[MailService.Protocol] = Property.ofValue(MailService.Protocol.IMAP)
    folder: Property[str] = Property.ofValue("INBOX")
    ssl: Property[bool] = Property.ofValue(true)
    trust_all_certificates: Property[bool] = Property.ofValue(false)
    interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(60))
    port: Property[int] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def render_mail_configuration(self, run_context: RunContext) -> MailService.MailConfiguration:
        raise NotImplementedError  # TODO: translate from Java
