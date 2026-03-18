from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\ThreadMainFactoryBuilder.java
# WARNING: Unresolved types: ThreadFactory

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ThreadMainFactoryBuilder:

    @staticmethod
    def build(name: str) -> ThreadFactory:
        raise NotImplementedError  # TODO: translate from Java
