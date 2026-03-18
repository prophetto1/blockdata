from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\SecretInput.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class SecretInput(Input):
    validator: str | None = None

    def validate(self, input: EncryptedString) -> None:
        raise NotImplementedError  # TODO: translate from Java
