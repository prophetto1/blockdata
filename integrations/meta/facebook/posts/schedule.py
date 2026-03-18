from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\facebook\posts\Schedule.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.meta.facebook.abstract_facebook_task import AbstractFacebookTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Schedule(AbstractFacebookTask):
    """Schedule a Facebook Page post"""
    message: Property[str]
    scheduled_publish_time: Property[str]
    link: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        post_id: str | None = None
