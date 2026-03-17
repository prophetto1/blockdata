from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\FlowNotFoundException.java

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.not_found_exception import NotFoundException


@dataclass(slots=True, kw_only=True)
class FlowNotFoundException(NotFoundException):
    pass
