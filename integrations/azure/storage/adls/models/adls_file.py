from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\models\AdlsFile.java
# WARNING: Unresolved types: ArchiveStatus, DataLakeFileClient, LeaseDurationType, LeaseStateType, LeaseStatusType

from dataclasses import dataclass
from datetime import datetime
from typing import Any

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
    access_control_list: list[str] | None = None

    @staticmethod
    def of(data_lake_file_client: DataLakeFileClient) -> AdlsFile:
        raise NotImplementedError  # TODO: translate from Java
