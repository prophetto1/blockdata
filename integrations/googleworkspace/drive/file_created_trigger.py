from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\FileCreatedTrigger.java
# WARNING: Unresolved types: DateTime, Exception, FileMetadata, User, api, client, com, core, google, io, kestra, models, tasks, util

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.googleworkspace.drive.abstract_drive_trigger import AbstractDriveTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class FileCreatedTrigger(AbstractDriveTrigger):
    """Poll Drive for newly created files"""
    scopes: Property[list[str]] = Property.ofValue(List.of("https://www.googleapis.com/auth/drive.metadata.readonly"))
    include_subfolders: Property[bool] = Property.ofValue(false)
    interval: timedelta = Duration.ofHours(1)
    max_files_per_poll: Property[int] = Property.ofValue(100)
    folder_id: Property[str] | None = None
    mime_types: Property[list[str]] | None = None
    owner_email: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def build_query(self, run_context: RunContext, last_created_time: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_date_time(self, date_time: com.google.api.client.util.DateTime) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: list[FileMetadata] | None = None

        @dataclass(slots=True)
        class FileMetadata:
            id: str | None = None
            name: str | None = None
            mime_type: str | None = None
            created_time: datetime | None = None
            modified_time: datetime | None = None
            owners: list[User] | None = None
            parents: list[str] | None = None
            size: int | None = None
            web_view_link: str | None = None
            icon_link: str | None = None
            thumbnail_link: str | None = None
            kestra_file_uri: str | None = None
