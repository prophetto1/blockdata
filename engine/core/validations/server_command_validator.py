from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\ServerCommandValidator.java
# WARNING: Unresolved types: Environment, RuntimeException

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ServerCommandValidator:
    validated_properties: ClassVar[dict[str, str]]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    environment: Environment | None = None

    def validate(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ServerCommandException(RuntimeException):
        serial_version_uid: ClassVar[int] = 1
