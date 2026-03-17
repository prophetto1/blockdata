from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class RepositoryDetails:
    name: str | None = None
    full_name: str | None = None
    html_url: URL | None = None
    description: str | None = None
    owner: str | None = None
    forks_count: int | None = None
    stars_count: int | None = None
    pull_requests_count: int | None = None
    issues_count: int | None = None
    updated: Date | None = None
    created: Date | None = None
    language: str | None = None
