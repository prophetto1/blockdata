from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\UnixModeToPosixFilePermissions.java
# WARNING: Unresolved types: PosixFilePermission

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class UnixModeToPosixFilePermissions:

    @staticmethod
    def to_posix_permissions(mode: int) -> set[PosixFilePermission]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_posix_file_permissions(perms: set[PosixFilePermission]) -> int:
        raise NotImplementedError  # TODO: translate from Java
