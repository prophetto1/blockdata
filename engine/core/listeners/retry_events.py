from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\listeners\RetryEvents.java
# WARNING: Unresolved types: RetryEvent

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class RetryEvents:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def on_retry(self, event: RetryEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java
