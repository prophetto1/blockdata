from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.youtube.abstract_youtube_task import AbstractYoutubeTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class VideoStats(AbstractYoutubeTask, RunnableTask):
    """Get statistics for YouTube videos."""
    video_ids: Property[list[String]]
    include_snippet: Property[bool] | None = None
    max_results: Property[int] | None = None
    include_content_details: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def calculate_totals(self, videos: list[VideoStatsData]) -> dict[String, BigInteger]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        videos: list[VideoStatsData] | None = None
        total_videos: int | None = None
        total_views: BigInteger | None = None
        total_likes: BigInteger | None = None
        total_comments: BigInteger | None = None

    @dataclass(slots=True)
    class VideoStatsData:
        video_id: str | None = None
        view_count: BigInteger | None = None
        like_count: BigInteger | None = None
        dislike_count: BigInteger | None = None
        comment_count: BigInteger | None = None
        favorite_count: BigInteger | None = None
        title: str | None = None
        description: str | None = None
        channel_id: str | None = None
        channel_title: str | None = None
        published_at: str | None = None
        thumbnail_url: str | None = None
        duration: str | None = None
        dimension: str | None = None
        definition: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    videos: list[VideoStatsData] | None = None
    total_videos: int | None = None
    total_views: BigInteger | None = None
    total_likes: BigInteger | None = None
    total_comments: BigInteger | None = None


@dataclass(slots=True, kw_only=True)
class VideoStatsData:
    video_id: str | None = None
    view_count: BigInteger | None = None
    like_count: BigInteger | None = None
    dislike_count: BigInteger | None = None
    comment_count: BigInteger | None = None
    favorite_count: BigInteger | None = None
    title: str | None = None
    description: str | None = None
    channel_id: str | None = None
    channel_title: str | None = None
    published_at: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None
    dimension: str | None = None
    definition: str | None = None
