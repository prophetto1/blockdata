from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Environment:
    id: int | None = None
    account_id: int | None = None
    deploy_key_id: int | None = None
    created_by_id: int | None = None
    repository_id: int | None = None
    name: str | None = None
    dbt_version: str | None = None
    use_custom_branch: bool | None = None
    custom_branch: str | None = None
    supports_docs: bool | None = None
    state: int | None = None
