from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\model\RepositoryDetails.java
# WARNING: Unresolved types: Date, GHRepository, IOException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class RepositoryDetails:
    name: str | None = None
    full_name: str | None = None
    html_url: str | None = None
    description: str | None = None
    owner: str | None = None
    forks_count: int | None = None
    stars_count: int | None = None
    pull_requests_count: int | None = None
    issues_count: int | None = None
    updated: Date | None = None
    created: Date | None = None
    language: str | None = None
