from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\sentry\SentryTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.notifications.sentry.error_level import ErrorLevel
from integrations.notifications.sentry.platform import Platform
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.sentry.sentry_alert import SentryAlert
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SentryTemplate(ABC, SentryAlert):
    event_id: str = UUID.randomUUID().toString().toLowerCase().replace("-", "")
    platform: Property[Platform] = Property.ofValue(Platform.JAVA)
    level: Property[ErrorLevel] = Property.ofValue(ErrorLevel.ERROR)
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None
    transaction: Property[str] | None = None
    server_name: Property[str] | None = None
    extra: Property[dict[str, Any]] | None = None
    errors: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
