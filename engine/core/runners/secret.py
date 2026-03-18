from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\Secret.java
# WARNING: Unresolved types: GeneralSecurityException

from dataclasses import dataclass
from typing import Any, Callable, Optional


@dataclass(slots=True, kw_only=True)
class Secret:
    secret_key: Optional[str] | None = None
    logger: Callable[Any] | None = None

    def decrypt(self, encrypted: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def encrypt(self, plaintext: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
