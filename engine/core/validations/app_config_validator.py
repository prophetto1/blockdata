from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\AppConfigValidator.java
# WARNING: Unresolved types: Environment, RuntimeException

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class AppConfigValidator:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    kestra_url_key: ClassVar[str] = "kestra.url"
    environment: Environment | None = None

    def validate(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_kestra_url_valid(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AppConfigException(RuntimeException):
        serial_version_uid: ClassVar[int] = 1
