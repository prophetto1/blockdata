from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.azure.storage.blob.models.access_tier import AccessTier


@dataclass(slots=True, kw_only=True)
class AdlsFile:
    uri: str | None = None
    file_system: str | None = None
    name: str | None = None
    file_name: str | None = None
    size: int | None = None
    content_type: str | None = None
    content_encoding: str | None = None
    content_language: str | None = None
    content_md5: str | None = None
    creation_time: datetime | None = None
    last_modifed: datetime | None = None
    e_tag: str | None = None
    lease_state: LeaseStateType | None = None
    lease_duration: LeaseDurationType | None = None
    lease_status: LeaseStatusType | None = None
    is_directory: bool | None = None
    archive_status: ArchiveStatus | None = None
    archive_tier: AccessTier | None = None
    owner: str | None = None
    group: str | None = None
    permissions: str | None = None
    access_control_list: list[String] | None = None

    def of(self, data_lake_file_client: DataLakeFileClient) -> AdlsFile:
        raise NotImplementedError  # TODO: translate from Java
