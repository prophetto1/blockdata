from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notion\src\main\java\io\kestra\plugin\notion\NotionResponse.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class NotionResponse:
    id: str | None = None
    object: str | None = None
    created_time: datetime | None = None
    created_by: dict[str, Any] | None = None
    last_edited_time: datetime | None = None
    last_edited_by: dict[str, Any] | None = None
    archived: bool | None = None
    url: str | None = None
    public_url: str | None = None
    properties: dict[str, Any] | None = None
    parent: dict[str, Any] | None = None
    icon: dict[str, Any] | None = None
    cover: dict[str, Any] | None = None
    children: list[dict[str, Any]] | None = None
    content: dict[str, Any] | None = None
    has_more: bool | None = None
    next_cursor: str | None = None
    type: str | None = None
    additional_data: dict[str, Any] | None = None

    def get_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_object(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_created_time(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_created_by(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_last_edited_time(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_last_edited_by(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_archived(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_url(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_public_url(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_properties(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_parent(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_icon(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_cover(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_children(self) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_content(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_has_more(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_next_cursor(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_additional_data(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
