from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\secret\SecretNotFoundException.java

from dataclasses import dataclass
from typing import Any

from engine.core.secret.secret_exception import SecretException


@dataclass(slots=True, kw_only=True)
class SecretNotFoundException(SecretException):
    serial_version_u_i_d: int = 1
