from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class LogRunnable(Runnable):
    input_stream: InputStream | None = None
    is_std_err: bool | None = None
    logger: Logger | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
