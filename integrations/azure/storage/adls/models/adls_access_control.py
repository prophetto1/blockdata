from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class AdlsAccessControl:
    access_control_list: list[PathAccessControlEntry] | None = None
    group: str | None = None
    owner: str | None = None
    permissions: PathPermissions | None = None
