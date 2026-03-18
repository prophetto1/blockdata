from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\models\AdlsAccessControl.java
# WARNING: Unresolved types: PathAccessControlEntry, PathPermissions

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AdlsAccessControl:
    access_control_list: list[PathAccessControlEntry] | None = None
    group: str | None = None
    owner: str | None = None
    permissions: PathPermissions | None = None
