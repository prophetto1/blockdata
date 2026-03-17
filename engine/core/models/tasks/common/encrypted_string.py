from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\common\EncryptedString.java
# WARNING: Unresolved types: GeneralSecurityException

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class EncryptedString:
    type: ClassVar[str] = "io.kestra.datatype:aes_encrypted"
    type: str = TYPE
    value: str | None = None

    @staticmethod
    def from(encrypted: str) -> EncryptedString:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(plain_text: str, run_context: RunContext) -> EncryptedString:
        raise NotImplementedError  # TODO: translate from Java
