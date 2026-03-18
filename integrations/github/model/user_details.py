from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\model\UserDetails.java
# WARNING: Unresolved types: Date, GHUser, IOException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class UserDetails:
    username: str | None = None
    url: str | None = None
    name: str | None = None
    followers: int | None = None
    following: int | None = None
    location: str | None = None
    company: str | None = None
    public_repositories: int | None = None
    private_repositories: int | None = None
    updated: Date | None = None
    created: Date | None = None
    type: str | None = None
