from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\Blob.java
# WARNING: Unresolved types: cloud, com, google, storage

from dataclasses import dataclass
from datetime import datetime
from typing import Any


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
    metadata: dict[str, str] | None = None
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

    @staticmethod
    def uri(blob: com.google.cloud.storage.Blob) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(blob: com.google.cloud.storage.Blob) -> Blob:
        raise NotImplementedError  # TODO: translate from Java
