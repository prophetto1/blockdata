from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.sentry.error_level import ErrorLevel
from integrations.sentry.platform import Platform
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.sentry.sentry_alert import SentryAlert
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SentryTemplate(SentryAlert):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    event_id: str
    platform: Property[Platform]
    level: Property[ErrorLevel] | None = None
    transaction: Property[str] | None = None
    server_name: Property[str] | None = None
    extra: Property[dict[String, Object]] | None = None
    errors: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
