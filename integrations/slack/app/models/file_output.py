from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class FileOutput(io):
    id: str | None = None
    created: datetime | None = None
    timestamp: datetime | None = None
    name: str | None = None
    title: str | None = None
    subject: str | None = None
    mimetype: str | None = None
    filetype: str | None = None
    pretty_type: str | None = None
    user: str | None = None
    user_team_id: str | None = None
    source_team_id: str | None = None
    mode: str | None = None
    is_editable: bool | None = None
    size: int | None = None
    url_private: str | None = None
    url_private_download: str | None = None
    permalink: str | None = None
    permalink_public: str | None = None
    is_public: bool | None = None
    is_external: bool | None = None
    external_type: str | None = None
    external_id: str | None = None
    external_url: str | None = None
    thumbnail: Thumbnail | None = None
    channels: list[String] | None = None
    groups: list[String] | None = None
    ims: list[String] | None = None

    def of(self, file: com) -> FileOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Thumbnail:
        thumb64: str | None = None
        thumb80: str | None = None
        thumb160: str | None = None
        thumb360: str | None = None
        thumb480: str | None = None

        def of(self, file: com) -> Thumbnail:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Thumbnail:
    thumb64: str | None = None
    thumb80: str | None = None
    thumb160: str | None = None
    thumb360: str | None = None
    thumb480: str | None = None

    def of(self, file: com) -> Thumbnail:
        raise NotImplementedError  # TODO: translate from Java
