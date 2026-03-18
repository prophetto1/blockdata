from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fivetran\src\main\java\io\kestra\plugin\fivetran\models\Alert.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Alert:
    code: str = None
    message: str = None
