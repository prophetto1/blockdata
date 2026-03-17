from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meta.instagram.abstract_instagram_task import AbstractInstagramTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class CreateImage(AbstractInstagramTask):
    """Publish an Instagram image post"""
    image_url: Property[str]
    caption: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_media_container(self, run_context: RunContext, ig_id: str, token: str, image_url: str, caption: str) -> str:
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
