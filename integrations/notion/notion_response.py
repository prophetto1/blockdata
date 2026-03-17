from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class NotionResponse:
    id: str | None = None
    object: str | None = None
    created_time: datetime | None = None
    created_by: dict[String, Object] | None = None
    last_edited_time: datetime | None = None
    last_edited_by: dict[String, Object] | None = None
    archived: bool | None = None
    url: str | None = None
    public_url: str | None = None
    properties: dict[String, Object] | None = None
    parent: dict[String, Object] | None = None
    icon: dict[String, Object] | None = None
    cover: dict[String, Object] | None = None
    children: list[Map[String, Object]] | None = None
    content: dict[String, Object] | None = None
    has_more: bool | None = None
    next_cursor: str | None = None
    type: str | None = None
    additional_data: dict[String, Object] | None = None

    def get_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_object(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_created_time(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_created_by(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_last_edited_time(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_last_edited_by(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_archived(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_url(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_public_url(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_properties(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_parent(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_icon(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_cover(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_children(self) -> list[Map[String, Object]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_content(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_has_more(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_next_cursor(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_additional_data(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
