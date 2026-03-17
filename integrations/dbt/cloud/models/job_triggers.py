from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class JobTriggers:
    github_webhook: bool | None = None
    git_provider_webhook: bool | None = None
    schedule: bool | None = None
    custom_branch_only: bool | None = None
