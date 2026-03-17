from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\JobTriggers.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JobTriggers:
    github_webhook: bool | None = None
    git_provider_webhook: bool | None = None
    schedule: bool | None = None
    custom_branch_only: bool | None = None
