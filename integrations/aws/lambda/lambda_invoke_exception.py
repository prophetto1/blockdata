from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\lambda\LambdaInvokeException.java
# WARNING: Unresolved types: IOException, LambdaException, RuntimeException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LambdaInvokeException(RuntimeException):
    pass
