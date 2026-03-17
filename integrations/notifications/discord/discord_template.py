from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.notifications.discord.discord_incoming_webhook import DiscordIncomingWebhook
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class DiscordTemplate(DiscordIncomingWebhook):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    username: Property[str] | None = None
    avatar_url: Property[str] | None = None
    embed_list: list[Embed] | None = None
    content: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Embed:
        title: Property[str] | None = None
        website_url: Property[str] | None = None
        description: Property[str] | None = None
        thumbnail: Property[str] | None = None
        author_name: Property[str] | None = None
        color: int | None = None
        footer: Property[str] | None = None

        def get_color(self) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def get_embed_map(self, run_context: RunContext, avatar_url: Property[str]) -> dict[String, Object]:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Embed:
    title: Property[str] | None = None
    website_url: Property[str] | None = None
    description: Property[str] | None = None
    thumbnail: Property[str] | None = None
    author_name: Property[str] | None = None
    color: int | None = None
    footer: Property[str] | None = None

    def get_color(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_embed_map(self, run_context: RunContext, avatar_url: Property[str]) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
