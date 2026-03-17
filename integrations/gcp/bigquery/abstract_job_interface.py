from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractJobInterface.java
# WARNING: Unresolved types: CreateDisposition, WriteDisposition

from datetime import timedelta
from typing import Any, Protocol

from integrations.airbyte.models.job_info import JobInfo
from engine.core.models.property.property import Property


class AbstractJobInterface(Protocol):
    def get_destination_table(self) -> Property[str]: ...

    def get_write_disposition(self) -> Property[JobInfo.WriteDisposition]: ...

    def get_create_disposition(self) -> Property[JobInfo.CreateDisposition]: ...

    def get_job_timeout(self) -> Property[timedelta]: ...

    def get_labels(self) -> Property[dict[str, str]]: ...

    def get_dry_run(self) -> Property[bool]: ...
