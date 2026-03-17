from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-youtube\src\main\java\io\kestra\plugin\youtube\VideoTrigger.java
# WARNING: Unresolved types: Exception, PlaylistItem, YouTube, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class VideoTrigger(AbstractTrigger):
    """Trigger a flow on new YouTube videos."""
    access_token: Property[str]
    channel_id: Property[str]
    interval: timedelta = Duration.ofHours(1)
    max_results: Property[int] = Property.ofValue(5)
    application_name: Property[str] = Property.ofValue("kestra-yt-plugin")

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def calculate_last_check_time(self, context: TriggerContext) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def create_youtube_service(self, rendered_access_token: str, rendered_application_name: str) -> YouTube:
        raise NotImplementedError  # TODO: translate from Java

    def get_uploads_playlist_id(self, you_tube: YouTube, channel_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_video_data(self, item: PlaylistItem) -> VideoData:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        video_id: str | None = None
        title: str | None = None
        description: str | None = None
        channel_id: str | None = None
        channel_title: str | None = None
        published_at: datetime | None = None
        thumbnail_url: str | None = None
        video_url: str | None = None
        new_videos_count: int | None = None
        all_new_videos: list[VideoData] | None = None

    @dataclass(slots=True)
    class VideoData:
        video_id: str | None = None
        title: str | None = None
        description: str | None = None
        channel_id: str | None = None
        channel_title: str | None = None
        published_at: datetime | None = None
        thumbnail_url: str | None = None
        video_url: str | None = None
