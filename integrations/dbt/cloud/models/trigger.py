from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\Trigger.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class Trigger:
    id: int | None = None
    cause: str | None = None
    job_definition_id: int | None = None
    git_branch: str | None = None
    git_sha: str | None = None
    github_pull_request_id: int | None = None
    schema_override: str | None = None
    dbt_version_override: str | None = None
    threads_override: int | None = None
    target_name_override: str | None = None
    generate_docs_override: bool | None = None
    timeout_seconds_override: int | None = None
    steps_override: list[str] | None = None
    created_at: datetime | None = None
