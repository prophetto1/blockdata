from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class Blob:
    uri: str | None = None
    bucket: str | None = None
    name: str | None = None
    generated_id: str | None = None
    self_link: str | None = None
    cache_control: str | None = None
    size: int | None = None
    etag: str | None = None
    md5: str | None = None
    crc32c: str | None = None
    custom_time: datetime | None = None
    media_link: str | None = None
    metadata: dict[String, String] | None = None
    meta_generation: int | None = None
    delete_time: datetime | None = None
    update_time: datetime | None = None
    create_time: datetime | None = None
    content_type: str | None = None
    content_encoding: str | None = None
    content_disposition: str | None = None
    content_language: str | None = None
    time_storage_class_updated: datetime | None = None
    component_count: int | None = None
    is_directory: bool | None = None
    kms_key_name: str | None = None
    event_based_hold: bool | None = None
    temporary_hold: bool | None = None
    retention_expiration_time: int | None = None

    def uri(self, blob: com) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, blob: com) -> Blob:
        raise NotImplementedError  # TODO: translate from Java
