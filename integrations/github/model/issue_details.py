from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class IssueDetails:
    number: int | None = None
    title: str | None = None
    state: str | None = None
    state_reason: str | None = None
    owner: str | None = None
    assignee: str | None = None
    assignees: Any | None = None
    created_at: Date | None = None
    closed_at: Date | None = None
    closed_by: str | None = None
    comments: int | None = None
    labels: Any | None = None
    repository_name: str | None = None
    repository_url: URL | None = None
    url: URL | None = None
