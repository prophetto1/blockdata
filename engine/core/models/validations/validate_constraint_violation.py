from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\validations\ValidateConstraintViolation.java

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ValidateConstraintViolation:
    index: int
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    filename: str | None = None
    namespace: str | None = None
    flow: str | None = None
    constraints: str | None = None
    outdated: bool | None = None
    deprecation_paths: list[str] | None = None
    warnings: list[str] | None = None
    infos: list[str] | None = None

    def get_identity(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
