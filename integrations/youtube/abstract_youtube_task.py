from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-youtube\src\main\java\io\kestra\plugin\youtube\AbstractYoutubeTask.java
# WARNING: Unresolved types: Exception, YouTube

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractYoutubeTask(Task):
    access_token: Property[str]
    application_name: Property[str] = Property.ofValue("kestra-yt-plugin")

    def create_youtube_service(self, run_context: RunContext) -> YouTube:
        raise NotImplementedError  # TODO: translate from Java
