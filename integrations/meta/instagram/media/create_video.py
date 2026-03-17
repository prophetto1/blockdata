from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meta.instagram.abstract_instagram_task import AbstractInstagramTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.meta.instagram.enums.video_type import VideoType


@dataclass(slots=True, kw_only=True)
class CreateVideo(AbstractInstagramTask):
    """Publish an Instagram video post"""
    video_url: Property[str]
    caption: Property[str] | None = None
    video_type: Property[VideoType] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_media_container(self, run_context: RunContext, ig_id: str, token: str, video_url: str, video_type: VideoType, caption: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_container_ready(self, run_context: RunContext, token: str, container_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def check_container_status(self, run_context: RunContext, url: str, token: str, container_id: str) -> Callable[Boolean]:
        raise NotImplementedError  # TODO: translate from Java

    def publish_media(self, run_context: RunContext, ig_id: str, token: str, container_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        media_id: str | None = None
        container_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    media_id: str | None = None
    container_id: str | None = None
