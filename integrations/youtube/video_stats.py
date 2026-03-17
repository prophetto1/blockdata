from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-youtube\src\main\java\io\kestra\plugin\youtube\VideoStats.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.youtube.abstract_youtube_task import AbstractYoutubeTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class VideoStats(AbstractYoutubeTask):
    """Get statistics for YouTube videos."""
    video_ids: Property[list[str]]
    include_snippet: Property[bool] = Property.ofValue(false)
    max_results: Property[int] = Property.ofValue(5)
    include_content_details: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def calculate_totals(self, videos: list[VideoStatsData]) -> dict[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        videos: list[VideoStatsData] | None = None
        total_videos: int | None = None
        total_views: int | None = None
        total_likes: int | None = None
        total_comments: int | None = None

    @dataclass(slots=True)
    class VideoStatsData:
        video_id: str | None = None
        view_count: int | None = None
        like_count: int | None = None
        dislike_count: int | None = None
        comment_count: int | None = None
        favorite_count: int | None = None
        title: str | None = None
        description: str | None = None
        channel_id: str | None = None
        channel_title: str | None = None
        published_at: str | None = None
        thumbnail_url: str | None = None
        duration: str | None = None
        dimension: str | None = None
        definition: str | None = None
