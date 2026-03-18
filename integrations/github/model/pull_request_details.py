from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\model\PullRequestDetails.java
# WARNING: Unresolved types: Date, GHPullRequest, IOException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PullRequestDetails:
    number: int | None = None
    title: str | None = None
    state: str | None = None
    state_reason: str | None = None
    owner: str | None = None
    assignee: str | None = None
    assignees: list[Any] | None = None
    created_at: Date | None = None
    closed_at: Date | None = None
    closed_by: str | None = None
    comments: int | None = None
    labels: list[Any] | None = None
    repository_name: str | None = None
    repository_url: str | None = None
    base: str | None = None
    head: str | None = None
    url: str | None = None
