from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\Setting.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.has_uid import HasUID


@dataclass(slots=True, kw_only=True)
class Setting:
    key: str
    value: Any
    instance_uuid: ClassVar[str] = "instance.uuid"
    instance_version: ClassVar[str] = "instance.version"
    instance_edition: ClassVar[str] = "instance.edition"

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
