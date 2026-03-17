from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\AuthUtils.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AuthUtils:

    @staticmethod
    def encode_password(salt: str, password: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_salt() -> str:
        raise NotImplementedError  # TODO: translate from Java
