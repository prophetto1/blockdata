from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\FlowProcessingException.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.kestra_exception import KestraException


@dataclass(slots=True, kw_only=True)
class FlowProcessingException(KestraException):
    serial_version_uid: ClassVar[int] = 1
