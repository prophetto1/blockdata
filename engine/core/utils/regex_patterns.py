from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\RegexPatterns.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class RegexPatterns:
    java_identifier_regex: ClassVar[str] = "^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$"
